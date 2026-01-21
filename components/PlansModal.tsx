import React, { useState } from 'react';
import { X, Zap, Crown, Shield, Check, Info, ArrowRight, Star, MessageCircle } from 'lucide-react';

interface PlanData {
    id: string;
    name: string;
    price: string;
    credits: number;
    generations: string;
    themeColor: string;
    icon: React.ReactNode;
    recommended?: boolean;
    benefits: string[];
}

interface PlansModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubscribe: (planId: string, planName: string, price: string) => void;
}

const PLANS: PlanData[] = [
    {
        id: 'STARTER',
        name: 'Starter',
        price: '59,90',
        credits: 30,
        generations: '10',
        themeColor: 'emerald',
        icon: <Zap className="w-6 h-6 text-emerald-600" />,
        benefits: [
            '30 Créditos de Análise/mês',
            '10 Gerações de Treino/Dieta',
            'Suporte via Chat',
            'Histórico de Evolução'
        ]
    },
    {
        id: 'PRO',
        name: 'Pro',
        price: '99,90',
        credits: 80,
        generations: 'Ilimitadas',
        themeColor: 'blue',
        icon: <Crown className="w-6 h-6 text-blue-600" />,
        recommended: true,
        benefits: [
            '80 Créditos de Análise/mês',
            'Gerações Ilimitadas (IA)',
            'Suporte Prioritário',
            'Histórico de Evolução Completo'
        ]
    },
    {
        id: 'STUDIO',
        name: 'Studio',
        price: '199,90',
        credits: 200,
        generations: 'Ilimitadas',
        themeColor: 'purple',
        icon: <Shield className="w-6 h-6 text-purple-600" />,
        benefits: [
            '200 Créditos de Análise/mês',
            'Gerações Ilimitadas (IA)',
            'Suporte Exclusivo',
            'Gestão de Equipe (Breve)'
        ]
    }
];

const PlansModal: React.FC<PlansModalProps> = ({ isOpen, onClose, onSubscribe }) => {
    const [selectedPlanIdx, setSelectedPlanIdx] = useState(1); // Default is PRO

    if (!isOpen) return null;

    const currentPlan = PLANS[selectedPlanIdx];

    const getThemeClasses = (color: string, isSelected: boolean) => {
        const config: Record<string, { bg: string, text: string, border: string, ring: string, badge: string }> = {
            emerald: {
                bg: 'bg-emerald-50',
                text: 'text-emerald-700',
                border: 'border-emerald-500',
                ring: 'ring-emerald-500/20',
                badge: 'bg-emerald-500 text-white'
            },
            blue: {
                bg: 'bg-blue-50',
                text: 'text-blue-700',
                border: 'border-blue-500',
                ring: 'ring-blue-500/20',
                badge: 'bg-blue-500 text-white'
            },
            purple: {
                bg: 'bg-purple-50',
                text: 'text-purple-700',
                border: 'border-purple-500',
                ring: 'ring-purple-500/20',
                badge: 'bg-purple-500 text-white'
            }
        };

        const theme = config[color] || config.blue;
        return isSelected
            ? `border-2 ${theme.border} ${theme.bg} shadow-lg shadow-${color}-500/10 scale-[1.02]`
            : 'border border-slate-200 bg-white hover:border-slate-300';
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity px-0 sm:px-4">
            {/* Container do Modal / Bottom Sheet */}
            <div
                className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up sm:animate-fade-in"
                style={{ maxHeight: '95vh' }}
            >
                {/* Header */}
                <div className="relative p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            Escolha seu Planos <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                        </h2>
                        <p className="text-sm text-slate-500">Evolua sua performance com IA</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Plan Cards Grid */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 160px)' }}>
                    <div className="grid grid-cols-3 gap-3 mb-8">
                        {PLANS.map((plan, idx) => {
                            const isSelected = selectedPlanIdx === idx;
                            const theme = getThemeClasses(plan.themeColor, isSelected);

                            return (
                                <button
                                    key={plan.id}
                                    onClick={() => setSelectedPlanIdx(idx)}
                                    className={`relative flex flex-col items-center p-4 rounded-2xl transition-all duration-300 ${theme}`}
                                >
                                    {plan.recommended && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap uppercase tracking-wider">
                                            Recomendado
                                        </div>
                                    )}
                                    <div className={`p-2 rounded-xl mb-2 ${isSelected ? 'bg-white shadow-sm' : 'bg-slate-50'}`}>
                                        {plan.icon}
                                    </div>
                                    <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                                        {plan.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Selected Plan Details */}
                    <div className="bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-2xl font-black text-slate-900">
                                R$ {currentPlan.price}<span className="text-sm font-normal text-slate-500">/mês</span>
                            </h3>
                            <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                                    <Zap className="w-3 h-3 text-amber-500" />
                                    <strong>{currentPlan.credits}</strong> créditos
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {currentPlan.benefits.map((benefit, i) => {
                                const isGenerations = benefit.includes('Gerações');
                                const isUnlimited = benefit.includes('Ilimitadas');

                                return (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="mt-0.5 bg-emerald-100 p-0.5 rounded-full">
                                            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3px]" />
                                        </div>
                                        <p className={`text-sm ${isGenerations ? 'font-semibold' : 'text-slate-600'}`}>
                                            {benefit.split(currentPlan.generations).map((part, index, array) => (
                                                <React.Fragment key={index}>
                                                    {part}
                                                    {index < array.length - 1 && (
                                                        <span className={isUnlimited ? 'text-amber-600 bg-amber-100 px-1 rounded' : ''}>
                                                            {currentPlan.generations}
                                                        </span>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={() => onSubscribe(currentPlan.id, currentPlan.name, currentPlan.price)}
                        className="w-full py-4 px-6 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-slate-200"
                    >
                        Assinar {currentPlan.name} agora
                        <ArrowRight className="w-5 h-5" />
                    </button>

                    <p className="mt-4 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
                        <Info className="w-3 h-3" /> Pagamento seguro via Mercado Pago
                    </p>

                    {/* Demo Request Button */}
                    <a
                        href="https://wa.me/5511974927080?text=Olá! Gostaria de solicitar uma demonstração do FitAI para Personais."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-emerald-500/30 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-medium transition-all text-sm"
                    >
                        <MessageCircle className="w-4 h-4" />
                        <span>Solicitar Demo via WhatsApp</span>
                    </a>
                </div>
            </div>
        </div>
    );
};

export default PlansModal;
