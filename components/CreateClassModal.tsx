import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, Users, Image as ImageIcon, Repeat, Check } from 'lucide-react';
import { apiService } from '../services/apiService';
import Toast from './Toast'; // Assuming Toast is available or similar
import LoadingScreen from './LoadingScreen'; // Assuming LoadingScreen is available

interface CreateClassModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: any;
}

export const CreateClassModal: React.FC<CreateClassModalProps> = ({ isOpen, onClose, onSuccess, currentUser }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        startTime: '', // YYYY-MM-DDTHH:mm
        durationMinutes: 60,
        capacity: 20,
        location: '',
        photoUrl: '', // Optional
        isRecurrent: false,
        recurrenceDays: [] as string[], // e.g., ['MONDAY', 'WEDNESDAY']
        // End Date for recurrence? Backend logic says "Generate 12 weeks".
    });

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({
        message: '', type: 'info', isVisible: false
    });

    if (!isOpen) return null;

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type, isVisible: true });
        setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleDay = (day: string) => {
        setFormData(prev => {
            const days = prev.recurrenceDays.includes(day)
                ? prev.recurrenceDays.filter(d => d !== day)
                : [...prev.recurrenceDays, day];
            return { ...prev, recurrenceDays: days };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                recurrenceDays: formData.isRecurrent ? formData.recurrenceDays.join(',') : null,
                // Ensure startTime is ISO
                startTime: new Date(formData.startTime).toISOString()
            };

            await apiService.createClass(payload);
            showToast('Aula criada com sucesso!', 'success');
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (error: any) {
            showToast(error.message || 'Erro ao criar aula.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const DAYS = [
        { label: 'Seg', value: 'MONDAY' },
        { label: 'Ter', value: 'TUESDAY' },
        { label: 'Qua', value: 'WEDNESDAY' },
        { label: 'Qui', value: 'THURSDAY' },
        { label: 'Sex', value: 'FRIDAY' },
        { label: 'Sáb', value: 'SATURDAY' },
        { label: 'Dom', value: 'SUNDAY' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            {toast.isVisible && (
                <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg text-white font-medium animate-in fade-in slide-in-from-top-4 ${toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                    }`}>
                    {toast.message}
                </div>
            )}

            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-emerald-400" />
                        Nova Aula
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                    <form id="createClassForm" onSubmit={handleSubmit} className="space-y-4">

                        {/* Nome */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Nome da Aula</label>
                            <input
                                type="text"
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Ex: Funcional na Praia"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-slate-600"
                            />
                        </div>

                        {/* Descrição */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Descrição</label>
                            <textarea
                                name="description"
                                rows={2}
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Detalhes sobre a aula..."
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-slate-600 resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Data e Hora */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Início</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="datetime-local"
                                        name="startTime"
                                        required
                                        value={formData.startTime}
                                        onChange={handleChange}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm"
                                    />
                                </div>
                            </div>

                            {/* Duração */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Duração (min)</label>
                                <input
                                    type="number"
                                    name="durationMinutes"
                                    required
                                    min="15"
                                    step="15"
                                    value={formData.durationMinutes}
                                    onChange={handleChange}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                />
                            </div>
                        </div>

                        {/* Capacidade e Local */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Vagas</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="number"
                                        name="capacity"
                                        required
                                        min="1"
                                        value={formData.capacity}
                                        onChange={handleChange}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Local</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        name="location"
                                        value={formData.location}
                                        onChange={handleChange}
                                        placeholder="Ex: Sala 2"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Recorrência */}
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Repeat className="w-5 h-5 text-emerald-400" />
                                    <span className="text-white font-medium">Repetir Semanalmente?</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, isRecurrent: !prev.isRecurrent }))}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out relative ${formData.isRecurrent ? 'bg-emerald-500' : 'bg-slate-600'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${formData.isRecurrent ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            {formData.isRecurrent && (
                                <div className="animate-in fade-in slide-in-from-top-2 pt-2">
                                    <p className="text-xs text-slate-400 mb-2">Selecione os dias da semana (será criada uma série de 12 semanas):</p>
                                    <div className="flex flex-wrap gap-2">
                                        {DAYS.map(day => (
                                            <button
                                                key={day.value}
                                                type="button"
                                                onClick={() => toggleDay(day.value)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.recurrenceDays.includes(day.value)
                                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                                    }`}
                                            >
                                                {day.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                    </form>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-700 bg-slate-900/50 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-all disabled:opacity-50"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="createClassForm"
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white py-3 px-4 rounded-xl font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Salvando...</span>
                            </>
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                <span>Criar Aula</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
