import React, { useState } from 'react';
import { X, CreditCard, Sparkles, MessageCircle, Star } from 'lucide-react';

interface BuyCreditsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBuy?: () => void;
}

interface Plan {
    id: number;
    label: string;
    credits: number;
    price: number;
    highlight: boolean;
}

const PLANS: Plan[] = [
    { id: 0, label: 'Básico', credits: 10, price: 30, highlight: false },
    { id: 1, label: 'Popular', credits: 20, price: 40, highlight: true },
    { id: 2, label: 'Pro', credits: 30, price: 50, highlight: false }
];

const BuyCreditsModal: React.FC<BuyCreditsModalProps> = ({ isOpen, onClose }) => {
    const [selectedPlanId, setSelectedPlanId] = useState<number>(1); // Default to Popular

    if (!isOpen) return null;

    const selectedPlan = PLANS.find(p => p.id === selectedPlanId) || PLANS[1];

    const handleWhatsAppContact = () => {
        const message = `Olá! Gostaria de comprar o pacote de ${selectedPlan.credits} créditos por R$ ${selectedPlan.price},00 no App FitAI.`;
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/5511974927080?text=${encodedMessage}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 w-full max-w-md relative shadow-2xl overflow-hidden">

                {/* Background Gradients */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="text-center mb-6 relative z-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/30">
                        <CreditCard className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Recarregar Créditos</h2>
                    <p className="text-slate-400 text-sm">
                        Escolha o pacote ideal para continuar sua evolução.
                    </p>
                </div>

                <div className="space-y-3 mb-6 relative z-10">
                    {PLANS.map(plan => (
                        <div
                            key={plan.id}
                            onClick={() => setSelectedPlanId(plan.id)}
                            className={`
                        relative p-4 rounded-xl flex items-center justify-between cursor-pointer transition-all border
                        ${selectedPlanId === plan.id
                                    ? 'bg-slate-800 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-[1.02]'
                                    : 'bg-slate-800/60 border-slate-700 hover:border-slate-600 opacity-80 hover:opacity-100'}
                    `}
                        >
                            {plan.highlight && (
                                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[10px] font-bold px-3 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
                                    <Star className="w-3 h-3 fill-black" /> POPULAR
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${selectedPlanId === plan.id ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <p className={`font-bold ${selectedPlanId === plan.id ? 'text-white' : 'text-slate-300'}`}>{plan.label}</p>
                                    <p className="text-xs text-slate-400">{plan.credits} Créditos</p>
                                </div>
                            </div>
                            <span className={`font-bold ${selectedPlanId === plan.id ? 'text-white text-lg' : 'text-slate-400'}`}>
                                R$ {plan.price},00
                            </span>
                        </div>
                    ))}
                </div>

                <button
                    onClick={handleWhatsAppContact}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 relative z-10 active:scale-[0.98]"
                >
                    <MessageCircle className="w-5 h-5" />
                    Comprar por R$ {selectedPlan.price},00
                </button>

                <p className="text-center text-[10px] text-slate-500 mt-4">
                    Pagamentos via PIX ou Cartão. Ativação imediata via WhatsApp.
                </p>
            </div>
        </div>
    );
};

export default BuyCreditsModal;
