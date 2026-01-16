import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, Loader2, ArrowRight } from 'lucide-react';
import { apiService } from '../services/apiService';
import { User } from '../types';

interface PaymentCallbackProps {
    status: 'success' | 'failure' | 'pending';
    currentUser: User | null;
    refreshUser: () => Promise<void>;
    onContinue: () => void;
}

export const PaymentCallback: React.FC<PaymentCallbackProps> = ({ status, currentUser, refreshUser, onContinue }) => {
    const [polling, setPolling] = useState(true);

    // Se for sucesso, queremos garantir que o backend processou
    useEffect(() => {
        if (status === 'success' && currentUser) {
            const interval = setInterval(async () => {
                try {
                    console.log("Polling user status...");
                    const updatedUser = await apiService.getMe(currentUser.id);

                    // Verifica se o plano mudou para algo diferente de FREE/INACTIVE
                    if (updatedUser.plan?.status === 'ACTIVE' && updatedUser.plan?.type !== 'FREE') {
                        await refreshUser();
                        setPolling(false);
                        clearInterval(interval);
                    }
                } catch (e) {
                    console.error("Error polling user", e);
                }
            }, 2000);

            // Timeout de 10 segundos para parar de pollar e assumir que talvez o webhook demore
            const timeout = setTimeout(() => {
                clearInterval(interval);
                setPolling(false);
                refreshUser(); // Tenta uma ultima vez
            }, 10000);

            return () => {
                clearInterval(interval);
                clearTimeout(timeout);
            };
        } else {
            setPolling(false);
        }
    }, [status, currentUser, refreshUser]);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">

                {status === 'success' && (
                    <div className="animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            {polling ? (
                                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                            ) : (
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            )}
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">
                            {polling ? 'Confirmando Pagamento...' : 'Pagamento Confirmado!'}
                        </h1>
                        <p className="text-slate-400 mb-8">
                            {polling
                                ? 'Aguarde enquanto validamos sua assinatura com o Mercado Pago.'
                                : 'Sua assinatura foi ativada com sucesso. Aproveite todos os benefícios!'}
                        </p>
                    </div>
                )}

                {status === 'failure' && (
                    <div className="animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle className="w-10 h-10 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Pagamento Falhou</h1>
                        <p className="text-slate-400 mb-8">
                            Houve um problema ao processar seu pagamento. Nenhuma cobrança foi realizada.
                        </p>
                    </div>
                )}

                {status === 'pending' && (
                    <div className="animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Clock className="w-10 h-10 text-amber-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Pagamento Pendente</h1>
                        <p className="text-slate-400 mb-8">
                            Seu pagamento está sendo processado. Assim que confirmado, sua assinatura será ativada automaticamente.
                        </p>
                    </div>
                )}

                <button
                    onClick={onContinue}
                    disabled={polling}
                    className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                    {polling ? 'Aguarde...' : 'Voltar ao App'}
                    {!polling && <ArrowRight className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
};
