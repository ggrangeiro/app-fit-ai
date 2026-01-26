import React, { useEffect, useState } from 'react';
import { Badge, getBadgeIcon } from './Badge';
import { AchievementProgress } from '../types';
import { apiService } from '../services/apiService';
import { Loader2, X, Check, Lock, Trophy } from 'lucide-react';

interface AchievementsModalProps {
    userId: string;
    onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ userId, onClose }) => {
    const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBadge, setSelectedBadge] = useState<AchievementProgress | null>(null);

    useEffect(() => {
        const fetchAchievements = async () => {
            try {
                const data = await apiService.getUserAchievementsProgress(userId);
                setAchievements(data);
            } catch (error) {
                console.error("Failed to load achievements", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAchievements();
    }, [userId]);

    const validAchievements = achievements.filter(a => a?.achievement?.id);
    const unlockedCount = validAchievements.filter(a => a.unlocked).length;
    const totalCount = validAchievements.length;
    const progressPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
            <div
                className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl animate-slide-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Conquistas</h2>
                            <p className="text-xs text-gray-500">Desbloqueie medalhas com consistência!</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
                            <p className="text-sm text-gray-500">Carregando conquistas...</p>
                        </div>
                    ) : (
                        <>
                            {/* Progress Bar */}
                            <div className="mb-6">
                                <div className="flex justify-between text-sm font-medium mb-2">
                                    <span className="text-gray-600">{unlockedCount} de {totalCount} desbloqueadas</span>
                                    <span className="text-indigo-600">{Math.round(progressPercent)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div
                                        className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2.5 rounded-full transition-all duration-500"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>

                            {/* Badges Grid */}
                            {validAchievements.length === 0 ? (
                                <div className="text-center py-8">
                                    <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">Nenhuma conquista disponível</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-2 justify-items-center">
                                    {validAchievements.map((progress) => (
                                        <Badge
                                            key={progress.achievement.id}
                                            progress={progress}
                                            onClick={() => setSelectedBadge(progress)}
                                            size="sm"
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Badge Detail Modal */}
            {selectedBadge && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60"
                    onClick={() => setSelectedBadge(null)}
                >
                    <div
                        className="bg-white rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl animate-scale-up"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Icon container */}
                        <div className={`
                            mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4
                            ${selectedBadge.unlocked
                                ? 'bg-gradient-to-br from-amber-100 to-orange-100 text-amber-600'
                                : 'bg-gray-200 text-gray-400'
                            }
                        `}>
                            {getBadgeIcon(selectedBadge.achievement.iconKey, 40)}
                        </div>

                        {/* Status indicator */}
                        <div className={`
                            inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-3
                            ${selectedBadge.unlocked
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }
                        `}>
                            {selectedBadge.unlocked ? (
                                <>
                                    <Check size={12} />
                                    Desbloqueada
                                </>
                            ) : (
                                <>
                                    <Lock size={12} />
                                    Bloqueada
                                </>
                            )}
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 mb-1">{selectedBadge.achievement.name}</h3>
                        <p className="text-sm text-gray-600 mb-4">{selectedBadge.achievement.description}</p>

                        {selectedBadge.unlocked && selectedBadge.unlockedAt && (
                            <p className="text-xs text-gray-500 mb-4">
                                Conquistada em {new Date(selectedBadge.unlockedAt).toLocaleDateString('pt-BR')}
                            </p>
                        )}

                        <button
                            onClick={() => setSelectedBadge(null)}
                            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium active:bg-indigo-700 transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
