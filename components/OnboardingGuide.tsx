import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Camera, Dumbbell, TrendingUp, BrainCircuit } from 'lucide-react';

interface OnboardingGuideProps {
    onClose: () => void;
}

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onClose }) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides = [
        {
            id: 1,
            title: "Bem-vindo ao FitAI",
            description: "Sua revolução fitness começou. O FitAI combina Inteligência Artificial avançada com ciência esportiva para transformar seu corpo.",
            icon: <BrainCircuit className="w-24 h-24 text-blue-400 transition-all duration-500 hover:scale-110 hover:text-blue-300 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]" />,
            color: "from-blue-500/20 to-indigo-500/20"
        },
        {
            id: 2,
            title: "Análise Biomecânica",
            description: "Use a câmera do seu celular para gravar seus exercícios. Nossa IA analisa sua postura, conta repetições e corrige sua execução em tempo real.",
            icon: <Camera className="w-24 h-24 text-emerald-400 transition-all duration-500 hover:scale-110 hover:rotate-6 hover:text-emerald-300 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />,
            color: "from-emerald-500/20 to-teal-500/20"
        },
        {
            id: 3,
            title: "Planejamento Inteligente",
            description: "Receba treinos e dietas hiper-personalizados baseados em seus objetivos, restrições e equipamentos disponíveis. Tudo gerado instantaneamente.",
            icon: <Dumbbell className="w-24 h-24 text-purple-400 transition-all duration-500 hover:scale-110 hover:-rotate-6 hover:text-purple-300 drop-shadow-[0_0_15px_rgba(192,132,252,0.5)]" />,
            color: "from-purple-500/20 to-fuchsia-500/20"
        },
        {
            id: 4,
            title: "Sua Evolução",
            description: "Acompanhe seu progresso detalhado. O FitAI aprende com você e adapta seus planos conforme você evolui. Prepare-se para sua melhor versão.",
            icon: <TrendingUp className="w-24 h-24 text-amber-400 transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />,
            color: "from-amber-500/20 to-orange-500/20"
        }
    ];

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(curr => curr + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentSlide > 0) {
            setCurrentSlide(curr => curr - 1);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity duration-300">
            <div className="relative w-full max-w-md bg-slate-900/90 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-[500px]">

                {/* Background Gradient Effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${slides[currentSlide].color} transition-colors duration-500`} />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-4 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors z-50 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Content */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center z-10">
                    <div className="mb-8 p-6 bg-white/5 rounded-full ring-1 ring-white/10 shadow-lg backdrop-blur-md">
                        {slides[currentSlide].icon}
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-4">
                        {slides[currentSlide].title}
                    </h2>

                    <p className="text-slate-300 leading-relaxed">
                        {slides[currentSlide].description}
                    </p>
                </div>

                {/* Footer / Navigation */}
                <div className="p-6 z-10 bg-slate-900/50 backdrop-blur-md border-t border-white/5">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex gap-2">
                            {slides.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-8 bg-blue-500' : 'w-2 bg-slate-600'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {currentSlide > 0 && (
                            <button
                                onClick={handlePrev}
                                className="px-4 py-3 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}

                        <button
                            onClick={handleNext}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/25 transition-all active:scale-95"
                        >
                            {currentSlide === slides.length - 1 ? (
                                <>Começar Agora <TrendingUp className="w-5 h-5" /></>
                            ) : (
                                <>Próximo <ChevronRight className="w-5 h-5" /></>
                            )}
                        </button>
                    </div>

                    {currentSlide < slides.length - 1 && (
                        <button
                            onClick={onClose}
                            className="w-full mt-4 text-xs text-slate-500 hover:text-slate-300 transition-colors uppercase font-medium tracking-wider"
                        >
                            Pular Introdução
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
};
