import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, MapPin, Users, Clock, AlertCircle } from 'lucide-react';
import { apiService } from '../services/apiService';
import { GroupClass, User } from '../types';
import { CreateClassModal } from './CreateClassModal';
import Toast from './Toast';

interface ClassManagerProps {
    currentUser: User;
}

export const ClassManager: React.FC<ClassManagerProps> = ({ currentUser }) => {
    const [classes, setClasses] = useState<GroupClass[]>([]);
    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({
        message: '', type: 'info', isVisible: false
    });

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type, isVisible: true });
        setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    };

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const data = await apiService.getProfessorClasses(currentUser.id);
            setClasses(data);
        } catch (error) {
            console.error(error);
            showToast('Erro ao carregar aulas.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClasses();
    }, [currentUser]);

    const handleDelete = async (classId: number, recurrenceGroupId?: string) => {
        if (!window.confirm("Tem certeza que deseja apagar? Se for uma série, você pode apagar todas.")) return;

        try {
            if (recurrenceGroupId && window.confirm("Esta aula faz parte de uma série. Deseja apagar TODAS as aulas desta série?")) {
                await apiService.deleteRecurrenceSeries(recurrenceGroupId);
                showToast('Série de aulas removida!', 'success');
            } else {
                await apiService.deleteClass(classId);
                showToast('Aula removida!', 'success');
            }
            fetchClasses();
        } catch (e: any) {
            showToast('Erro ao remover: ' + e.message, 'error');
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="space-y-4 pb-20">
            {toast.isVisible && (
                <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg text-white font-medium animate-in fade-in slide-in-from-top-4 ${toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                    }`}>
                    {toast.message}
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white">Minhas Aulas</h2>
                    <p className="text-sm text-slate-400">Gerencie sua grade de horários</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white p-3 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                    <Plus className="w-6 h-6" />
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : classes.length === 0 ? (
                <div className="text-center py-10 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                    <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">Nenhuma aula cadastrada.</p>
                    <p className="text-xs text-slate-500 mt-1">Toque no + para criar sua primeira aula.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {classes.map(cls => (
                        <div key={cls.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex gap-4">
                            {/* Time Badge */}
                            <div className="flex flex-col items-center justify-center bg-slate-900 rounded-lg p-2 min-w-[60px] border border-slate-700/50 h-fit">
                                <span className="text-xs text-slate-400 font-medium uppercase">{new Date(cls.startTime).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                                <span className="text-lg font-bold text-white">{new Date(cls.startTime).getDate()}</span>
                                <span className="text-xs text-emerald-400 font-bold">{new Date(cls.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-bold truncate pr-6">{cls.name}</h3>

                                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <span>{cls.durationMinutes} min</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        <span>{cls.bookings}/{cls.capacity}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 mt-1 text-xs text-slate-500 truncate">
                                    <MapPin className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{cls.location || 'Sem local definido'}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <button
                                onClick={() => handleDelete(cls.id, cls.recurrenceGroupId)}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-lg self-center transition-colors"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <CreateClassModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={fetchClasses}
                currentUser={currentUser}
            />
        </div>
    );
};
