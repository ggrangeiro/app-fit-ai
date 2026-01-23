import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Flame, Check, Calendar, Loader2, Target } from 'lucide-react';
import { apiService } from '../services/apiService';
import { WeeklyCheckInData, StreakData, WeeklyCheckInDay } from '../types';
import { ToastType } from './Toast';

interface WeeklyCheckInTrackerProps {
    userId: string;
    onOpenCheckIn: (date: string) => void;
    showToast: (message: string, type?: ToastType) => void;
    refreshTrigger?: number; // New prop to force refresh
}

// Helper to calculate Monday of a week based on offset
const getMondayForOffset = (offset: number): string => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    // Calculate days since Monday (Sunday = 0, so we need to handle that)
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysSinceMonday + (offset * 7));
    return monday.toISOString().split('T')[0];
};

// Generate mock data for development/testing when backend is unavailable
const generateMockWeekData = (weekStart: string): WeeklyCheckInData => {
    const startDate = new Date(weekStart);
    const days: WeeklyCheckInDay[] = [];
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        // Mock: random check-ins for past days (40% chance)
        const isPast = date < today;
        const hasCheckIn = isPast && Math.random() > 0.6;

        days.push({
            dayOfWeek: dayNames[i],
            dayLabel: dayLabels[i],
            date: dateStr,
            hasCheckIn,
            checkIn: hasCheckIn ? {
                id: `mock-${i}`,
                timestamp: date.getTime(),
                comment: Math.random() > 0.5 ? 'Treino pago! 💪' : undefined
            } : null
        });
    }

    const totalCheckIns = days.filter(d => d.hasCheckIn).length;

    // Calculate week label
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const weekOfMonth = Math.ceil(startDate.getDate() / 7);
    const weekLabel = `Semana ${weekOfMonth} de ${monthNames[startDate.getMonth()]}`;

    return {
        weekStart,
        weekEnd: days[6].date,
        weekLabel,
        weeklyGoal: 5,
        totalCheckIns,
        days
    };
};

const generateMockStreakData = (): StreakData => {
    return {
        currentStreak: Math.floor(Math.random() * 7),
        longestStreak: Math.floor(Math.random() * 30) + 5,
        lastCheckInDate: new Date().toISOString().split('T')[0],
        isActiveToday: Math.random() > 0.5
    };
};

export const WeeklyCheckInTracker: React.FC<WeeklyCheckInTrackerProps> = ({
    userId,
    onOpenCheckIn,
    showToast,
    refreshTrigger = 0
}) => {
    const [weekOffset, setWeekOffset] = useState(0);
    const [weekData, setWeekData] = useState<WeeklyCheckInData | null>(null);
    const [streakData, setStreakData] = useState<StreakData | null>(null);
    const [loading, setLoading] = useState(true);
    const [useMockData, setUseMockData] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const mondayDate = getMondayForOffset(weekOffset);

        try {
            // Fetch week data every time offset changes
            const weekPromise = apiService.getWeekData(userId, mondayDate);

            // Only fetch streak data if we represent the current week (offset 0)
            // If it's another week, we just keep the existing streak data (or don't update it)
            const streakPromise = weekOffset === 0
                ? apiService.getStreakData(userId)
                : Promise.resolve(null); // Return null to indicate no update needed

            const [week, streak] = await Promise.all([weekPromise, streakPromise]);

            setWeekData(week);

            // Only update streak if we actually fetched it
            if (streak) {
                setStreakData(streak as StreakData);
            }
            setUseMockData(false);
        } catch (error) {
            console.warn('API unavailable, using mock data:', error);
            // Fallback to mock data
            setWeekData(generateMockWeekData(mondayDate));
            if (weekOffset === 0) {
                setStreakData(generateMockStreakData());
            }
            setUseMockData(true);
        } finally {
            setLoading(false);
        }
    }, [userId, weekOffset, refreshTrigger]); // Added refreshTrigger dependency

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handlePrevWeek = () => setWeekOffset(prev => prev - 1);
    const handleNextWeek = () => {
        // Don't allow navigating to future weeks
        if (weekOffset < 0) {
            setWeekOffset(prev => prev + 1);
        }
    };

    const handleDayClick = (day: WeeklyCheckInDay) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayDate = new Date(day.date);
        dayDate.setHours(0, 0, 0, 0);

        const isToday = dayDate.getTime() === today.getTime();
        const isPast = dayDate < today;
        const isFuture = dayDate > today;

        if (isFuture) {
            // Future days are disabled
            return;
        }

        if (day.hasCheckIn && day.checkIn?.comment) {
            // Show comment as toast
            showToast(`💬 "${day.checkIn.comment}"`, 'info');
        } else if (!day.hasCheckIn && (isToday || isPast)) {
            // Open check-in modal with pre-selected date
            onOpenCheckIn(day.date);
        }
    };

    const getDayState = (day: WeeklyCheckInDay): 'completed' | 'today' | 'empty' | 'future' => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayDate = new Date(day.date);
        dayDate.setHours(0, 0, 0, 0);

        if (day.hasCheckIn) return 'completed';
        if (dayDate.getTime() === today.getTime()) return 'today';
        if (dayDate > today) return 'future';
        return 'empty';
    };

    const progressPercentage = weekData
        ? Math.min((weekData.totalCheckIns / (weekData?.weeklyGoal || 5)) * 100, 100)
        : 0;

    const goalReached = weekData ? weekData.totalCheckIns >= (weekData?.weeklyGoal || 5) : false;

    return (
        <div className="w-full max-w-5xl mb-8">
            <div className="glass-panel rounded-2xl p-5 border border-slate-700/50 relative overflow-hidden">
                {/* Decorative gradient bar at top */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 opacity-70" />

                {/* Loading Skeleton */}
                {loading ? (
                    <div className="animate-pulse space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="h-6 w-32 bg-slate-700 rounded" />
                            <div className="h-6 w-20 bg-slate-700 rounded-full" />
                        </div>
                        <div className="h-3 w-full bg-slate-700 rounded-full" />
                        <div className="flex justify-between gap-2 mt-4">
                            {[...Array(7)].map((_, i) => (
                                <div key={i} className="flex flex-col items-center gap-2">
                                    <div className="h-3 w-6 bg-slate-700 rounded" />
                                    <div className="h-10 w-10 bg-slate-700 rounded-full" />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header: Week Navigation + Streak Badge */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handlePrevWeek}
                                    className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-emerald-400" />
                                    <span className="text-white font-semibold text-sm md:text-base">
                                        {weekData?.weekLabel || 'Esta Semana'}
                                    </span>
                                </div>
                                <button
                                    onClick={handleNextWeek}
                                    disabled={weekOffset >= 0}
                                    className={`p-2 rounded-lg transition-colors ${weekOffset >= 0
                                        ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed'
                                        : 'bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white'
                                        }`}
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Streak Badge */}
                            {streakData && streakData.currentStreak > 0 && weekOffset === 0 && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 animate-pulse-subtle">
                                    <Flame className="w-4 h-4 text-orange-400" />
                                    <span className="text-orange-300 font-bold text-sm">
                                        {streakData.currentStreak} {streakData.currentStreak === 1 ? 'dia' : 'dias'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-5">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                    <Target className="w-4 h-4 text-slate-400" />
                                    <span className="text-xs text-slate-400 font-medium">Meta semanal</span>
                                </div>
                                <span className={`text-xs font-bold ${goalReached ? 'text-emerald-400' : 'text-slate-300'}`}>
                                    {weekData?.totalCheckIns || 0}/{(weekData?.weeklyGoal || 5)}
                                    {goalReached && <span className="ml-1">✨</span>}
                                </span>
                            </div>
                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${goalReached
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                        : 'bg-gradient-to-r from-emerald-600 to-emerald-500'
                                        }`}
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>
                        </div>

                        {/* Day Grid */}
                        <div className="flex justify-between gap-1 md:gap-3">
                            {weekData?.days.map((day) => {
                                const state = getDayState(day);

                                return (
                                    <button
                                        key={day.date}
                                        onClick={() => handleDayClick(day)}
                                        disabled={state === 'future'}
                                        className={`flex flex-col items-center gap-1.5 p-1.5 md:p-2 rounded-xl transition-all flex-1 ${state === 'future' ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-800/50'
                                            }`}
                                    >
                                        <span className={`text-[10px] md:text-xs font-semibold uppercase ${state === 'completed' ? 'text-emerald-400' :
                                            state === 'today' ? 'text-blue-400' :
                                                'text-slate-500'
                                            }`}>
                                            {day.dayLabel}
                                        </span>

                                        <div className={`
                      w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center
                      transition-all duration-300
                      ${state === 'completed'
                                                ? 'bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/30'
                                                : state === 'today'
                                                    ? 'border-2 border-dashed border-blue-400 text-blue-400 animate-pulse-ring'
                                                    : state === 'empty'
                                                        ? 'border-2 border-slate-600 text-slate-600 hover:border-slate-500'
                                                        : 'border-2 border-slate-700/50 text-slate-700'
                                            }
                    `}>
                                            {state === 'completed' ? (
                                                <Check className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
                                            ) : (
                                                <span className="text-xs md:text-sm font-bold">
                                                    {new Date(day.date).getDate()}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Mock Data Indicator (dev only) */}
                        {useMockData && (
                            <div className="mt-3 text-center">
                                <span className="text-[10px] text-slate-600 bg-slate-800/50 px-2 py-0.5 rounded">
                                    📊 Dados de demonstração
                                </span>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default WeeklyCheckInTracker;
