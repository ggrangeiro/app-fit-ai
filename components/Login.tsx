import React, { useState } from 'react';
import { User } from '../types';
import { apiService } from '../services/apiService';
import { secureStorage } from '../utils/secureStorage';
import { Dumbbell, ArrowRight, Lock, Mail, User as UserIcon, Phone, X, CheckCircle, Loader2, Medal, Crown, MessageCircle, Eye, EyeOff } from 'lucide-react';
import { ToastType } from './Toast';

interface LoginProps {
  onLogin: (user: User) => void;
  showToast: (message: string, type: ToastType) => void;
  onViewPlans?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, showToast, onViewPlans }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState<'user' | 'personal'>('user');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Máscara de telefone brasileiro (10 ou 11 dígitos)
  const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, ''); // Remove tudo que não é número
    if (digits.length <= 10) {
      return digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
    } else {
      return digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegistering) {
        // --- CADASTRO (V2) ---
        if (!name.trim()) throw new Error("Por favor, digite seu nome.");
        if (!phone.trim()) throw new Error("Por favor, digite seu telefone.");
        if (!password.trim()) throw new Error("Por favor, digite uma senha.");
        if (password !== confirmPassword) throw new Error("As senhas não conferem.");

        // Usa o novo serviço de cadastro V2
        // Nota: Cadastro público cria como 'user' por padrão.
        // Passa o role selecionado
        await apiService.signup(name, email, password, phone, undefined, role);

        showToast("Cadastro realizado com sucesso! Faça login.", 'success');

        setIsRegistering(false);
        setPassword('');

      } else {
        // --- LOGIN (V2) ---
        if (!email.trim() || !password.trim()) {
          throw new Error("Preencha e-mail e senha.");
        }

        // Usa o novo serviço de login V2 que lida com Token JWT e Roles
        const appUser = await apiService.login(email, password);

        // Armazena sessão via secureStorage
        secureStorage.setItem('fitai_current_session', appUser);

        onLogin(appUser);
      }
    } catch (err: any) {
      const mensagemErro = err.message || 'Ocorreu um erro. Tente novamente.';
      setError(mensagemErro);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError(null);
    setEmail('');
    setName('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setRole('user');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    if (!forgotEmail.trim()) {
      setForgotError('Digite seu e-mail.');
      return;
    }

    setForgotLoading(true);
    try {
      await apiService.forgotPassword(forgotEmail);
      setForgotSuccess(true);
    } catch (err: any) {
      setForgotError(err.message || 'Erro ao enviar e-mail. Tente novamente.');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotEmail('');
    setForgotError(null);
    setForgotSuccess(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Button moved outside glass-panel for guaranteed z-index interaction */}
      {onViewPlans && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Ver Planos Clicked (Root)');
            if (onViewPlans) onViewPlans();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Ver Planos Touched (Root)');
            if (onViewPlans) onViewPlans();
          }}
          className="fixed top-12 right-6 z-[9999] text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 border border-blue-500/30 px-4 py-2 rounded-full hover:bg-blue-500/10 cursor-pointer bg-slate-900/80 backdrop-blur-md shadow-lg active:scale-95 touch-manipulation"
        >
          <Crown className="w-4 h-4" /> <span className="font-bold">Ver Planos</span>
        </button>
      )}

      <div className="glass-panel w-full max-w-md p-8 rounded-3xl animate-fade-in relative overflow-hidden transition-all duration-500">

        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
          <Dumbbell className="w-40 h-40 text-blue-500 rotate-45" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-col items-center mb-8 text-center relative">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-900/30 mb-4">
              <Dumbbell className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {isRegistering ? 'Criar Conta' : 'Bem-vindo ao FitAI'}
            </h1>
            <p className="text-slate-400">
              {isRegistering ? 'Comece sua jornada hoje' : 'Sua plataforma de análise biomecânica'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {isRegistering && (
              <>
                <div className="flex gap-3 mb-2 animate-in slide-in-from-top-4 duration-300">
                  {/* Student Card */}
                  <div
                    onClick={() => setRole('user')}
                    className={`flex-1 p-3 rounded-xl border-2 cursor-pointer transition-all ${role === 'user'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'
                      }`}
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className={`p-2 rounded-full ${role === 'user' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className={`font-bold block text-sm ${role === 'user' ? 'text-white' : 'text-slate-400'}`}>Sou Aluno</span>
                        <span className="text-xs text-slate-500 leading-tight block mt-1 opacity-80">Treinos com IA, Análise e Evolução</span>
                      </div>
                    </div>
                  </div>

                  {/* Personal Card */}
                  <div
                    onClick={() => setRole('personal')}
                    className={`flex-1 p-3 rounded-xl border-2 cursor-pointer transition-all ${role === 'personal'
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'
                      }`}
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className={`p-2 rounded-full ${role === 'personal' ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                        <Medal className="w-5 h-5" />
                      </div>
                      <div>
                        <span className={`font-bold block text-sm ${role === 'personal' ? 'text-white' : 'text-slate-400'}`}>Sou Personal</span>
                        <span className="text-xs text-slate-500 leading-tight block mt-1 opacity-80">Gestão de Alunos e Produtividade</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-1 animate-in slide-in-from-top-4 duration-300">
                  <label className="text-sm font-medium text-slate-300 ml-1">Seu Nome</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      required={isRegistering}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ex: João Silva"
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1 animate-in slide-in-from-top-4 duration-300" style={{ animationDelay: '50ms' }}>
                  <label className="text-sm font-medium text-slate-300 ml-1">Telefone</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                    <input
                      type="tel"
                      required={isRegistering}
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="(11) 98888-7777"
                      maxLength={15}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300 ml-1">E-mail de Acesso</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: aluno@email.com"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300 ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isRegistering && (
              <div className="space-y-1 animate-in slide-in-from-top-4 duration-300">
                <label className="text-sm font-medium text-slate-300 ml-1">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full bg-slate-800/50 border rounded-xl py-3 pl-12 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${isRegistering && confirmPassword && password !== confirmPassword
                      ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500'
                      : 'border-slate-700 focus:ring-blue-500/50 focus:border-blue-500'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-3.5 text-slate-500 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {isRegistering && confirmPassword && password !== confirmPassword && (
                  <p className="text-red-400 text-xs ml-1 animate-in slide-in-from-top-1">
                    As senhas não coincidem
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm text-center animate-in fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (isRegistering && (!name.trim() || !phone.trim() || !email.trim() || !password || !confirmPassword || password !== confirmPassword))}
              className={`
                      mt-2 w-full font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] flex items-center justify-center gap-2
                      ${(isRegistering && (!name.trim() || !phone.trim() || !email.trim() || !password || !confirmPassword || password !== confirmPassword)) ? 'opacity-50 cursor-not-allowed' : ''}
                      ${isRegistering
                  ? (role === 'user'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white')
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'}
                    `}
            >
              {loading ? (
                <span className="flex items-center gap-2">Conectando...</span>
              ) : (
                <>
                  {isRegistering
                    ? (role === 'user' ? 'Cadastrar como Aluno' : 'Cadastrar como Personal')
                    : 'Entrar'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Forgot Password Link - Only show on login mode */}
            {!isRegistering && (
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-slate-400 hover:text-blue-400 text-sm font-medium transition-colors text-center"
              >
                Esqueci minha senha
              </button>
            )}
          </form>

          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="w-full h-px bg-slate-700/50"></div>

            <button
              onClick={toggleMode}
              className="text-slate-400 hover:text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              {isRegistering ? 'Já tenho uma conta? Fazer Login' : 'Não tem conta? Criar nova conta'}
            </button>

            <div className="flex gap-4 mt-4">
              <a
                href="https://fitanalizer.com.br/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-500 hover:text-blue-400 transition-colors border-b border-transparent hover:border-blue-400"
              >
                Termos de Uso
              </a>
              <a
                href="https://fitanalizer.com.br/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-500 hover:text-blue-400 transition-colors border-b border-transparent hover:border-blue-400"
              >
                Política de Privacidade
              </a>
            </div>

            {/* WhatsApp Contact Button */}
            <a
              href="https://wa.me/5511974927080?text=Olá! Gostaria de saber mais sobre o FitAI."
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 transition-all text-sm font-medium"
            >
              <MessageCircle className="w-4 h-4" />
              Fale conosco no WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 w-full max-w-md relative shadow-2xl">
            <button
              onClick={closeForgotModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {forgotSuccess ? (
              // Success State
              <div className="text-center py-4 animate-in fade-in">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-emerald-600/20 rounded-full animate-pulse">
                    <CheckCircle className="w-12 h-12 text-emerald-400" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">E-mail Enviado!</h3>
                <p className="text-slate-400 text-sm mb-6">
                  Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                </p>
                <button
                  onClick={closeForgotModal}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors"
                >
                  Fechar
                </button>
              </div>
            ) : (
              // Form State
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="text-center mb-4">
                  <div className="flex justify-center mb-3">
                    <div className="p-3 bg-blue-600/20 rounded-2xl">
                      <Mail className="w-8 h-8 text-blue-400" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">Esqueci minha senha</h3>
                  <p className="text-slate-400 text-sm">
                    Digite seu e-mail para receber um link de redefinição
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-300 ml-1">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {forgotError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm text-center animate-in fade-in">
                    {forgotError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar Link
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
