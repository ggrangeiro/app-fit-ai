import React, { useState, useEffect } from 'react';
import { AppStep, ExerciseType, AnalysisResult } from './types';
import { analyzeVideo } from './services/geminiService';
import { compressVideo } from './utils/videoUtils';
import ExerciseCard from './components/ExerciseCard';
import ResultView from './components/ResultView';
import { Video, UploadCloud, Loader2, ArrowRight, Lightbulb, Sparkles, Camera, Smartphone, Zap } from 'lucide-react';

const EXERCISE_IMAGES: Record<ExerciseType, string> = {
  [ExerciseType.SQUAT]: "https://images.unsplash.com/photo-1574680096141-1cddd32e04ca?q=80&w=600&auto=format&fit=crop",
  [ExerciseType.PUSHUP]: "https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=600&auto=format&fit=crop",
  [ExerciseType.LUNGE]: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=600&auto=format&fit=crop",
  [ExerciseType.BURPEE]: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=600&auto=format&fit=crop", 
  [ExerciseType.PLANK]: "https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?q=80&w=600&auto=format&fit=crop"
};

const EXERCISE_TIPS: Record<ExerciseType, string[]> = {
  [ExerciseType.SQUAT]: [
    "Mantenha os calcanhares firmes no chão durante todo o movimento.",
    "Mantenha o peito estufado e a coluna neutra.",
    "Os joelhos devem seguir a direção da ponta dos pés.",
    "Desça até que suas coxas estejam pelo menos paralelas ao chão."
  ],
  [ExerciseType.PUSHUP]: [
    "Mantenha o corpo em linha reta, contraindo glúteos e abdômen.",
    "Os cotovelos devem apontar para trás, não para os lados (formato de seta).",
    "Desça até o peito quase tocar o chão.",
    "Evite deixar o quadril cair ou subir demais."
  ],
  [ExerciseType.LUNGE]: [
    "O joelho da frente não deve passar muito da ponta do pé.",
    "Mantenha o tronco vertical, não incline para frente.",
    "O joelho de trás deve quase tocar o chão.",
    "Concentre a força na perna da frente para subir."
  ],
  [ExerciseType.BURPEE]: [
    "Amorteça a queda ao entrar na posição de flexão.",
    "Mantenha o core ativado para proteger a lombar.",
    "Estenda completamente o corpo durante o salto final.",
    "Tente manter um ritmo constante na respiração."
  ],
  [ExerciseType.PLANK]: [
    "Alinhe cotovelos diretamente abaixo dos ombros.",
    "Contraia fortemente o abdômen e os glúteos.",
    "Não prenda a respiração, mantenha o fluxo constante.",
    "Mantenha o pescoço neutro, olhando para o chão."
  ]
};

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.SELECT_EXERCISE);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Rotate tips while analyzing
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (step === AppStep.ANALYZING || step === AppStep.COMPRESSING) {
      interval = setInterval(() => {
        setCurrentTipIndex((prev) => {
          if (!selectedExercise) return 0;
          const totalTips = EXERCISE_TIPS[selectedExercise].length;
          return (prev + 1) % totalTips;
        });
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [step, selectedExercise]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Soft limit for immediate feedback, but we will allow processing
      if (file.size > 200 * 1024 * 1024) { 
        setError("O vídeo é muito grande (>200MB). Por favor grave um vídeo mais curto.");
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleAnalysis = async () => {
    if (!videoFile || !selectedExercise) return;

    try {
      let finalFile = videoFile;

      // Automatic Compression Logic
      if (videoFile.size > 20 * 1024 * 1024) {
         setStep(AppStep.COMPRESSING);
         try {
           finalFile = await compressVideo(videoFile);
         } catch (compressError: any) {
           console.error("Compression failed:", compressError);
           setError(compressError.message || "Falha ao otimizar o vídeo. Tente um vídeo menor.");
           setStep(AppStep.UPLOAD_VIDEO);
           return;
         }
      }

      setStep(AppStep.ANALYZING);
      setCurrentTipIndex(0); 
      
      const result = await analyzeVideo(finalFile, selectedExercise);
      setAnalysisResult(result);
      setStep(AppStep.RESULTS);

    } catch (err: any) {
      console.error(err);
      setError("Ocorreu um erro ao processar o vídeo. Tente novamente.");
      setStep(AppStep.UPLOAD_VIDEO);
    }
  };

  const resetApp = () => {
    setStep(AppStep.SELECT_EXERCISE);
    setSelectedExercise(null);
    setVideoFile(null);
    setVideoPreview(null);
    setAnalysisResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col font-[Plus Jakarta Sans]">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 glass-panel border-b-0 border-b-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-default">
            <div className="p-2 bg-blue-600 rounded-lg group-hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20">
              <Video className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">FitAI <span className="text-blue-400 font-light">Analyzer</span></h1>
          </div>
          {step !== AppStep.SELECT_EXERCISE && (
            <button 
              onClick={resetApp} 
              className="px-4 py-2 rounded-full text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all"
            >
              Novo
            </button>
          )}
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-4 md:p-8">
        
        {/* Step 1: Select Exercise */}
        {step === AppStep.SELECT_EXERCISE && (
          <div className="w-full max-w-6xl animate-fade-in flex flex-col items-center">
            <div className="text-center mb-10 max-w-2xl mt-4 md:mt-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4 border border-blue-500/20">
                <Sparkles className="w-3 h-3" /> Inteligência Artificial
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                Eleve seu treino com <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Análise Profissional</span>
              </h2>
              <p className="text-slate-400 text-lg">
                Escolha um exercício e grave sua execução. Nossa IA corrigirá sua postura instantaneamente.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 w-full mb-12">
              {Object.values(ExerciseType).map((type) => (
                <ExerciseCard
                  key={type}
                  type={type}
                  imageUrl={EXERCISE_IMAGES[type]}
                  selected={selectedExercise === type}
                  onClick={() => setSelectedExercise(type)}
                />
              ))}
            </div>

            <button
              disabled={!selectedExercise}
              onClick={() => setStep(AppStep.UPLOAD_VIDEO)}
              className={`
                w-full md:w-auto group flex items-center justify-center gap-3 px-10 py-5 rounded-full text-lg font-bold transition-all duration-300
                ${selectedExercise 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 transform hover:-translate-y-1' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}
              `}
            >
              Continuar
              <ArrowRight className={`w-5 h-5 transition-transform ${selectedExercise ? 'group-hover:translate-x-1' : ''}`} />
            </button>
          </div>
        )}

        {/* Step 2: Upload Video (Mobile Optimized) */}
        {step === AppStep.UPLOAD_VIDEO && (
          <div className="w-full max-w-3xl animate-fade-in">
            <div className="glass-panel rounded-3xl p-6 md:p-12 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Vamos ver esse movimento</h2>
                <p className="text-slate-400 text-sm md:text-base">Grave ou envie um vídeo fazendo: <br className="md:hidden"/><span className="text-blue-400 font-semibold">{selectedExercise}</span></p>
              </div>
              
              <div className="flex flex-col gap-4 mb-8">
                
                {/* 1. Mobile-First Camera Button */}
                {!videoFile && (
                  <label 
                    htmlFor="camera-upload"
                    className="w-full py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl flex items-center justify-center gap-3 cursor-pointer shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all border border-blue-400/20"
                  >
                    <div className="bg-white/20 p-2 rounded-full">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-white font-bold text-lg">Gravar Agora</span>
                    <input 
                      id="camera-upload" 
                      type="file" 
                      accept="video/*" 
                      capture="environment"
                      className="hidden" 
                      onChange={handleFileChange} 
                    />
                  </label>
                )}

                {/* 2. Drag & Drop / Gallery Area */}
                <label 
                  htmlFor="video-upload" 
                  className={`
                    group relative flex flex-col items-center justify-center w-full rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden
                    ${videoFile 
                      ? 'bg-black border border-slate-700 h-auto aspect-video' 
                      : 'h-48 md:h-64 border-2 border-dashed border-slate-600 bg-slate-800/30 hover:bg-slate-800 hover:border-blue-500'}
                  `}
                >
                  {videoPreview ? (
                    <video 
                      src={videoPreview} 
                      className="h-full w-full object-contain" 
                      controls={false} 
                      autoPlay 
                      muted 
                      loop 
                      playsInline
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                      <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                        <UploadCloud className="w-6 h-6 text-slate-300 group-hover:text-blue-400" />
                      </div>
                      <p className="text-slate-200 font-medium">Escolher da Galeria</p>
                    </div>
                  )}
                  <input 
                    id="video-upload" 
                    type="file" 
                    accept="video/*" 
                    className="hidden" 
                    onChange={handleFileChange} 
                  />
                  
                  {videoFile && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                      <span className="bg-white/10 backdrop-blur px-4 py-2 rounded-full text-white font-medium border border-white/20 flex items-center gap-2">
                        <Smartphone className="w-4 h-4" /> Alterar vídeo
                      </span>
                    </div>
                  )}
                </label>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-center text-sm flex items-center justify-center gap-2">
                   ⚠️ {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setStep(AppStep.SELECT_EXERCISE)}
                  className="px-6 py-4 rounded-xl font-semibold bg-transparent border border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white transition-all w-full sm:w-auto"
                >
                  Voltar
                </button>
                <button
                  disabled={!videoFile}
                  onClick={handleAnalysis}
                  className={`
                    flex-1 px-8 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 text-lg
                    ${videoFile
                      ? 'bg-white text-blue-900 hover:bg-slate-100 shadow-lg transform hover:-translate-y-0.5' 
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}
                  `}
                >
                  {videoFile ? <Sparkles className="w-5 h-5 text-blue-600" /> : null}
                  Analisar Movimento
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Compressing & Analyzing */}
        {(step === AppStep.ANALYZING || step === AppStep.COMPRESSING) && (
          <div className="text-center animate-fade-in w-full max-w-2xl mx-auto px-4">
            <div className="relative inline-flex items-center justify-center mb-12">
              <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 blur-2xl animate-pulse"></div>
              <div className="relative bg-slate-900/80 rounded-full p-8 md:p-10 border border-blue-500/30 shadow-2xl shadow-blue-500/20">
                <Loader2 className="w-16 h-16 md:w-20 md:h-20 text-blue-400 animate-spin" />
              </div>
            </div>
            
            {step === AppStep.COMPRESSING ? (
              <>
                 <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                   <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400" /> Otimizando Vídeo
                 </h2>
                 <p className="text-slate-400 text-sm md:text-base mb-10 max-w-md mx-auto">
                    Reduzindo o tamanho do arquivo para análise rápida...
                 </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">Analisando Biomecânica</h2>
                <p className="text-slate-400 text-base md:text-lg mb-10 max-w-md mx-auto">
                  Nossa IA está calculando os ângulos das suas articulações e a qualidade do movimento.
                </p>
              </>
            )}
            
            {selectedExercise && (
              <div className="glass-panel rounded-2xl p-6 md:p-8 relative overflow-hidden transition-all duration-700 hover:shadow-2xl hover:shadow-blue-900/10 text-left md:text-center">
                 <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-indigo-500"></div>
                 
                 <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                      <Lightbulb className="w-5 h-5" />
                    </div>
                    <span className="text-blue-300 font-semibold uppercase text-xs tracking-widest">
                       Dica Técnica
                    </span>
                 </div>
                 
                 <div className="min-h-[60px] md:min-h-[80px] flex items-center justify-start md:justify-center">
                   <p className="text-white text-lg md:text-2xl font-medium leading-relaxed animate-fade-in key={currentTipIndex}">
                      "{EXERCISE_TIPS[selectedExercise][currentTipIndex]}"
                   </p>
                 </div>
                 
                 <div className="flex justify-start md:justify-center gap-2 mt-6">
                    {EXERCISE_TIPS[selectedExercise].map((_, idx) => (
                      <div 
                        key={idx} 
                        className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentTipIndex ? 'w-8 bg-blue-500' : 'w-2 bg-slate-700'}`}
                      />
                    ))}
                 </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Results */}
        {step === AppStep.RESULTS && analysisResult && selectedExercise && (
          <ResultView 
            result={analysisResult} 
            exercise={selectedExercise} 
            onReset={resetApp} 
          />
        )}

      </main>
    </div>
  );
};

export default App;