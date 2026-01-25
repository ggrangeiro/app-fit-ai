import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { apiService } from '../services/apiService';
import { Notification, User } from '../types';
import Toast, { ToastType } from './Toast';

interface NotificationCenterProps {
    currentUser: User;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ currentUser }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    console.log("[NotificationCenter] Mounted. CurrentUser:", currentUser?.id, currentUser?.role);

    // Polling interval
    useEffect(() => {
        fetchNotifications();

        const interval = setInterval(() => {
            fetchNotifications();
        }, 30000); // 30s polling

        return () => clearInterval(interval);
    }, [currentUser]);

    // Click outside listener
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const fetchNotifications = async () => {
        try {
            const data = await apiService.getNotifications(currentUser.id);
            if (Array.isArray(data)) {
                setNotifications(data);
            }
        } catch (error) {
            console.warn("Falha ao buscar notificações", error);
        }
    };

    const handleClearOne = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await apiService.deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error("Erro ao limpar notificação", error);
        }
    };

    const handleClearAll = async () => {
        try {
            await apiService.clearAllNotifications(currentUser.id);
            setNotifications([]);
        } catch (error) {
            console.error("Erro ao limpar todas notificações", error);
        }
    };

    const getIconColor = (type: string) => {
        switch (type) {
            case 'CHECKIN': return 'text-green-400';
            case 'PHOTO': return 'text-purple-400';
            case 'ALERT': return 'text-red-400';
            default: return 'text-blue-400';
        }
    };

    const unreadCount = notifications.length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-slate-900">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="fixed inset-x-4 top-20 md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 md:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                        <h3 className="text-sm font-semibold text-white">Notificações</h3>
                        {notifications.length > 0 && (
                            <button
                                onClick={handleClearAll}
                                className="text-xs text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1"
                            >
                                <Trash2 size={12} /> Limpar todas
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <Bell size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">Nenhuma notificação nova</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800">
                                {notifications.map((note) => (
                                    <div key={note.id} className="p-4 hover:bg-slate-800/50 transition-colors relative group">
                                        <div className="flex gap-3">
                                            <div className={`mt-1 ${getIconColor(note.type)}`}>
                                                {note.type === 'CHECKIN' ? <Check size={16} /> : <Bell size={16} />}
                                            </div>
                                            <div className="flex-1 pr-6">
                                                <p className="text-sm text-slate-200 leading-snug">{note.message}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                                                        {note.studentName || 'Aluno'}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {new Date(note.timestamp).toLocaleDateString('pt-BR', {
                                                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => handleClearOne(note.id, e)}
                                                className="absolute top-3 right-3 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                                                title="Remover"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
