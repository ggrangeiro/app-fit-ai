import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MealAnalysisResult } from '../types';
import { analyzeMealPhoto } from '../services/geminiService';
import {
    X, Camera, Loader2, Sparkles, Flame, ArrowLeft,
    Beef, Wheat, Droplets, Leaf, RefreshCw, Upload,
    TrendingUp, Heart, Lightbulb, ChevronRight
} from 'lucide-react';

interface MealAnalysisProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userRole: string;
    showToast: (message: string, type: 'info' | 'success' | 'error') => void;
}

const FOOD_EMOJIS = ['🥗', '🍎', '🥩', '🍚', '🥑', '🥕', '🍗', '🥦', '🍳', '🧀'];

const ANALYZING_MESSAGES = [
    '📸 Processando foto...',
    '🔍 Identificando alimentos...',
    '⚖️ Estimando porções...',
    '🔢 Calculando calorias...',
    '💪 Analisando macros...',
    '✨ Preparando resultados...'
];

export const MealAnalysis: React.FC<MealAnalysisProps> = ({
    isOpen, onClose, userId, userRole, showToast
}) => {
    const { t } = useTranslation();
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<MealAnalysisResult | null>(null);
    const [analyzingMsgIndex, setAnalyzingMsgIndex] = useState(0);
    const [scoreAnimated, setScoreAnimated] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cycle through analyzing messages
    useEffect(() => {
        if (!analyzing) return;
        const interval = setInterval(() => {
            setAnalyzingMsgIndex(prev => (prev + 1) % ANALYZING_MESSAGES.length);
        }, 2000);
        return () => clearInterval(interval);
    }, [analyzing]);

    // Animate score when result arrives
    useEffect(() => {
        if (!result) { setScoreAnimated(0); return; }
        let current = 0;
        const target = result.healthScore;
        const step = Math.max(1, Math.floor(target / 60));
        const interval = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(interval);
            }
            setScoreAnimated(current);
        }, 16);
        return () => clearInterval(interval);
    }, [result]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Por favor, selecione uma imagem do prato.', 'error');
            return;
        }

        setPhotoFile(file);
        if (photoPreview) URL.revokeObjectURL(photoPreview);
        setPhotoPreview(URL.createObjectURL(file));
        setResult(null);
    };

    const handleAnalyze = async () => {
        if (!photoFile) return;
        setAnalyzing(true);
        setAnalyzingMsgIndex(0);
        try {
            const analysisResult = await analyzeMealPhoto(photoFile, userId, userRole);
            setResult(analysisResult);
        } catch (error: any) {
            showToast(error.message || 'Erro ao analisar o prato.', 'error');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleReset = () => {
        setPhotoFile(null);
        if (photoPreview) URL.revokeObjectURL(photoPreview);
        setPhotoPreview(null);
        setResult(null);
        setScoreAnimated(0);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    const getScoreColor = (score: number) => {
        if (score >= 75) return { ring: '#10B981', bg: 'from-emerald-500/20 to-teal-500/20', text: 'text-emerald-400', label: 'Excelente! 🌟' };
        if (score >= 50) return { ring: '#F59E0B', bg: 'from-amber-500/20 to-yellow-500/20', text: 'text-amber-400', label: 'Bom! 👍' };
        if (score >= 25) return { ring: '#F97316', bg: 'from-orange-500/20 to-red-500/20', text: 'text-orange-400', label: 'Pode melhorar 💪' };
        return { ring: '#EF4444', bg: 'from-red-500/20 to-pink-500/20', text: 'text-red-400', label: 'Atenção! ⚠️' };
    };

    if (!isOpen) return null;

    const scoreInfo = result ? getScoreColor(result.healthScore) : null;
    const circumference = 2 * Math.PI * 54;
    const scoreOffset = result ? circumference - (scoreAnimated / 100) * circumference : circumference;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 flex flex-col animate-in fade-in backdrop-blur-sm">
            {/* Header */}
            <div
                className="flex items-center justify-between p-4 border-b border-slate-700/50"
                style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
            >
                <button
                    onClick={result ? handleReset : handleClose}
                    className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">{result ? 'Nova Análise' : 'Voltar'}</span>
                </button>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">🍽️</span> Analisar Prato
                </h2>
                <button
                    onClick={handleClose}
                    className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white border border-slate-700 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-lg mx-auto">

                    {/* ======= UPLOAD STATE ======= */}
                    {!analyzing && !result && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
                            {/* Hero */}
                            <div className="text-center">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500/20 to-pink-500/20 text-orange-300 text-xs font-bold uppercase tracking-wider mb-4 border border-orange-500/30">
                                    <Sparkles className="w-3.5 h-3.5" /> Análise com IA
                                </div>
                                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                                    Tire uma <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-400">foto do prato</span>
                                </h3>
                                <p className="text-slate-400 text-sm max-w-sm mx-auto">
                                    A IA vai identificar todos os alimentos, calcular calorias e macros do seu prato 🍽️
                                </p>
                            </div>

                            {/* Floating Emojis Animation */}
                            <div className="relative h-8 overflow-hidden">
                                <div className="flex gap-4 animate-marquee whitespace-nowrap">
                                    {[...FOOD_EMOJIS, ...FOOD_EMOJIS].map((emoji, i) => (
                                        <span key={i} className="text-2xl opacity-40">{emoji}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Upload Area */}
                            <div className="relative">
                                <label
                                    htmlFor="meal-photo-upload"
                                    className={`group relative flex flex-col items-center justify-center w-full rounded-3xl cursor-pointer transition-all duration-500 overflow-hidden
                    ${photoPreview
                                            ? 'bg-black border border-slate-700 aspect-square max-h-[400px]'
                                            : 'h-64 border-2 border-dashed border-orange-500/40 bg-gradient-to-br from-orange-500/5 to-pink-500/5 hover:from-orange-500/10 hover:to-pink-500/10 hover:border-orange-400/60'
                                        }`}
                                >
                                    {photoPreview ? (
                                        <>
                                            <img src={photoPreview} className="h-full w-full object-cover rounded-3xl" alt="Prato" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center rounded-3xl">
                                                <div className="flex flex-col items-center gap-2 text-white">
                                                    <div className="p-3 bg-white/10 rounded-full backdrop-blur-md border border-white/20">
                                                        <RefreshCw className="w-8 h-8" />
                                                    </div>
                                                    <span className="font-bold text-sm">Trocar Foto</span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center p-6">
                                            <div className="w-20 h-20 bg-gradient-to-br from-orange-500/20 to-pink-500/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-orange-500/30 relative">
                                                <div className="absolute inset-0 rounded-full bg-orange-500/20 animate-ping opacity-0 group-hover:opacity-60"></div>
                                                <Camera className="w-10 h-10 text-orange-400 relative z-10" />
                                            </div>
                                            <p className="text-white font-bold text-lg group-hover:text-orange-200 transition-colors">
                                                📷 Selecionar Foto
                                            </p>
                                            <p className="text-slate-500 text-xs mt-2 text-center max-w-[220px]">
                                                Tire ou selecione uma foto do seu prato de comida
                                            </p>
                                        </div>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        id="meal-photo-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />
                                </label>

                                {photoPreview && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleReset(); }}
                                        className="absolute -top-3 -right-3 p-2 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-500 transition-colors z-10 border-2 border-slate-900"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Feature Badges */}
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { icon: <Flame className="w-4 h-4 text-orange-400" />, label: 'Calorias', color: 'orange' },
                                    { icon: <TrendingUp className="w-4 h-4 text-emerald-400" />, label: 'Macros', color: 'emerald' },
                                    { icon: <Heart className="w-4 h-4 text-pink-400" />, label: 'Score', color: 'pink' },
                                ].map((badge, i) => (
                                    <div key={i} className="flex flex-col items-center p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                                        {badge.icon}
                                        <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">{badge.label}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Analyze Button */}
                            <button
                                disabled={!photoFile}
                                onClick={handleAnalyze}
                                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 group
                  ${photoFile
                                        ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] hover:scale-[1.02] active:scale-[0.98]'
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    }`}
                            >
                                {photoFile ? (
                                    <>
                                        <Sparkles className="w-5 h-5 text-yellow-200 group-hover:animate-spin" />
                                        Analisar Prato com IA
                                    </>
                                ) : (
                                    'Selecione uma foto'
                                )}
                            </button>
                        </div>
                    )}

                    {/* ======= ANALYZING STATE ======= */}
                    {analyzing && (
                        <div className="animate-in fade-in flex flex-col items-center justify-center min-h-[60vh] space-y-8">
                            {/* Photo Preview with Overlay */}
                            {photoPreview && (
                                <div className="relative w-48 h-48 rounded-3xl overflow-hidden shadow-2xl border-2 border-orange-500/30">
                                    <img src={photoPreview} className="w-full h-full object-cover" alt="Prato" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent flex items-end justify-center pb-3">
                                        <span className="text-xs font-bold text-orange-300 flex items-center gap-1">
                                            <Loader2 className="w-3 h-3 animate-spin" /> Analisando...
                                        </span>
                                    </div>
                                    {/* Scanning Line */}
                                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-orange-400 to-transparent animate-scan-line"></div>
                                </div>
                            )}

                            {/* Animated Food Icons Grid */}
                            <div className="grid grid-cols-5 gap-3">
                                {FOOD_EMOJIS.map((emoji, i) => (
                                    <div
                                        key={i}
                                        className="w-12 h-12 bg-slate-800/60 rounded-xl flex items-center justify-center text-2xl border border-slate-700/50 transition-all"
                                        style={{
                                            animation: `pulse 1.5s ease-in-out ${i * 0.15}s infinite`,
                                            opacity: 0.4 + (i % 3) * 0.2
                                        }}
                                    >
                                        {emoji}
                                    </div>
                                ))}
                            </div>

                            {/* Animated Message */}
                            <div className="text-center space-y-2">
                                <p className="text-white font-bold text-lg animate-pulse">
                                    {ANALYZING_MESSAGES[analyzingMsgIndex]}
                                </p>
                                <p className="text-slate-500 text-xs">Isso pode levar alguns segundos...</p>
                            </div>

                            {/* Progress Dots */}
                            <div className="flex gap-2">
                                {[0, 1, 2, 3, 4].map(i => (
                                    <div
                                        key={i}
                                        className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                                        style={{
                                            backgroundColor: i <= Math.floor(analyzingMsgIndex * 5 / ANALYZING_MESSAGES.length) ? '#F97316' : '#334155',
                                            transform: i === Math.floor(analyzingMsgIndex * 5 / ANALYZING_MESSAGES.length) ? 'scale(1.3)' : 'scale(1)'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ======= RESULTS STATE ======= */}
                    {result && !analyzing && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-5">

                            {/* Photo + Score Header */}
                            <div className="relative rounded-3xl overflow-hidden">
                                {photoPreview && (
                                    <img src={photoPreview} className="w-full h-48 object-cover" alt="Prato analisado" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                                    <div className="flex-1 pr-4">
                                        <p className="text-white font-bold text-lg leading-tight">{result.plateDescription}</p>
                                    </div>

                                    {/* Health Score Ring */}
                                    <div className="relative w-24 h-24 flex-shrink-0">
                                        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 120 120">
                                            <circle cx="60" cy="60" r="54" fill="none" stroke="#1E293B" strokeWidth="8" />
                                            <circle
                                                cx="60" cy="60" r="54" fill="none"
                                                stroke={scoreInfo?.ring || '#334155'}
                                                strokeWidth="8"
                                                strokeLinecap="round"
                                                strokeDasharray={circumference}
                                                strokeDashoffset={scoreOffset}
                                                className="transition-all duration-1000 ease-out"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className={`text-2xl font-black ${scoreInfo?.text}`}>{scoreAnimated}</span>
                                            <span className="text-[8px] text-slate-400 uppercase font-bold tracking-wider">score</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Score Label */}
                            <div className={`text-center p-3 rounded-2xl bg-gradient-to-r ${scoreInfo?.bg} border border-slate-700/50`}>
                                <span className={`font-bold text-lg ${scoreInfo?.text}`}>{scoreInfo?.label}</span>
                            </div>

                            {/* Total Calories */}
                            <div className="glass-panel rounded-2xl p-5 border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-red-500/5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl text-white shadow-lg shadow-orange-500/20">
                                            <Flame className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total de Calorias</p>
                                            <p className="text-white text-3xl font-black">{result.totalCalories} <span className="text-lg text-slate-400 font-normal">kcal</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Macro Breakdown */}
                            <div className="glass-panel rounded-2xl p-5 border border-slate-700/50 space-y-4">
                                <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-blue-400" /> Macronutrientes
                                </h4>
                                {[
                                    { label: 'Proteínas', value: result.protein, color: 'bg-red-500', textColor: 'text-red-400', icon: <Beef className="w-4 h-4" />, unit: 'g' },
                                    { label: 'Carboidratos', value: result.carbs, color: 'bg-amber-500', textColor: 'text-amber-400', icon: <Wheat className="w-4 h-4" />, unit: 'g' },
                                    { label: 'Gorduras', value: result.fats, color: 'bg-orange-500', textColor: 'text-orange-400', icon: <Droplets className="w-4 h-4" />, unit: 'g' },
                                    { label: 'Fibras', value: result.fiber, color: 'bg-emerald-500', textColor: 'text-emerald-400', icon: <Leaf className="w-4 h-4" />, unit: 'g' },
                                ].map((macro, i) => {
                                    const totalMacros = result.protein + result.carbs + result.fats + result.fiber;
                                    const percentage = totalMacros > 0 ? Math.round((macro.value / totalMacros) * 100) : 0;
                                    return (
                                        <div key={i} className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={macro.textColor}>{macro.icon}</span>
                                                    <span className="text-slate-300 text-sm font-medium">{macro.label}</span>
                                                </div>
                                                <span className="text-white font-bold text-sm">{macro.value}{macro.unit} <span className="text-slate-500 text-xs">({percentage}%)</span></span>
                                            </div>
                                            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${macro.color} rounded-full transition-all duration-1000 ease-out`}
                                                    style={{
                                                        width: `${percentage}%`,
                                                        transitionDelay: `${i * 150}ms`
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Food Items */}
                            <div className="glass-panel rounded-2xl p-5 border border-slate-700/50 space-y-3">
                                <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                    🍽️ Alimentos Identificados
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {result.foods.map((food, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all hover:scale-105 hover:shadow-lg cursor-default"
                                            style={{
                                                backgroundColor: `${food.color}15`,
                                                borderColor: `${food.color}40`,
                                            }}
                                        >
                                            <div
                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: food.color }}
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-white text-sm font-bold leading-tight">{food.name}</span>
                                                <span className="text-slate-400 text-[10px]">{food.quantity} · {food.calories} kcal</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* AI Tips */}
                            {result.tips && result.tips.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2 px-1">
                                        <Lightbulb className="w-4 h-4 text-yellow-400" /> Dicas da IA
                                    </h4>
                                    {result.tips.map((tip, i) => (
                                        <div
                                            key={i}
                                            className="flex items-start gap-3 p-3.5 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20"
                                        >
                                            <ChevronRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                            <p className="text-slate-300 text-sm leading-relaxed">{tip}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Motivation */}
                            {result.motivation && (
                                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 text-center">
                                    <p className="text-emerald-300 font-bold text-lg">💚 {result.motivation}</p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3 pb-4">
                                <button
                                    onClick={handleReset}
                                    className="flex-1 py-3.5 rounded-2xl font-bold text-base bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:shadow-[0_0_30px_rgba(249,115,22,0.3)] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                >
                                    <Camera className="w-5 h-5" />
                                    Analisar Outro Prato
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MealAnalysis;
