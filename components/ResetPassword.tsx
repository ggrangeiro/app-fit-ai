import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Dumbbell, Lock, CheckCircle, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';

interface ResetPasswordProps {
    token: string;
    onComplete: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ token, onComplete }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const validateForm = (): string | null => {
        if (!newPassword.trim() || !confirmPassword.trim()) {
            return 'Preencha todos os campos.';
        }
        if (newPassword.length < 6) {
            return 'A senha deve ter no mínimo 6 caracteres.';
        }
        if (newPassword !== confirmPassword) {
            return 'As senhas não coincidem.';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        try {
            await apiService.resetPassword(token, newPassword);
            setSuccess(true);

            // Redirect to login after 3 seconds
            setTimeout(() => {
                onComplete();
            }, 3000);
        } catch (err: any) {
            if (err.message?.includes('expirado') || err.message?.includes('inválido')) {
                setError('Token inválido ou expirado. Solicite um novo link de redefinição.');
            } else {
                setError(err.message || 'Erro ao redefinir senha. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-panel w-full max-w-md p-8 rounded-3xl animate-fade-in text-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-emerald-600/20 rounded-full animate-pulse">
                            <CheckCircle className="w-16 h-16 text-emerald-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Senha Alterada!</h2>
                        <p className="text-slate-400">
                            Sua senha foi redefinida com sucesso. Você será redirecionado para o login...
                        </p>
                        <div className="mt-4">
                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-panel w-full max-w-md p-8 rounded-3xl animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
                    <Dumbbell className="w-40 h-40 text-blue-500 rotate-45" />
                </div>

                <div className="relative z-10">
                    <div className="flex flex-col items-center mb-8 text-center">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-900/30 mb-4">
                            <Lock className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                            Redefinir Senha
                        </h1>
                        <p className="text-slate-400">
                            Digite sua nova senha abaixo
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-300 ml-1">Nova Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                <input
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                    minLength={6}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-300 ml-1">Confirmar Nova Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Digite novamente"
                                    minLength={6}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm text-center animate-in fade-in flex items-center justify-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-2 w-full font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white disabled:opacity-50"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Redefinindo...
                                </span>
                            ) : (
                                <>
                                    Redefinir Senha
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 flex flex-col items-center gap-4">
                        <div className="w-full h-px bg-slate-700/50"></div>
                        <button
                            onClick={onComplete}
                            className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
                        >
                            Voltar para o Login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
