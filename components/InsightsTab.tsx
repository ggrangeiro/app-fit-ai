import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import {
    Calendar, Clock, Dumbbell, User,
    TrendingUp, Activity, Award
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { InsightResponse, User as UserType } from '../types';

interface InsightsTabProps {
    professors: UserType[];
    user: any;
}

export const InsightsTab: React.FC<InsightsTabProps> = ({ professors, user }) => {
    const [selectedProfessorId, setSelectedProfessorId] = useState<number | 'ALL'>('ALL');
    const [period, setPeriod] = useState<'WEEK' | 'MONTH' | 'YEAR' | 'ALL'>('WEEK');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<InsightResponse | null>(null);

    useEffect(() => {
        fetchInsights();
    }, [selectedProfessorId, period]);

    const fetchInsights = async () => {
        setLoading(true);
        try {
            const targetId = selectedProfessorId === 'ALL' ? user.id : selectedProfessorId;
            const result = await apiService.getInsights(targetId, period);
            setData(result);
        } catch (error) {
            console.error("Failed to fetch insights", error);
        } finally {
            setLoading(false);
        }
    };

    const dayData = data ? Object.entries(data.dayDistribution).map(([name, value]) => ({ name, value })) : [];
    const hourData = data ? Object.entries(data.hourDistribution).map(([hour, value]) => ({ hour: `${hour}h`, value })) : [];
    const topWorkouts = data?.topWorkouts || [];
    const topStudents = data?.topStudents || [];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">

            {/* HEADER & FILTERS */}
            <div className="flex flex-col gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-emerald-400" />
                        Insights da Equipe
                    </h2>
                    <p className="text-slate-400 text-sm">Visualize o engajamento dos alunos</p>
                </div>

                <div className="flex flex-col gap-3">
                    {/* PROFESSOR SELECTOR */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-4 w-4 text-slate-400" />
                        </div>
                        <select
                            className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-xl pl-10 pr-4 py-3 focus:border-emerald-500 focus:outline-none appearance-none"
                            value={selectedProfessorId}
                            onChange={(e) => setSelectedProfessorId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                        >
                            <option value="ALL">Minha Equipe (Todos)</option>
                            {professors.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* PERIOD SELECTOR - Scrollable on mobile if needed */}
                    <div className="bg-slate-900 p-1 rounded-xl border border-slate-700 flex overflow-x-auto">
                        {[
                            { id: 'WEEK', label: '7 Dias' },
                            { id: 'MONTH', label: '30 Dias' },
                            { id: 'YEAR', label: 'Ano' },
                            { id: 'ALL', label: 'Geral' }
                        ].map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => setPeriod(opt.id as any)}
                                className={`flex-1 px-2 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${period === opt.id
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-4">
                    <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="animate-pulse">Calculando métricas...</p>
                </div>
            ) : (
                <>
                    {/* TOP METRICS GRID */}
                    <div className="grid grid-cols-1 gap-6">

                        {/* WEEKLY ACTIVITY CHART */}
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                                    <Calendar className="w-4 h-4 text-purple-400" />
                                    Frequência Semanal
                                </h3>
                            </div>
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dayData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                                        <XAxis
                                            dataKey="name"
                                            stroke="#94a3b8"
                                            fontSize={10}
                                            tickFormatter={(val) => val.substring(0, 3).toUpperCase()}
                                        />
                                        <YAxis stroke="#94a3b8" fontSize={10} allowDecimals={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', fontSize: '12px' }}
                                            cursor={{ fill: '#334155', opacity: 0.2 }}
                                        />
                                        <Bar dataKey="value" name="Treinos" fill="#a855f7" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* HOURLY ACTIVITY CHART */}
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                                    <Clock className="w-4 h-4 text-blue-400" />
                                    Horários de Pico
                                </h3>
                            </div>
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={hourData}>
                                        <defs>
                                            <linearGradient id="colorHourMobile" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                                        <XAxis
                                            dataKey="hour"
                                            stroke="#94a3b8"
                                            fontSize={10}
                                            interval={3}
                                        />
                                        <YAxis stroke="#94a3b8" fontSize={10} allowDecimals={false} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', fontSize: '12px' }} />
                                        <Area type="monotone" dataKey="value" name="Treinos" stroke="#3b82f6" fillOpacity={1} fill="url(#colorHourMobile)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* TOP STUDENTS RANKING */}
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-xl flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                                    <Award className="w-4 h-4 text-yellow-400" />
                                    Alunos Mais Ativos
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[250px]">
                                {topStudents.length === 0 ? (
                                    <div className="text-center text-slate-500 py-8 text-sm">Sem dados no período</div>
                                ) : (
                                    <div className="space-y-3">
                                        {topStudents.map((student, idx) => (
                                            <div key={student.userId} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                                                <div className="flex items-center gap-3">
                                                    <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs
                                        ${idx === 0 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' :
                                                            idx === 1 ? 'bg-slate-300 text-black' :
                                                                idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-700 text-slate-300'}
                                    `}>
                                                        {idx + 1}º
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-white truncate max-w-[150px]">{student.name}</span>
                                                        <span className="text-[10px] text-slate-500">ID: {student.userId}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-lg">
                                                    <Activity className="w-3 h-3 text-emerald-400" />
                                                    <span className="text-xs font-bold text-white">{student.checkinCount}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* TOP WORKOUTS CHART */}
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                                    <Dumbbell className="w-4 h-4 text-pink-400" />
                                    Treinos Mais Realizados
                                </h3>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={topWorkouts} margin={{ left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} opacity={0.5} />
                                        <XAxis type="number" stroke="#94a3b8" fontSize={10} allowDecimals={false} />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            stroke="#fff"
                                            fontSize={10}
                                            width={100}
                                            tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', fontSize: '12px' }}
                                            cursor={{ fill: '#334155', opacity: 0.2 }}
                                        />
                                        <Bar dataKey="count" name="Execuções" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={15} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>
                </>
            )}
        </div>
    );
};
