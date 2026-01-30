import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Clock, CheckCircle, Smartphone } from 'lucide-react';
import { apiService } from '../services/apiService';
import { GroupClass, User } from '../types';
import Toast from './Toast';

interface ClassScheduleProps {
    currentUser: User;
}

export const ClassSchedule: React.FC<ClassScheduleProps> = ({ currentUser }) => {
    const [classes, setClasses] = useState<GroupClass[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<'TODAY' | 'WEEK' | 'NEXT_WEEK' | 'NEXT_MONTH'>('TODAY');
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
            const data = await apiService.getAvailableClasses(false); // don't include full classes by default? or include and mark
            // Backend handles "available" logic.
            // We need to filter client side for Today/Week/Month or ask backend.
            // Current backend implementation just returns "future" classes.
            // So filtering here.
            setClasses(data);
        } catch (error) {
            console.error(error);
            showToast('Erro ao carregar agenda.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClasses();
    }, []);

    const handleBook = async (classId: number) => {
        try {
            await apiService.bookClass(classId, currentUser.id);
            showToast('Agendamento realizado!', 'success');
            fetchClasses(); // Refresh to update booking counts/status
        } catch (e: any) {
            showToast(e.message || 'Erro ao agendar.', 'error');
        }
    };

    const handleCancel = async (classId: number) => {
        try {
            await apiService.cancelBooking(classId);
            showToast('Agendamento cancelado.', 'success');
            fetchClasses();
        } catch (e: any) {
            showToast(e.message || 'Erro ao cancelar.', 'error');
        }
    };

    const filteredClasses = classes.filter(cls => {
        const d = new Date(cls.startTime);
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        if (filter === 'TODAY') {
            return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        if (filter === 'WEEK') {
            // Esta semana (próximos 7 dias a partir de hoje)
            const endOfWeek = new Date(now);
            endOfWeek.setDate(now.getDate() + 7);
            return d >= now && d <= endOfWeek;
        }
        if (filter === 'NEXT_WEEK') {
            // Próxima semana (de segunda a domingo da próxima semana)
            const dayOfWeek = now.getDay();
            const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
            const nextMonday = new Date(now);
            nextMonday.setDate(now.getDate() + daysUntilNextMonday);
            nextMonday.setHours(0, 0, 0, 0);
            const nextSunday = new Date(nextMonday);
            nextSunday.setDate(nextMonday.getDate() + 6);
            nextSunday.setHours(23, 59, 59, 999);
            return d >= nextMonday && d <= nextSunday;
        }
        // NEXT_MONTH
        const nextMonth = now.getMonth() + 1;
        const nextMonthYear = nextMonth > 11 ? now.getFullYear() + 1 : now.getFullYear();
        const actualNextMonth = nextMonth > 11 ? 0 : nextMonth;
        return d.getMonth() === actualNextMonth && d.getFullYear() === nextMonthYear;
    });

    // Need to know if current user booked. 
    // The available endpoint might not return "isBookedByMe".
    // Actually, I should check my bookings separately? 
    // Or I can just try to book and if conflict backend tells me.
    // Better UX: Fetch my bookings status?
    // Backend endpoint `getBookingStatus` exists.
    // For performance, maybe fetch my status for all visible classes?
    // For now, let's rely on backend error or just add a "Booked" visual if possible.
    // The API doesn't return `isBookedByMe` in the list currently. 
    // I will add a quick check.

    const [myBookings, setMyBookings] = useState<Record<number, boolean>>({});

    useEffect(() => {
        const checkStatuses = async () => {
            if (filteredClasses.length === 0) return;
            const statusMap: Record<number, boolean> = {};
            // Parallel fetch is risky for many items, but okay for a few.
            // Ideally backend list should include this flag. 
            // Implementation plan didn't specify changing list endpoint for this flag but it's useful.
            // I will loop for now as a quick fix.
            for (const cls of filteredClasses) {
                try {
                    const res = await apiService.getBookingStatus(cls.id);
                    if (res.booked) statusMap[cls.id] = true;
                } catch (e) { }
            }
            setMyBookings(statusMap);
        };
        checkStatuses();
    }, [filteredClasses.length, filter]); // Re-check when list changes

    return (
        <div className="space-y-4 pb-20">
            {toast.isVisible && (
                <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg text-white font-medium animate-in fade-in slide-in-from-top-4 ${toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                    }`}>
                    {toast.message}
                </div>
            )}

            <div className="flex flex-col gap-4 mb-4">
                <h2 className="text-xl font-bold text-white">Agenda de Aulas</h2>

                {/* Filters */}
                <div className="flex bg-slate-800 p-1 rounded-xl">
                    {['TODAY', 'WEEK', 'NEXT_WEEK', 'NEXT_MONTH'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${filter === f
                                    ? 'bg-slate-700 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            {f === 'TODAY' ? 'Hoje' : f === 'WEEK' ? 'Semana' : f === 'NEXT_WEEK' ? 'Próx. Semana' : 'Próx. Mês'}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : filteredClasses.length === 0 ? (
                <div className="text-center py-10 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                    <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">Nenhuma aula encontrada.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredClasses.map(cls => {
                        const isBooked = myBookings[cls.id];
                        const isFull = cls.bookings >= cls.capacity;

                        return (
                            <div key={cls.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
                                <div className="flex gap-4">
                                    {/* Time Badge */}
                                    <div className="flex flex-col items-center justify-center bg-slate-900 rounded-lg p-2 min-w-[60px] border border-slate-700/50 h-fit">
                                        <span className="text-xs text-slate-400 font-medium uppercase">{new Date(cls.startTime).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                                        <span className="text-lg font-bold text-white">{new Date(cls.startTime).getDate()}</span>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-white font-bold truncate pr-2">{cls.name}</h3>
                                            <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-full">
                                                {new Date(cls.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">com {cls.professorName || 'Instrutor'}</p>

                                        <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                <span>{cls.durationMinutes} min</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                <span>{cls.location || 'Local a definir'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Button */}
                                {isBooked ? (
                                    <button
                                        onClick={() => handleCancel(cls.id)}
                                        className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2.5 rounded-lg font-bold text-sm transition-colors border border-red-500/20"
                                    >
                                        Cancelar Agendamento
                                    </button>
                                ) : isFull ? (
                                    <button disabled className="w-full bg-slate-700 text-slate-500 py-2.5 rounded-lg font-bold text-sm cursor-not-allowed">
                                        Lotada
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleBook(cls.id)}
                                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                                    >
                                        Agendar Aula
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
