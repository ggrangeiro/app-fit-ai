import React, { useEffect, useState } from 'react';
import { ProfessorAchievementProgress, ProfessorStats } from '../types';
import { apiService } from '../services/apiService';
import { Loader2, X, Check, Lock, TrendingUp, Trophy, Dumbbell, Utensils, Users, Microscope, Clipboard } from 'lucide-react';
import { getBadgeIcon } from './Badge';

interface ProfessorAchievementsGalleryProps {
    managerId: string;
    professorId: string | number;
    professorName: string;
    userType: 'personal' | 'professor';
    onClose?: () => void;
}

export const ProfessorAchievementsGallery: React.FC<ProfessorAchievementsGalleryProps> = ({
    managerId,
    professorId,
    professorName,
    userType,
    onClose
}) => {
    const [achievements, setAchievements] = useState<ProfessorAchievementProgress[]>([]);
    const [stats, setStats] = useState<ProfessorStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedBadge, setSelectedBadge] = useState<ProfessorAchievementProgress | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch achievements and basic stats concurrently
                let rawAchievements: ProfessorAchievementProgress[] = [];
                let statsData: ProfessorStats | null = null;

                if (userType === 'personal') {
                    // PERSONAL: Use dedicated aggregated endpoints
                    // Cast generic AchievementProgress[] to ProfessorAchievementProgress[] for consistency
                    rawAchievements = (await apiService.getPersonalAchievementsProgress(professorId)) as ProfessorAchievementProgress[];
                    statsData = await apiService.getPersonalStats(professorId);

                    // Trigger check to ensure backend is up to date (optional, but good for UX)
                    if (rawAchievements.length === 0) {
                        await apiService.checkPersonalAchievements(professorId);
                        rawAchievements = (await apiService.getPersonalAchievementsProgress(professorId)) as ProfessorAchievementProgress[];
                    }

                } else {
                    // PROFESSOR: Use existing endpoints
                    rawAchievements = (await apiService.getProfessorAchievementsProgress(professorId)) as ProfessorAchievementProgress[];
                    statsData = await apiService.getProfessorStats(managerId, professorId);
                }

                // If stats are missing for some reason, ensure object exists to prevent crashes
                if (!statsData) {
                    statsData = {
                        studentsCreated: 0,
                        workoutsGenerated: 0,
                        dietsGenerated: 0,
                        analysisPerformed: 0,
                        totalActions: 0
                    };
                }

                // Calculate progress manually based on stats if currentProgress is missing
                // (Backend for Personal should return currentProgress populated, but for Professors might still need this)
                const getProgressValue = (type: string, s: ProfessorStats) => {
                    switch (type) {
                        case 'WORKOUT_CREATED': return s.workoutsGenerated;
                        case 'DIET_CREATED': return s.dietsGenerated;
                        case 'STUDENT_CREATED': return s.studentsCreated;
                        case 'ANALYSIS_PERFORMED': return s.analysisPerformed;
                        default: return 0;
                    }
                };

                const enrichedAchievements: ProfessorAchievementProgress[] = rawAchievements.map(a => {
                    // Prioritize existing currentProgress from backend if available
                    let current = a.currentProgress;
                    if (current === undefined || current === null) {
                        current = statsData ? getProgressValue(a.achievement.criteriaType, statsData) : 0;
                    }

                    return {
                        ...a,
                        currentProgress: current
                    };
                });

                setAchievements(enrichedAchievements);
                setStats(statsData);
            } catch (error) {
                console.error("Failed to load achievements", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [managerId, professorId, userType]);

    const validAchievements = achievements.filter(a => a?.achievement?.id);
    const unlockedCount = validAchievements.filter(a => a.unlocked).length;
    const totalCount = validAchievements.length;
    const progressPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

    // Agrupar conquistas por tipo de critério
    const groupedAchievements = validAchievements.reduce((acc, achievement) => {
        const type = achievement.achievement.criteriaType;
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(achievement);
        return acc;
    }, {} as Record<string, ProfessorAchievementProgress[]>);

    const criteriaLabels: Record<string, string> = {
        'WORKOUT_CREATED': 'Treinos Criados',
        'DIET_CREATED': 'Dietas Criadas',
        'STUDENT_CREATED': 'Alunos Cadastrados',
        'ANALYSIS_PERFORMED': 'Análises Realizadas',
        'ASSESSMENT_CREATED': 'Avaliações Criadas'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-up" onClick={e => e.stopPropagation()}>
                {/* Header fixo */}
                <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-100 flex-shrink-0">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Conquistas de {professorName}</h2>
                        <p className="text-xs md:text-sm text-gray-500">Acompanhe a evolução do professor na plataforma!</p>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full flex-shrink-0 transition-colors">
                            <X size={24} className="text-gray-500" />
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center py-12 flex-1 items-center">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                    </div>
                ) : (
                    <div className="overflow-y-auto flex-1 p-4 md:p-6 bg-gray-50/50">
                        {/* Progress Bar Geral */}
                        <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between text-sm font-medium mb-2">
                                <div className="flex items-center gap-2">
                                    <Trophy className="text-amber-500 w-4 h-4" />
                                    <span className="text-gray-600">{unlockedCount} de {totalCount} desbloqueadas</span>
                                </div>
                                <span className="text-indigo-600 font-bold">{Math.round(progressPercent)}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2.5 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${progressPercent}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Stats Summary */}
                        {stats && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                                <StatCard label="Treinos" value={stats.workoutsGenerated} icon={<Dumbbell className="w-5 h-5 text-indigo-600" />} />
                                <StatCard label="Dietas" value={stats.dietsGenerated} icon={<Utensils className="w-5 h-5 text-emerald-600" />} />
                                <StatCard label="Alunos" value={stats.studentsCreated} icon={<Users className="w-5 h-5 text-blue-600" />} />
                                <StatCard label="Análises" value={stats.analysisPerformed} icon={<Microscope className="w-5 h-5 text-purple-600" />} />
                            </div>
                        )}

                        {/* Conquistas por categoria */}
                        {Object.entries(groupedAchievements).map(([type, typeAchievements]: [string, ProfessorAchievementProgress[]]) => (
                            <div key={type} className="mb-8">
                                <div className="flex items-center gap-2 mb-4">
                                    <h3 className="text-lg font-bold text-gray-800">
                                        {criteriaLabels[type] || type}
                                    </h3>
                                    <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                                        {typeAchievements.filter(a => a.unlocked).length}/{typeAchievements.length}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {typeAchievements
                                        .sort((a, b) => a.achievement.criteriaThreshold - b.achievement.criteriaThreshold)
                                        .map((progress) => (
                                            <ProfessorBadge
                                                key={progress.achievement.id}
                                                progress={progress}
                                                onClick={() => setSelectedBadge(progress)}
                                            />
                                        ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Badge Detail Modal */}
                {selectedBadge && (
                    <div
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
                        onClick={() => setSelectedBadge(null)}
                    >
                        <div
                            className="bg-white rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl animate-scale-up"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Icon container */}
                            <div className={`
                                mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-transform hover:scale-105
                                ${selectedBadge.unlocked
                                    ? 'bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 shadow-inner'
                                    : 'bg-gray-100 text-gray-400'
                                }
                            `}>
                                {getBadgeIcon(selectedBadge.achievement.iconKey, 40)}
                            </div>

                            {/* Status indicator */}
                            <div className={`
                                inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4 uppercase tracking-wider
                                ${selectedBadge.unlocked
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-500'
                                }
                            `}>
                                {selectedBadge.unlocked ? (
                                    <>
                                        <Check size={12} strokeWidth={3} />
                                        Desbloqueada
                                    </>
                                ) : (
                                    <>
                                        <Lock size={12} />
                                        Bloqueada
                                    </>
                                )}
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedBadge.achievement.name}</h3>
                            <p className="text-sm text-gray-600 mb-6 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                                {selectedBadge.achievement.description}
                            </p>

                            {/* Progress for locked badges */}
                            {!selectedBadge.unlocked && (
                                <div className="mb-6">
                                    <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2">
                                        <div className="flex items-center gap-1">
                                            <TrendingUp size={14} />
                                            <span>Progresso Atual</span>
                                        </div>
                                        <span>{selectedBadge.currentProgress} / {selectedBadge.achievement.criteriaThreshold}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                                            style={{
                                                width: `${Math.min(
                                                    ((selectedBadge.currentProgress || 0) / selectedBadge.achievement.criteriaThreshold) * 100,
                                                    100
                                                )}%`
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            {selectedBadge.unlocked && selectedBadge.unlockedAt && (
                                <p className="text-xs text-gray-400 mb-4 flex items-center justify-center gap-1">
                                    <span>🏆</span> Conquistada em {new Date(selectedBadge.unlockedAt).toLocaleDateString('pt-BR')}
                                </p>
                            )}

                            <button
                                onClick={() => setSelectedBadge(null)}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Badge component for professor achievements
interface ProfessorBadgeProps {
    progress: ProfessorAchievementProgress;
    onClick: () => void;
}

const ProfessorBadge: React.FC<ProfessorBadgeProps> = ({ progress, onClick }) => {
    const { achievement, unlocked, currentProgress } = progress;
    const progressPercent = Math.min(((currentProgress || 0) / achievement.criteriaThreshold) * 100, 100);

    return (
        <div
            onClick={onClick}
            className={`
                relative flex flex-col items-center justify-center p-3 rounded-2xl border aspect-[4/5]
                transition-all duration-300 cursor-pointer overflow-hidden group
                ${unlocked
                    ? 'bg-white border-indigo-100 shadow-md hover:shadow-xl hover:-translate-y-1 hover:border-indigo-300'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                }
            `}
        >
            {/* Background Gradient for Unlocked */}
            {unlocked && (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}

            {/* Icon container */}
            <div className={`
                w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 relative z-10
                ${unlocked
                    ? 'bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600'
                    : 'bg-gray-200 text-gray-400'
                }
            `}>
                {getBadgeIcon(achievement.iconKey, 24)}
            </div>

            {/* Badge name */}
            <h3 className={`
                text-xs font-bold text-center leading-tight line-clamp-2 mb-2 w-full px-1 relative z-10
                ${unlocked ? 'text-gray-800' : 'text-gray-400'}
            `}>
                {achievement.name}
            </h3>

            {/* Progress bar for locked badges */}
            {!unlocked && (
                <div className="w-full px-2 mt-auto relative z-10">
                    <div className="w-full bg-gray-200 rounded-full h-1">
                        <div
                            className="bg-indigo-400 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                    <p className="text-[9px] text-gray-400 text-center mt-1 font-medium">
                        {currentProgress}/{achievement.criteriaThreshold}
                    </p>
                </div>
            )}

            {/* Locked overlay with icon */}
            {!unlocked && (
                <div className="absolute top-2 right-2 z-20">
                    <Lock size={12} className="text-gray-400" />
                </div>
            )}

            {/* Unlocked overlay with icon */}
            {unlocked && (
                <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className='bg-green-100 p-0.5 rounded-full'>
                        <Check size={10} className="text-green-600" strokeWidth={3} />
                    </div>
                </div>
            )}
        </div>
    );
};

interface StatCardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon }) => (
    <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex items-center gap-3">
        <div className="p-2 bg-gray-50 rounded-lg">
            {icon}
        </div>
        <div>
            <p className="text-lg font-bold text-gray-800 leading-none">{value}</p>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
        </div>
    </div>
);

export default ProfessorAchievementsGallery;
