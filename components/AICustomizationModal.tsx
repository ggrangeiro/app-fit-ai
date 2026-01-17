import React, { useState } from 'react';
import { User } from '../types';
import { Sparkles, Save, X } from 'lucide-react';
import { apiService } from '../services/apiService';
import Toast from './Toast';

interface AICustomizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
    onUpdateUser: (updatedUser: User) => void;
}

export const AICustomizationModal: React.FC<AICustomizationModalProps> = ({ isOpen, onClose, currentUser, onUpdateUser }) => {
    const [methodology, setMethodology] = useState(currentUser.methodology || '');
    const [communicationStyle, setCommunicationStyle] = useState(currentUser.communicationStyle || '');
    const [isSaving, setIsSaving] = useState(false);

    // Sync state if currentUser changes (e.g. after a re-fetch)
    React.useEffect(() => {
        if (currentUser) {
            setMethodology(currentUser.methodology || '');
            setCommunicationStyle(currentUser.communicationStyle || '');
        }
    }, [currentUser]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Optimistic update locally
            const updatedUser = { ...currentUser, methodology, communicationStyle };

            // Send to API
            await apiService.updateUser(currentUser.id, {
                methodology,
                communicationStyle
            });

            onUpdateUser(updatedUser);
            Toast.show('IA personalizada com sucesso!', 'success');
            onClose();
        } catch (error) {
            console.error(error);
            Toast.show('Erro ao salvar personalização.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-slate-800 rounded-2xl w-full max-w-2xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-gradient-to-r from-slate-800 to-slate-900 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                            <Sparkles className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Personalize sua IA</h2>
                            <p className="text-sm text-slate-400">Ensine a IA a pensar e falar como você</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700/50 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">

                    {/* Info Box */}
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
                        <p className="text-sm text-indigo-200">
                            <strong>Como funciona:</strong> As informações abaixo serão lidas pela IA antes de gerar qualquer treino ou dieta.
                            Isso garante que o conteúdo gerado tenha a sua "assinatura" técnica e comportamental.
                        </p>
                    </div>

                    {/* Field 1: Methodology */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                            Minha Metodologia de Trabalho
                            <span className="text-xs text-slate-500 font-normal">(Técnicas, divisões, regras)</span>
                        </label>
                        <textarea
                            value={methodology}
                            onChange={(e) => setMethodology(e.target.value)}
                            placeholder="Ex: Gosto de treinos curtos e intensos. Uso muito bi-set. Prefiro divisão ABCDE. Meus treinos de perna sempre começam com Agachamento..."
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[120px] resize-y"
                        />
                    </div>

                    {/* Field 2: Communication Style */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                            Meu Tom de Voz
                            <span className="text-xs text-slate-500 font-normal">(Personalidade, motivação)</span>
                        </label>
                        <textarea
                            value={communicationStyle}
                            onChange={(e) => setCommunicationStyle(e.target.value)}
                            placeholder="Ex: Sou muito motivador, uso muitos emojis 🔥💪. Chamo os alunos de 'Campeão'. Sou direto e técnico, sem rodeios..."
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[100px] resize-y"
                        />
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-700 bg-slate-800/50 rounded-b-2xl flex justify-end gap-3 glass-footer">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Salvar Preferências
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
