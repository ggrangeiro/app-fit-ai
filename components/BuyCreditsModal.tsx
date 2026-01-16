import React, { useState, useEffect } from 'react';
import { X, CreditCard, Sparkles, MessageCircle, Star, History, Calendar, ArrowUpRight, ArrowDownLeft, Coins, Loader2 } from 'lucide-react';
import { Browser } from '@capacitor/browser';
import { apiService } from '../services/apiService';
import { CreditHistoryItem, User } from '../types';

interface BuyCreditsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User | null;
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

type Tab = 'BUY' | 'HISTORY';

export const CreditsModal: React.FC<BuyCreditsModalProps> = ({ isOpen, onClose, currentUser }) => {
    const [activeTab, setActiveTab] = useState<Tab>('BUY');
    const [selectedPlanId, setSelectedPlanId] = useState<number>(1);
    const [history, setHistory] = useState<CreditHistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);

    useEffect(() => {
        if (isOpen && activeTab === 'HISTORY' && currentUser) {
            loadHistory();
        }
    }, [isOpen, activeTab]);

    const loadHistory = async () => {
        if (!currentUser) return;
        setLoadingHistory(true);
        try {
            const data = await apiService.getCreditHistory(currentUser.id);
            setHistory(data);
        } catch (error) {
            console.error("Error loading history", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    if (!isOpen) return null;

    const selectedPlan = PLANS.find(p => p.id === selectedPlanId) || PLANS[1];



    const handleCheckout = async () => {
        if (!currentUser) return;
        setProcessingPayment(true);
        try {
            const initPointUrl = await apiService.checkoutCredits(currentUser.id, selectedPlan.credits);

            if (initPointUrl) {
                await Browser.open({ url: initPointUrl });
                onClose();
            }
        } catch (error: any) {
            console.error("Erro no checkout:", error);
            alert("Erro ao iniciar pagamento: " + (error.message || "Tente novamente."));
        } finally {
            setProcessingPayment(false);
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md relative shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header Section */}
                <div className="p-6 pb-2 relative z-10 bg-slate-900">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10 bg-slate-800 p-2 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl shadow-lg">
                            <Coins className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Seus Créditos</h2>
                            <p className="text-slate-400 text-sm">Gerencie seu saldo</p>
                        </div>
                    </div>

                    {/* Balance Card */}
                    {currentUser?.usage && (
                        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 mb-6">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Saldo Total</span>
                                <span className="text-3xl font-bold text-white">{currentUser.credits}</span>
                            </div>
                            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden flex">
                                <div
                                    className="h-full bg-blue-500"
                                    style={{ width: `${(currentUser.usage.subscriptionCredits / (currentUser.credits || 1)) * 100}%` }}
                                ></div>
                                <div
                                    className="h-full bg-emerald-500"
                                    style={{ width: `${(currentUser.usage.purchasedCredits / (currentUser.credits || 1)) * 100}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between mt-2 text-[10px] font-medium">
                                <span className="flex items-center gap-1 text-blue-400">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    Plano: {currentUser.usage.subscriptionCredits}
                                </span>
                                <span className="flex items-center gap-1 text-emerald-400">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    Comprados: {currentUser.usage.purchasedCredits}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex p-1 bg-slate-800 rounded-xl">
                        <button
                            onClick={() => setActiveTab('BUY')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'BUY' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-300'}`}
                        >
                            Recarregar
                        </button>
                        <button
                            onClick={() => setActiveTab('HISTORY')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'HISTORY' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-300'}`}
                        >
                            Histórico
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar">
                    {activeTab === 'BUY' ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                            <div className="space-y-3">
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
                                onClick={handleCheckout}
                                disabled={processingPayment}
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] mt-4"
                            >
                                {processingPayment ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processando...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="w-5 h-5" />
                                        Pagar R$ {selectedPlan.price},00
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-left-4 h-full">
                            {loadingHistory ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                    <p className="text-xs">Carregando histórico...</p>
                                </div>
                            ) : history.length > 0 ? (
                                <div className="space-y-3">
                                    {history.map((item) => (
                                        <div key={item.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${item.amount < 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                    {item.amount < 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-200">{item.description}</p>
                                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDate(item.date)}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`font-bold text-sm ${item.amount < 0 ? 'text-slate-400' : 'text-emerald-400'}`}>
                                                {item.amount > 0 ? '+' : ''}{item.amount}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-500 border-2 border-dashed border-slate-700/50 rounded-2xl">
                                    <History className="w-10 h-10 mb-2 opacity-50" />
                                    <p className="text-sm font-medium">Nenhum histórico encontrado</p>
                                    <p className="text-xs opacity-70">Suas transações aparecerão aqui</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreditsModal;
