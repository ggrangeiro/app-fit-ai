import React, { useState } from 'react';
import { X, Video, Link, Check, AlertCircle } from 'lucide-react';

interface VideoUrlModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (url: string, description: string) => void;
    initialUrl?: string;
    initialDescription?: string;
    exerciseName: string;
}

export const VideoUrlModal: React.FC<VideoUrlModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialUrl = '',
    initialDescription = '',
    exerciseName
}) => {
    const [url, setUrl] = useState(initialUrl);
    const [description, setDescription] = useState(initialDescription);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const validateUrl = (value: string) => {
        if (!value) return false;
        try {
            const u = new URL(value);
            return u.protocol === 'http:' || u.protocol === 'https:';
        } catch {
            return false;
        }
    };

    const handleSave = () => {
        if (!url) {
            setError('A URL do vídeo é obrigatória');
            return;
        }
        if (!validateUrl(url)) {
            setError('Insira uma URL válida (ex: https://youtube.com/...)');
            return;
        }

        onSave(url, description);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md relative shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <X className="w-6 h-6" />
                </button>

                <div className="flex flex-col items-center mb-6">
                    <div className="p-3 bg-blue-600/20 text-blue-400 rounded-full mb-3">
                        <Video className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-white text-center">Vídeo Personalizado</h3>
                    <p className="text-slate-400 text-sm text-center mt-1">
                        Para: <span className="text-white font-medium">{exerciseName}</span>
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-slate-300 text-sm font-medium mb-1">Link do Vídeo (YouTube/Vimeo)</label>
                        <div className="relative">
                            <Link className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => {
                                    setUrl(e.target.value);
                                    setError('');
                                }}
                                placeholder="https://youtu.be/..."
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        {error && (
                            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {error}
                            </p>
                        )}
                        <p className="text-slate-500 text-xs mt-1">
                            Cole o link direto do vídeo. Ele substituirá a busca padrão para seus alunos.
                        </p>
                    </div>

                    <div>
                        <label className="block text-slate-300 text-sm font-medium mb-1">Observações (Opcional)</label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ex: Lembre-se de manter a coluna reta..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        />
                    </div>

                    <button
                        onClick={handleSave}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
                    >
                        <Check className="w-5 h-5" />
                        Salvar Vídeo
                    </button>
                </div>
            </div>
        </div>
    );
};
