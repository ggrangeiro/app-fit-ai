import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import {
    Calendar, Clock, Dumbbell, Users, ChevronDown, User,
    TrendingUp, Activity, Award, Filter
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { InsightResponse, ProfessorWithStats } from '../types';

interface InsightsTabProps {
    professors: ProfessorWithStats[];
    user: any;
}

export const InsightsTab: React.FC<InsightsTabProps> = ({ professors, user }) => {
    const [selectedProfessorId, setSelectedProfessorId] = useState<number | 'ALL'>('ALL');
    const [period, setPeriod] = useState<'WEEK' | 'MONTH' | 'YEAR' | 'ALL'>('WEEK');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<InsightResponse | null>(null);

    // Filter professors if user is Personal (Manager) to show only his team
    // If user is Admin, showing all passed professors might be okay, or handle differently.
    // The 'professors' prop usually contains specific list for the dashboard.

    useEffect(() => {
        fetchInsights();
    }, [selectedProfessorId, period]);

    const fetchInsights = async () => {
        setLoading(true);
        try {
            // If ALL, we might need an endpoint that aggregates ALL, or we pick the first one?
            // For now, let's assume ALL means "Me" (if I am Personal) or similar.
            // Actually, passing 'ALL' to backend needs support.
            // My Service logic: getInsightsForProfessor(professorId).
            // If I want "All my team", I should probably pass my OWN id if I am Personal?
            // Or 0? Let's use user.id if 'ALL' is selected and user is Personal.
            // But wait, the endpoint is /professor/{id}.
            // If I pass MY id (Personal), the service logic `usuarioRepository.findByPersonalId(id)` 
            // will fetch students where I am the Personal. Correct.

            const targetId = selectedProfessorId === 'ALL' ? user.id : selectedProfessorId;

            const result = await apiService.getInsights(targetId, period);
            setData(result);
        } catch (error) {
            console.error("Failed to fetch insights", error);
        } finally {
            setLoading(false);
        }
    };

    // Transform Data for Charts
    const dayData = data ? Object.entries(data.dayDistribution).map(([name, value]) => ({ name, value })) : [];
    // Sort days? They come sorted from backend linkedhashmap? 
    // Backend code used "segunda-feira", etc in order. So they should be fine.

    const hourData = data ? Object.entries(data.hourDistribution).map(([hour, value]) => ({ hour: `${hour}h`, value })) : [];

    const topWorkouts = data?.topWorkouts || [];
    const topStudents = data?.topStudents || [];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">

            {/* HEADER & FILTERS */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-emerald-400" />
                        Insights da Equipe
                    </h2>
                    <p className="text-slate-400 text-sm">Visualize o engajamento dos alunos</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* PROFESSOR SELECTOR */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-4 w-4 text-slate-400" />
                        </div>
                        <select
                            className="bg-slate-900 border border-slate-700 text-white text-sm rounded-xl pl-10 pr-4 py-2.5 focus:border-emerald-500 focus:outline-none appearance-none cursor-pointer hover:bg-slate-800 transition-colors"
                            value={selectedProfessorId}
                            onChange={(e) => setSelectedProfessorId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                        >
                            <option value="ALL">Minha Equipe (Todos)</option>
                            {professors.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* PERIOD SELECTOR */}
                    <div className="bg-slate-900 p-1 rounded-xl border border-slate-700 flex">
                        {[
                            { id: 'WEEK', label: '7 Dias' },
                            { id: 'MONTH', label: '30 Dias' },
                            { id: 'YEAR', label: 'Ano' },
                            { id: 'ALL', label: 'Geral' }
                        ].map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => setPeriod(opt.id as any)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${period === opt.id
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
                <div className="h-96 flex flex-col items-center justify-center text-slate-500 gap-4">
                    <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="animate-pulse">Calculando métricas...</p>
                </div>
            ) : (
                <>
                    {/* TOP METRICS GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* WEEKLY ACTIVITY CHART */}
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-purple-400" />
                                    Frequência Semanal
                                </h3>
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dayData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                                        <XAxis
                                            dataKey="name"
                                            stroke="#94a3b8"
                                            fontSize={12}
                                            tickFormatter={(val) => val.substring(0, 3).toUpperCase()}
                                        />
                                        <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                            cursor={{ fill: '#334155', opacity: 0.2 }}
                                        />
                                        <Bar dataKey="value" name="Treinos" fill="#a855f7" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* HOURLY ACTIVITY CHART */}
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-blue-400" />
                                    Horários de Pico
                                </h3>
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={hourData}>
                                        <defs>
                                            <linearGradient id="colorHour" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                                        <XAxis
                                            dataKey="hour"
                                            stroke="#94a3b8"
                                            fontSize={12}
                                            interval={3}
                                        />
                                        <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
                                        <Area type="monotone" dataKey="value" name="Treinos" stroke="#3b82f6" fillOpacity={1} fill="url(#colorHour)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* TOP STUDENTS RANKING */}
                        <div className="lg:col-span-1 bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Award className="w-5 h-5 text-yellow-400" />
                                    Alunos Mais Ativos
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
                                {topStudents.length === 0 ? (
                                    <div className="text-center text-slate-500 py-8">Sem dados no período</div>
                                ) : (
                                    <div className="space-y-3">
                                        {topStudents.map((student, idx) => (
                                            <div key={student.userId} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
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
                                                        <span className="text-sm font-bold text-white truncate max-w-[120px]">{student.name}</span>
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
                        <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Dumbbell className="w-5 h-5 text-pink-400" />
                                    Treinos Mais Realizados
                                </h3>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={topWorkouts} margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} opacity={0.5} />
                                        <XAxis type="number" stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            stroke="#fff"
                                            fontSize={11}
                                            width={150}
                                            tickFormatter={(val) => val.length > 20 ? val.substring(0, 20) + '...' : val}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                            cursor={{ fill: '#334155', opacity: 0.2 }}
                                        />
                                        <Bar dataKey="count" name="Execuções" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>


                    </div>

                    {/* SATISFACTION SECTION */}
                    {data?.feedbackSummary && (
                        <div className="space-y-6 pt-6 border-t border-slate-700 mt-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 text-blue-400">
                                    <Activity className="w-5 h-5" />
                                </div>
                                Satisfação dos Alunos
                            </h2>

                            {/* SUMMARY CARDS */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { label: 'Últimos 7 Dias', stats: data.feedbackSummary.week },
                                    { label: 'Últimos 30 Dias', stats: data.feedbackSummary.month },
                                    { label: 'Último Ano', stats: data.feedbackSummary.year }
                                ].map((item, idx) => (
                                    <div key={idx} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
                                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">{item.label}</h3>
                                        <div className="flex justify-around items-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-2xl font-bold text-emerald-400">{item.stats?.likes || 0}</span>
                                                <span className="text-xs text-emerald-500/80 font-medium">Likes</span>
                                            </div>
                                            <div className="h-8 w-px bg-slate-700"></div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-2xl font-bold text-rose-400">{item.stats?.dislikes || 0}</span>
                                                <span className="text-xs text-rose-500/80 font-medium">Dislikes</span>
                                            </div>
                                        </div>
                                        {/* Satisfaction Rate */}
                                        <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden flex">
                                            <div
                                                className="h-full bg-emerald-500"
                                                style={{ width: `${(item.stats?.likes || 0) + (item.stats?.dislikes || 0) > 0 ? ((item.stats?.likes || 0) / ((item.stats?.likes || 0) + (item.stats?.dislikes || 0))) * 100 : 0}%` }}
                                            ></div>
                                            <div
                                                className="h-full bg-rose-500"
                                                style={{ width: `${(item.stats?.likes || 0) + (item.stats?.dislikes || 0) > 0 ? ((item.stats?.dislikes || 0) / ((item.stats?.likes || 0) + (item.stats?.dislikes || 0))) * 100 : 0}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* FEEDBACK DETAILS TABLE */}
                            <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
                                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                                    <h3 className="font-bold text-white text-sm">Feedback Detalhado ({period === 'ALL' ? 'Geral' : period === 'WEEK' ? '7 Dias' : period === 'MONTH' ? '30 Dias' : 'Ano'})</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left text-slate-400">
                                        <thead className="text-xs text-slate-500 uppercase bg-slate-900/50">
                                            <tr>
                                                <th className="px-4 py-3">Aluno</th>
                                                <th className="px-4 py-3">Treino</th>
                                                <th className="px-4 py-3">Professor Resp.</th>
                                                <th className="px-4 py-3 text-center">Avaliação</th>
                                                <th className="px-4 py-3 text-right">Data</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.feedbackDetails && data.feedbackDetails.length > 0 ? (
                                                data.feedbackDetails.map((item, index) => (
                                                    <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                                                        <td className="px-4 py-3 font-medium text-white">{item.studentName}</td>
                                                        <td className="px-4 py-3">{item.workoutName}</td>
                                                        <td className="px-4 py-3 text-slate-500">{item.professorName}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`
                                                                inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                                ${(item.feedbackType === 'LIKE' || item.feedbackType === 'like') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}
                                                            `}>
                                                                {(item.feedbackType === 'LIKE' || item.feedbackType === 'like') ? '👍 Gostei' : '👎 Não Gostei'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            {new Date(item.timestamp).toLocaleDateString()} <span className="text-xs ml-1 text-slate-600">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                                        Nenhum feedback registrado neste período.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                </>
            )}
        </div>
    );
};
