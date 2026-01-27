import React, { useState } from 'react';
import { X, Check, Dumbbell, AlertCircle, Link, FileText } from 'lucide-react';

interface CreateExerciseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, url: string, description: string) => Promise<void>;
}

export const CreateExerciseModal: React.FC<CreateExerciseModalProps> = ({
    isOpen,
    onClose,
    onSave
}) => {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!name.trim()) {
            setError('O nome do exercício é obrigatório');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await onSave(name, url, description);
            // Close handled by parent on success, or we can close here
            onClose();
        } catch (err: any) {
            setError(err.message || 'Erro ao criar exercício');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md relative shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white"
                    disabled={loading}
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="flex flex-col items-center mb-6">
                    <div className="p-3 bg-green-600/20 text-green-400 rounded-full mb-3">
                        <Dumbbell className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-white text-center">Novo Exercício</h3>
                    <p className="text-slate-400 text-sm text-center mt-1">
                        Crie um exercício personalizado para sua biblioteca.
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-slate-300 text-sm font-medium mb-1">Nome do Exercício *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                setError('');
                            }}
                            placeholder="Ex: Agachamento Sumô"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-green-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-slate-300 text-sm font-medium mb-1">Link do Vídeo (Opcional)</label>
                        <div className="relative">
                            <Link className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://youtube.com/..."
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-green-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-300 text-sm font-medium mb-1">Descrição / Dicas (Opcional)</label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ex: Pés afastados além da largura dos ombros..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-green-500 outline-none resize-none"
                        />
                    </div>

                    {error && (
                        <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {error}
                        </p>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Salvando...' : (
                            <>
                                <Check className="w-5 h-5" />
                                Criar Exercício
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
