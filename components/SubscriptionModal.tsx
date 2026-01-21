import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, ShieldCheck, Crown, Star, Loader2, ArrowRight } from 'lucide-react';
import { Browser } from '@capacitor/browser';
import { apiService } from '../services/apiService';
import { User, Plan } from '../types';

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User | null;
}

interface PlanDTO {
    id: string;
    name: string;
    price: number;
    credits: number;
    features: string[];
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, currentUser }) => {
    const [plans, setPlans] = useState<PlanDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlanId, setSelectedPlanId] = useState<string>('PRO');
    const [processingPayment, setProcessingPayment] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadPlans();
        }
    }, [isOpen]);

    const loadPlans = async () => {
        setLoading(true);
        try {
            const response = await apiService.getPlans();
            if (response && response.plans) {
                setPlans(response.plans);
            }
        } catch (error) {
            console.error("Erro ao carregar planos:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async () => {
        if (!currentUser) return;
        setProcessingPayment(true);
        try {
            // "STARTER" | "PRO" | "STUDIO"
            const initPointUrl = await apiService.checkoutSubscription(currentUser.id, selectedPlanId as any);

            if (initPointUrl) {
                await Browser.open({ url: initPointUrl });
                onClose();
            }
        } catch (error: any) {
            console.error("Erro no checkout:", error);
            alert("Erro ao iniciar assinatura: " + (error.message || "Tente novamente."));
        } finally {
            setProcessingPayment(false);
        }
    };

    if (!isOpen) return null;

    const selectedPlanData = plans.find(p => p.id === selectedPlanId);

    // Filter out FREE plan from display if desired, or keep it for comparison
    const displayPlans = plans.filter(p => p.id !== 'FREE');

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl relative shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 pb-4 relative z-10 bg-slate-900 border-b border-slate-800">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors z-10 bg-slate-800/50 p-2 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col items-center text-center">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg mb-4">
                            <Crown className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">Desbloqueie seu Potencial</h2>
                        <p className="text-slate-400 max-w-lg">
                            Escolha o plano ideal para seus objetivos e tenha acesso a análises profissionais, gerações ilimitadas e muito mais.
                        </p>
                    </div>
                </div>

                {/* Plans Grid */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                            <Loader2 className="w-10 h-10 animate-spin mb-3 text-purple-500" />
                            <p>Carregando planos...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                            {displayPlans.map((plan) => {
                                const isSelected = selectedPlanId === plan.id;
                                const isPopular = plan.id === 'PRO';

                                return (
                                    <div
                                        key={plan.id}
                                        onClick={() => setSelectedPlanId(plan.id)}
                                        className={`
                                            relative flex flex-col p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300
                                            ${isSelected
                                                ? 'bg-slate-800/80 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.2)] scale-[1.02]'
                                                : 'bg-slate-800/40 border-slate-700 hover:border-slate-600 hover:bg-slate-800/60'}
                                        `}
                                    >
                                        {isPopular && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg flex items-center gap-1">
                                                <Star className="w-3 h-3 fill-white" /> MAIS POPULAR
                                            </div>
                                        )}

                                        <div className="mb-4">
                                            <h3 className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                                {plan.name}
                                            </h3>
                                            <div className="flex items-baseline gap-1 mt-2">
                                                <span className="text-sm text-slate-400">R$</span>
                                                <span className={`text-3xl font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                                                    {plan.price.toFixed(2).replace('.', ',')}
                                                </span>
                                                <span className="text-sm text-slate-500">/mês</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3 mb-6 flex-1">
                                            {plan.features.map((feature, idx) => (
                                                <div key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                                                    <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isSelected ? 'text-purple-400' : 'text-slate-500'}`} />
                                                    <span>{feature}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className={`
                                            w-full py-3 rounded-xl font-bold text-center transition-all flex items-center justify-center gap-2
                                            ${isSelected
                                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                                                : 'bg-slate-700 text-slate-300'}
                                        `}>
                                            {isSelected ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border border-slate-400" />}
                                            {isSelected ? 'Selecionado' : 'Selecionar'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-slate-900 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Pagamento seguro via Mercado Pago. Cancele quando quiser.</span>
                    </div>

                    <button
                        onClick={!currentUser ? onClose : handleSubscribe}
                        disabled={processingPayment || (!selectedPlanId && !!currentUser)}
                        className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-purple-900/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                        {processingPayment ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processando...
                            </>
                        ) : !currentUser ? (
                            <>
                                Fazer Login
                                <ArrowRight className="w-5 h-5" />
                            </>
                        ) : (
                            <>
                                Assinar Agora
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};
