import React, { useState, useEffect } from 'react';
import { WorkoutDayV2, ExerciseV2, WorkoutPlanV2 } from '../types';
import { ArrowLeft, Clock, Info, CheckCircle2, Save, Play, Dumbbell, ThumbsUp, ThumbsDown, X, Calendar, ChevronRight } from 'lucide-react';

// ====================================
// Modal de Seleção de Dia de Treino
// ====================================

interface WorkoutDaySelectorProps {
    days: any[];
    onSelectDay: (day: any, dayIndex: number) => void;
    onClose: () => void;
}

// Mapeamento de dias da semana em inglês para português
const dayOfWeekMap: Record<string, string> = {
    'monday': 'Segunda',
    'tuesday': 'Terça',
    'wednesday': 'Quarta',
    'thursday': 'Quinta',
    'friday': 'Sexta',
    'saturday': 'Sábado',
    'sunday': 'Domingo',
    'weekend': 'Fim de Semana',
    '1': 'Segunda',
    '2': 'Terça',
    '3': 'Quarta',
    '4': 'Quinta',
    '5': 'Sexta',
    '6': 'Sábado',
    '7': 'Domingo',
};

// Verifica se é dia de descanso
const isRestDay = (day: any): boolean => {
    if (!day) return true;

    // Verificar propriedades booleanas explícitas (vários formatos possíveis)
    // IMPORTANTE: isRest é usado no formato atual
    if (day.isRest === true || day.isRestDay === true || day.is_rest_day === true || day.is_rest === true) return true;

    // Verificar status
    if (day.status === 'rest') return true;

    // Verificar trainingType/title que indica descanso
    const trainingType = (day.trainingType || day.training_type || day.title || '').toLowerCase();
    if (trainingType === 'descanso' || trainingType === 'rest' || trainingType === 'descanso ativo') return true;

    // Verificar pelo nome do dia se indica descanso
    const dayName = (day.day || day.dayLabel || day.day_label || day.name || '').toLowerCase();
    if (dayName.includes('descanso') || dayName.includes('recuperação') || dayName.includes('rest') || dayName.includes('off')) {
        return true;
    }

    // Se tem isRest/isRestDay explicitamente false, NÃO é descanso
    if (day.isRest === false || day.isRestDay === false || day.is_rest_day === false) return false;

    // Se tem exercícios, NÃO é descanso
    if (day.exercises && day.exercises.length > 0) return false;

    // Por padrão, assumir que NÃO é descanso
    return false;
};

const formatDayTitle = (day: any, index: number): string => {
    if (!day) return `Treino ${index + 1}`;

    // Suportar múltiplos formatos de dados
    // Formato novo: { day: "Segunda-feira", title: "Superior A" }
    // Formato antigo: { dayLabel: "Dia 1: Superior A", dayOfWeek: "monday", trainingType: "..." }
    const title = day.title || day.trainingType || day.training_type || '';
    const dayNameFull = day.day || day.dayLabel || day.day_label || '';
    const dayOfWeek = day.dayOfWeek || day.day_of_week || '';

    // Se temos "day" (ex: "Segunda-feira") e "title" (ex: "Superior A"), combinar
    if (dayNameFull && title) {
        // Remover "-feira" para ficar mais curto
        const shortDayName = dayNameFull.replace('-feira', '');
        return `${shortDayName}: ${title}`;
    }

    // Se temos dayOfWeek em inglês, traduzir e combinar com title
    if (dayOfWeek && title) {
        const translatedDay = dayOfWeekMap[String(dayOfWeek).toLowerCase()] || '';
        if (translatedDay) {
            return `${translatedDay}: ${title}`;
        }
    }

    // Se temos apenas dayLabel no formato "Dia X: Titulo"
    if (dayNameFull && dayNameFull.match(/^Dia \d+:/i)) {
        // Se temos dayOfWeek, substituir "Dia X" pelo dia da semana
        if (dayOfWeek) {
            const translatedDay = dayOfWeekMap[String(dayOfWeek).toLowerCase()] || '';
            if (translatedDay) {
                return dayNameFull.replace(/^Dia \d+:/i, `${translatedDay}:`);
            }
        }
        return dayNameFull;
    }

    // Se temos apenas title
    if (title) {
        return title;
    }

    // Último fallback
    return day.name || `Treino ${index + 1}`;
};

export const WorkoutDaySelector: React.FC<WorkoutDaySelectorProps> = ({ days, onSelectDay, onClose }) => {
    // Filtrar apenas dias de treino (remover dias de descanso)
    const trainingDays = days.filter((day: any) => !isRestDay(day));

    // Debug: log dos dias recebidos
    console.log('[WorkoutDaySelector] Dias recebidos:', days);
    console.log('[WorkoutDaySelector] Dias de treino (filtrados):', trainingDays);

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 w-full max-w-2xl relative shadow-2xl max-h-[90vh] overflow-y-auto" style={{ marginTop: 'env(safe-area-inset-top)' }}>
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <X className="w-6 h-6" />
                </button>

                <div className="flex flex-col items-center mb-6">
                    <div className="p-3 bg-emerald-600/20 text-emerald-400 rounded-full mb-3">
                        <Dumbbell className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">Iniciar Treino</h3>
                    <p className="text-slate-400 text-center text-sm">Selecione qual treino você deseja fazer hoje</p>
                </div>

                <div className="space-y-3">
                    {trainingDays.map((day: any, index: number) => {
                        const title = formatDayTitle(day, index);
                        const exerciseCount = day.exercises?.length || 0;
                        const note = day.note || 'Bom treino!';

                        // Encontrar o índice original no array completo para passar ao handler
                        const originalIndex = days.findIndex((d: any) => d === day);

                        return (
                            <button
                                key={index}
                                onClick={() => onSelectDay(day, originalIndex + 1)}
                                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl p-5 text-left transition-all group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Calendar className="w-4 h-4 text-emerald-400" />
                                            <h4 className="text-white font-bold">{title}</h4>
                                        </div>
                                        <p className="text-slate-400 text-xs mt-1">
                                            {exerciseCount > 0 ? `${exerciseCount} exercícios • ` : ''}{note}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-6 h-6 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// ====================================
// Sessão de Treino Interativa
// ====================================

interface WorkoutSessionProps {
    dayData: WorkoutDayV2;
    onFinish: (updatedDayData: WorkoutDayV2, feedback?: 'like' | 'dislike') => void;
    onCancel: () => void;
    dayLabel: string;
    previousLoads?: Record<string, { actualLoad: string; executedAt: number }>;
}

export const WorkoutSession: React.FC<WorkoutSessionProps> = ({ dayData, onFinish, onCancel, dayLabel, previousLoads }) => {
    const [exercises, setExercises] = useState<ExerciseV2[]>([]);
    const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());
    const [activeExerciseIndex, setActiveExerciseIndex] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);

    useEffect(() => {
        // Initialize exercises from props, ensuring deep copy
        if (dayData && dayData.exercises) {
            const initialExercises = JSON.parse(JSON.stringify(dayData.exercises));

            // Pre-fill with previous loads if current load is empty
            if (previousLoads) {
                initialExercises.forEach((ex: ExerciseV2) => {
                    const prev = previousLoads[ex.name];
                    if (prev && (!ex.load || ex.load.trim() === '')) {
                        ex.load = prev.actualLoad;
                    }
                });
            }

            setExercises(initialExercises);
        }
    }, [dayData, previousLoads]);

    const handleLoadChange = (index: number, newLoad: string) => {
        const updated = [...exercises];
        updated[index].load = newLoad;
        setExercises(updated);
    };

    const toggleComplete = (index: number) => {
        const newCompleted = new Set(completedExercises);
        if (newCompleted.has(index)) {
            newCompleted.delete(index);
        } else {
            newCompleted.add(index);
            // Auto-advance to next exercise if not last
            if (index === activeExerciseIndex && index < exercises.length - 1) {
                setActiveExerciseIndex(index + 1);
            }
        }
        setCompletedExercises(newCompleted);
    };

    const handleFinish = () => {
        setShowFeedback(true);
    };

    const confirmFinish = (feedback: 'like' | 'dislike') => {
        setLoading(true);
        setTimeout(() => {
            const updatedDay: WorkoutDayV2 = {
                ...dayData,
                exercises: exercises
            };
            onFinish(updatedDay, feedback);
            setLoading(false);
        }, 500);
    };

    const progress = Math.round((completedExercises.size / exercises.length) * 100);

    return (
        <div className="fixed inset-0 bg-slate-950 z-[200] overflow-y-auto pb-20">
            {/* Header */}
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 p-4 flex items-center justify-between z-10 shadow-lg" style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top))' }}>
                <button
                    onClick={onCancel}
                    className="p-2 -ml-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <div className="text-center">
                    <h2 className="text-white font-bold text-lg">{dayLabel}</h2>
                    <p className="text-xs text-emerald-400 font-medium">{dayData.trainingType}</p>
                </div>
                <div className="w-8"></div> {/* Spacer for centering */}
            </div>

            {/* Progress Bar */}
            <div className="bg-slate-900 h-1.5 w-full sticky top-[72px] z-10">
                <div
                    className="bg-emerald-500 h-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            <div className="max-w-md mx-auto p-4 space-y-6">

                {/* Intro Card */}
                <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <Play size={20} fill="currentColor" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Hora do Treino!</h1>
                            <p className="text-slate-400 text-sm">Foco total na execução.</p>
                        </div>
                    </div>
                    {dayData.note && (
                        <div className="mt-3 text-sm text-slate-300 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                            <Info size={14} className="inline mr-1.5 text-emerald-400 -mt-0.5" />
                            {dayData.note}
                        </div>
                    )}
                </div>

                {/* Exercises List */}
                <div className="space-y-4">
                    {exercises.map((exercise, index) => {
                        const isCompleted = completedExercises.has(index);
                        const isActive = index === activeExerciseIndex;

                        return (
                            <div
                                key={index}
                                className={`
                    relative rounded-2xl border transition-all duration-300 overflow-hidden
                    ${isActive ? 'bg-slate-800 border-emerald-500/50 shadow-emerald-900/10 ring-1 ring-emerald-500/20' : 'bg-slate-900 border-slate-800 opacity-90'}
                    ${isCompleted ? 'border-emerald-900/30 bg-emerald-900/5' : ''}
                `}
                                onClick={() => !isActive && setActiveExerciseIndex(index)}
                            >
                                {/* Status Strip */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isCompleted ? 'bg-emerald-500' : isActive ? 'bg-emerald-500/50' : 'bg-slate-700'}`}></div>

                                <div className="p-4 pl-6">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <h3 className={`font-bold text-lg mb-1 ${isCompleted ? 'text-emerald-400' : 'text-white'}`}>
                                                {exercise.name}
                                            </h3>
                                            <p className="text-slate-400 text-sm mb-3">{exercise.muscleGroup}</p>

                                            <div className="flex flex-wrap gap-2 text-xs font-mono">
                                                <span className="bg-slate-950 text-slate-300 px-2 py-1 rounded border border-slate-700">
                                                    {exercise.sets} Séries
                                                </span>
                                                <span className="bg-slate-950 text-slate-300 px-2 py-1 rounded border border-slate-700">
                                                    {exercise.reps} Reps
                                                </span>
                                                <span className="bg-slate-950 text-slate-300 px-2 py-1 rounded border border-slate-700 flex items-center gap-1">
                                                    <Clock size={10} /> {exercise.rest}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleComplete(index);
                                            }}
                                            className={`
                                w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all
                                ${isCompleted
                                                    ? 'bg-emerald-500 border-emerald-500 text-slate-900'
                                                    : 'border-slate-600 text-transparent hover:border-emerald-500'
                                                }
                            `}
                                        >
                                            <CheckCircle2 size={18} />
                                        </button>
                                    </div>

                                    {/* Expandable Content handled by isActive */}
                                    {isActive && (
                                        <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-4 animate-in fade-in slide-in-from-top-2">

                                            {/* Load Input */}
                                            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-700/50">
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="text-xs text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                                                        <Dumbbell size={12} /> Carga (Kg)
                                                    </label>
                                                    {previousLoads && previousLoads[exercise.name] && (
                                                        <span className="text-[10px] text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded border border-purple-400/20">
                                                            Histórico: {previousLoads[exercise.name].actualLoad}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex gap-2 items-center flex-wrap">
                                                    <input
                                                        type="text"
                                                        value={exercise.load || ''}
                                                        placeholder="Ex: 20kg (cada lado)"
                                                        onChange={(e) => handleLoadChange(index, e.target.value)}
                                                        className="flex-1 min-w-[120px] bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                                                    />
                                                    {dayData.exercises[index].load && exercise.load !== dayData.exercises[index].load && (
                                                        <button
                                                            onClick={() => handleLoadChange(index, dayData.exercises[index].load || '')}
                                                            className="text-xs text-emerald-400 hover:text-emerald-300 whitespace-nowrap bg-emerald-900/30 px-2 py-1 rounded border border-emerald-900/50 transition-colors"
                                                            title="Restaurar carga sugerida"
                                                        >
                                                            Usar Sugestão: {dayData.exercises[index].load}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Tip */}
                                            {exercise.technique && (
                                                <div className="text-sm text-slate-400 italic bg-slate-800/30 p-3 rounded-lg">
                                                    💡 {exercise.technique}
                                                </div>
                                            )}

                                            {/* Video Link */}
                                            {exercise.videoQuery && (
                                                <a
                                                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.videoQuery)}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="block w-full text-center py-2.5 rounded-lg bg-red-600/10 text-red-400 hover:bg-red-600/20 text-xs font-bold uppercase tracking-wide transition-colors border border-red-900/30"
                                                >
                                                    Ver Execução no YouTube
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Finish Button */}
                <div className="pt-4 sticky bottom-6">
                    <button
                        onClick={handleFinish}
                        disabled={loading}
                        className={`
                    w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all
                    ${loading ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-900 hover:scale-[1.02] active:scale-[0.98]'}
                `}
                    >
                        {loading ? (
                            <>Salvando...</>
                        ) : (
                            <>
                                <Save size={20} />
                                Finalizar Treino
                            </>
                        )}
                    </button>
                </div>

            </div>
            {/* Feedback Modal */}
            {showFeedback && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
                        <h3 className="text-2xl font-bold text-white mb-2">Como foi o treino?</h3>
                        <p className="text-slate-400 mb-8">Seu feedback ajuda a melhorar as próximas sugestões.</p>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => confirmFinish('like')}
                                className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl bg-slate-800 border border-slate-700 hover:bg-emerald-500/10 hover:border-emerald-500 hover:text-emerald-500 transition-all group"
                            >
                                <div className="p-4 rounded-full bg-slate-950 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                                    <ThumbsUp size={32} />
                                </div>
                                <span className="font-bold">Curti</span>
                            </button>

                            <button
                                onClick={() => confirmFinish('dislike')}
                                className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl bg-slate-800 border border-slate-700 hover:bg-red-500/10 hover:border-red-500 hover:text-red-500 transition-all group"
                            >
                                <div className="p-4 rounded-full bg-slate-950 group-hover:bg-red-500 group-hover:text-slate-950 transition-colors">
                                    <ThumbsDown size={32} />
                                </div>
                                <span className="font-bold">Não Curti</span>
                            </button>
                        </div>

                        <button
                            onClick={() => setShowFeedback(false)}
                            className="mt-6 text-slate-500 text-sm hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
