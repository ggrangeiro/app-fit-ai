import React, { useState, useEffect } from 'react';
import { AppStep, ExerciseType, AnalysisResult, User } from './types';
import { analyzeVideo } from './services/geminiService';
import { compressVideo } from './utils/videoUtils';
import { MockDataService } from './services/mockDataService';
import ExerciseCard from './components/ExerciseCard';
import ResultView from './components/ResultView';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import { Video, UploadCloud, Loader2, ArrowRight, Lightbulb, Sparkles, Camera, Smartphone, Zap, LogOut, User as UserIcon, ScanLine, Image as ImageIcon, Scale, Activity } from 'lucide-react';

// ============================================================================
// PARA TROCAR AS FOTOS DOS CARDS:
// Altere as URLs abaixo. Você pode usar links do Unsplash, Imgur, ou S3.
// ============================================================================
const DEFAULT_EXERCISE_IMAGES: Record<ExerciseType, string> = {
  // Original Exercises
  [ExerciseType.SQUAT]: "https://images.unsplash.com/photo-1434682881908-b43d0467b798?q=80&w=800&auto=format&fit=crop",
  [ExerciseType.PUSHUP]: "https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=600&auto=format&fit=crop",
  [ExerciseType.LUNGE]: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=600&auto=format&fit=crop",
  [ExerciseType.BURPEE]: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=600&auto=format&fit=crop", 
  [ExerciseType.PLANK]: "https://images.unsplash.com/photo-1434682881908-b43d0467b798?q=80&w=800&auto=format&fit=crop",
  
  // Previous Batch - Updated as requested
  [ExerciseType.JUMPING_JACK]: "https://images.unsplash.com/photo-1522898467493-49726bf28798?q=80&w=800&auto=format&fit=crop",
  [ExerciseType.MOUNTAIN_CLIMBER]: "https://images.unsplash.com/photo-1522898467493-49726bf28798?q=80&w=800&auto=format&fit=crop",
  [ExerciseType.CRUNCH]: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800&auto=format&fit=crop",
  [ExerciseType.PULLUP]: "https://images.unsplash.com/photo-1522898467493-49726bf28798?q=80&w=800&auto=format&fit=crop",
  [ExerciseType.BRIDGE]: "https://images.unsplash.com/photo-1574680178050-55c6a6a96e0a?q=80&w=800&auto=format&fit=crop",

  // New Exercises (Latest Batch) - Updated as requested
  [ExerciseType.BULGARIAN_SQUAT]: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop",
  [ExerciseType.DEADLIFT]: "https://images.unsplash.com/photo-1522898467493-49726bf28798?q=80&w=800&auto=format&fit=crop",
  [ExerciseType.TRICEP_DIP]: "https://images.unsplash.com/photo-1522898467493-49726bf28798?q=80&w=800&auto=format&fit=crop",
  [ExerciseType.BICEP_CURL]: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop",
  [ExerciseType.CABLE_CROSSOVER]: "https://images.unsplash.com/photo-1534367507873-d2d7e24c797f?q=80&w=800&auto=format&fit=crop",

  // Special
  [ExerciseType.POSTURE_ANALYSIS]: "https://images.unsplash.com/photo-1544367563-12123d8959eb?q=80&w=800&auto=format&fit=crop",
  [ExerciseType.BODY_COMPOSITION]: "https://images.unsplash.com/photo-1518310383802-640c2de311b2?q=80&w=800&auto=format&fit=crop"
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
  ],
  [ExerciseType.JUMPING_JACK]: [
    "Coordene a abertura dos braços e pernas simultaneamente.",
    "Pouse suavemente na ponta dos pés para reduzir o impacto.",
    "Mantenha os joelhos levemente flexionados na aterrissagem.",
    "Toque as mãos acima da cabeça para amplitude completa."
  ],
  [ExerciseType.MOUNTAIN_CLIMBER]: [
    "Mantenha o quadril baixo e alinhado com os ombros.",
    "Traga o joelho em direção ao peito alternadamente.",
    "Mantenha os ombros firmes sobre os punhos.",
    "Contraia o abdômen para estabilizar o tronco."
  ],
  [ExerciseType.CRUNCH]: [
    "Mantenha a lombar colada no chão durante todo o movimento.",
    "Olhe para o teto para não tensionar o pescoço.",
    "Concentre a força no abdômen, não no impulso dos braços.",
    "Solte o ar ao subir e inspire ao descer."
  ],
  [ExerciseType.PULLUP]: [
    "Inicie o movimento ativando as escápulas (costas).",
    "Passe o queixo da linha da barra.",
    "Desça controladamente até estender os braços.",
    "Evite balançar o corpo (kipping) se o foco for força."
  ],
  [ExerciseType.BRIDGE]: [
    "Empurre o chão com os calcanhares para subir.",
    "Contraia forte os glúteos no topo do movimento.",
    "Evite arquear excessivamente a lombar.",
    "Mantenha os joelhos alinhados, não deixe abrir ou fechar."
  ],
  [ExerciseType.BULGARIAN_SQUAT]: [
    "Apoie o peito do pé no banco atrás de você.",
    "Mantenha o tronco levemente inclinado para frente.",
    "Desça até o joelho de trás quase tocar o chão.",
    "A força principal deve estar na perna da frente."
  ],
  [ExerciseType.DEADLIFT]: [
    "Mantenha a barra colada nas pernas durante todo o movimento.",
    "Coluna neutra sempre! Não curve as costas.",
    "O movimento é de quadril (hinge), não agachamento.",
    "Estufe o peito e trave as escápulas antes de puxar."
  ],
  [ExerciseType.TRICEP_DIP]: [
    "Mantenha os cotovelos apontados para trás, não abra.",
    "Desça até os cotovelos formarem 90 graus.",
    "Mantenha os ombros longe das orelhas (depressão escapular).",
    "Mantenha o quadril próximo ao banco/caixa."
  ],
  [ExerciseType.BICEP_CURL]: [
    "Mantenha os cotovelos fixos ao lado do corpo.",
    "Não balance o tronco para impulsionar o peso.",
    "Controle a descida (fase excêntrica).",
    "Estenda o braço quase totalmente embaixo."
  ],
  [ExerciseType.CABLE_CROSSOVER]: [
    "Mantenha os cotovelos levemente flexionados durante todo o arco.",
    "Concentre a força no peitoral, imagine que está abraçando uma árvore.",
    "Não deixe os ombros subirem em direção às orelhas.",
    "Controle a fase excêntrica (volta), não deixe o peso despencar."
  ],
  [ExerciseType.POSTURE_ANALYSIS]: [
    "Fique parado em uma posição natural e relaxada.",
    "Tente mostrar o corpo inteiro (da cabeça aos pés).",
    "Use roupas que permitam ver o contorno do corpo.",
    "Tire uma foto (frente/lado) ou grave um vídeo curto."
  ],
  [ExerciseType.BODY_COMPOSITION]: [
    "Use roupas de banho ou justas para melhor precisão.",
    "Tire fotos de frente, lado e costas em local iluminado.",
    "Não contraia o abdômen, mantenha a pose natural.",
    "A análise visual é uma estimativa e não substitui exame clínico."
  ]
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [step, setStep] = useState<AppStep>(AppStep.LOGIN);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  
  // Custom Images State
  const [exerciseImages, setExerciseImages] = useState<Record<string, string>>(DEFAULT_EXERCISE_IMAGES);

  // Initial Auth Check and Image Load
  useEffect(() => {
    const user = MockDataService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setStep(user.role === 'admin' ? AppStep.ADMIN_DASHBOARD : AppStep.SELECT_EXERCISE);
    }
    loadCustomImages();
  }, []);

  const loadCustomImages = () => {
    const customImages = MockDataService.getExerciseImages();
    if (Object.keys(customImages).length > 0) {
      setExerciseImages({ ...DEFAULT_EXERCISE_IMAGES, ...customImages });
    }
  };

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

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setStep(user.role === 'admin' ? AppStep.ADMIN_DASHBOARD : AppStep.SELECT_EXERCISE);
  };

  const handleLogout = () => {
    MockDataService.logout();
    setCurrentUser(null);
    setStep(AppStep.LOGIN);
    resetAnalysis();
  };

  const resetAnalysis = () => {
    setSelectedExercise(null);
    setMediaFile(null);
    setMediaPreview(null);
    setAnalysisResult(null);
    setError(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (!isVideo && !isImage) {
        setError("Formato de arquivo inválido. Por favor envie vídeo ou imagem.");
        return;
      }

      if (isVideo && file.size > 200 * 1024 * 1024) { 
        setError("O vídeo é muito grande (>200MB). Por favor grave um vídeo mais curto.");
        return;
      }
      
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleAnalysis = async () => {
    if (!mediaFile || !selectedExercise || !currentUser) return;

    try {
      let finalFile = mediaFile;
      const isVideo = mediaFile.type.startsWith('video/');

      // Only compress videos, and only if they are somewhat large
      if (isVideo && mediaFile.size > 20 * 1024 * 1024) {
         setStep(AppStep.COMPRESSING);
         try {
           finalFile = await compressVideo(mediaFile);
         } catch (compressError: any) {
           console.error("Compression failed:", compressError);
           setError(compressError.message || "Falha ao otimizar o vídeo. Tente um arquivo menor.");
           setStep(AppStep.UPLOAD_VIDEO);
           return;
         }
      }

      setStep(AppStep.ANALYZING);
      setCurrentTipIndex(0); 
      
      const result = await analyzeVideo(finalFile, selectedExercise);
      setAnalysisResult(result);
      
      // Save result immediately when analysis is done
      MockDataService.saveResult(currentUser.id, currentUser.name, selectedExercise, result);
      
      setStep(AppStep.RESULTS);

    } catch (err: any) {
      console.error(err);
      setError("Ocorreu um erro ao processar o arquivo. Tente novamente.");
      setStep(AppStep.UPLOAD_VIDEO);
    }
  };

  const resetApp = () => {
    setStep(AppStep.SELECT_EXERCISE);
    resetAnalysis();
  };

  // --- RENDER ---

  if (step === AppStep.LOGIN) {
    return <Login onLogin={handleLogin} />;
  }

  // Get visible exercises based on permissions
  const availableExercises = Object.values(ExerciseType).filter(ex => {
    if (!currentUser || currentUser.role === 'admin') return true; // Admins see all for demo
    if (currentUser.assignedExercises && currentUser.assignedExercises.length > 0) {
      return currentUser.assignedExercises.includes(ex);
    }
    return false; // User has no exercises
  });

  // Separate Special Analysis from grid exercises for manual placement
  const specialExercises = [ExerciseType.POSTURE_ANALYSIS, ExerciseType.BODY_COMPOSITION];
  const gridExercises = availableExercises.filter(ex => !specialExercises.includes(ex));

  // Helper to determine accepted file types based on mode
  const isSpecialMode = selectedExercise && specialExercises.includes(selectedExercise);
  const acceptedFileTypes = isSpecialMode ? "video/*,image/*" : "video/*";

  return (
    <div className="min-h-screen flex flex-col font-[Plus Jakarta Sans]">
      
      {/* Header (Authenticated) */}
      <header className="sticky top-0 z-50 glass-panel border-b-0 border-b-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-default">
            <div className="p-2 bg-blue-600 rounded-lg group-hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20">
              <Video className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white hidden md:block">FitAI <span className="text-blue-400 font-light">Analyzer</span></h1>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 text-right">
                <div className="hidden md:block">
                  <p className="text-sm font-bold text-white">{currentUser?.name}</p>
                  <p className="text-xs text-slate-400 capitalize">{currentUser?.role === 'admin' ? 'Administrador' : 'Aluno'}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 border border-slate-600">
                  <UserIcon className="w-5 h-5" />
                </div>
             </div>
             
             <div className="h-8 w-px bg-slate-700 mx-2 hidden md:block"></div>

             <button 
                onClick={handleLogout}
                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Sair"
             >
               <LogOut className="w-5 h-5" />
             </button>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-4 md:p-8">
        
        {/* VIEW: ADMIN DASHBOARD */}
        {step === AppStep.ADMIN_DASHBOARD && currentUser?.role === 'admin' && (
          <AdminDashboard currentUser={currentUser} onRefreshData={loadCustomImages} />
        )}

        {/* VIEW: EXERCISE SELECTION (User) */}
        {step === AppStep.SELECT_EXERCISE && (
          <div className="w-full max-w-6xl animate-fade-in flex flex-col items-center">
            <div className="text-center mb-8 max-w-2xl mt-4 md:mt-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4 border border-blue-500/20">
                <Sparkles className="w-3 h-3" /> Sua Área de Treino
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                Olá, {currentUser?.name.split(' ')[0]}! <br/> 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                  O que vamos fazer hoje?
                </span>
              </h2>
            </div>
            
            {/* Quick Actions / Mode Selection */}
            {availableExercises.length > 0 && (
              <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {/* Left Column: Workout Mode */}
                <button 
                  className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-4 group hover:bg-blue-600/20 transition-all border-dashed border-2 border-slate-700 hover:border-blue-500/50 relative overflow-hidden h-full min-h-[160px]"
                  onClick={() => {
                    const el = document.getElementById('exercise-grid');
                    if(el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                   <div className="p-4 bg-blue-600 rounded-full text-white shadow-lg shadow-blue-900/30 group-hover:scale-110 transition-transform relative z-10">
                      <Video className="w-8 h-8" />
                   </div>
                   <div className="text-center relative z-10">
                      <h3 className="text-white font-bold text-xl group-hover:text-blue-200 transition-colors">Gravar Treino</h3>
                      <p className="text-slate-400 text-sm">Contagem e correção de exercícios</p>
                   </div>
                </button>

                {/* Right Column: Analysis Modes (Stacked) */}
                <div className="flex flex-col gap-3">
                  {/* 1. Posture Analysis */}
                  {availableExercises.includes(ExerciseType.POSTURE_ANALYSIS) && (
                     <button 
                      className="glass-panel p-5 rounded-2xl flex items-center justify-start gap-4 group hover:bg-emerald-600/20 transition-all border-2 border-emerald-500/30 hover:border-emerald-500 relative overflow-hidden flex-1"
                      onClick={() => {
                          setSelectedExercise(ExerciseType.POSTURE_ANALYSIS);
                          setStep(AppStep.UPLOAD_VIDEO);
                      }}
                    >
                       <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       <div className="p-3 bg-emerald-600 rounded-full text-white shadow-lg shadow-emerald-900/30 group-hover:scale-110 transition-transform relative z-10 shrink-0">
                          <ScanLine className="w-5 h-5" />
                       </div>
                       <div className="text-left relative z-10">
                          <h3 className="text-white font-bold text-lg group-hover:text-emerald-200 transition-colors">Analisar Postura</h3>
                          <p className="text-slate-400 text-xs">Biofeedback Postural (Foto/Vídeo)</p>
                       </div>
                    </button>
                  )}

                  {/* 2. Body Composition Analysis (New) */}
                  {availableExercises.includes(ExerciseType.BODY_COMPOSITION) && (
                     <button 
                      className="glass-panel p-5 rounded-2xl flex items-center justify-start gap-4 group hover:bg-violet-600/20 transition-all border-2 border-violet-500/30 hover:border-violet-500 relative overflow-hidden flex-1"
                      onClick={() => {
                          setSelectedExercise(ExerciseType.BODY_COMPOSITION);
                          setStep(AppStep.UPLOAD_VIDEO);
                      }}
                    >
                       <div className="absolute inset-0 bg-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       <div className="p-3 bg-violet-600 rounded-full text-white shadow-lg shadow-violet-900/30 group-hover:scale-110 transition-transform relative z-10 shrink-0">
                          <Scale className="w-5 h-5" />
                       </div>
                       <div className="text-left relative z-10">
                          <h3 className="text-white font-bold text-lg group-hover:text-violet-200 transition-colors">Análise Corporal</h3>
                          <p className="text-slate-400 text-xs">Estética, Biotipo & % Gordura</p>
                       </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {gridExercises.length === 0 ? (
              <div className="w-full max-w-md bg-slate-800/50 p-8 rounded-3xl text-center border border-slate-700">
                <p className="text-slate-300 mb-2">Você ainda não possui exercícios atribuídos.</p>
                <p className="text-sm text-slate-500">Peça ao seu treinador para atualizar sua ficha.</p>
              </div>
            ) : (
              <div id="exercise-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 w-full mb-12">
                {gridExercises.map((type) => (
                  <ExerciseCard
                    key={type}
                    type={type}
                    imageUrl={exerciseImages[type] || DEFAULT_EXERCISE_IMAGES[type]}
                    selected={selectedExercise === type}
                    onClick={() => setSelectedExercise(type)}
                  />
                ))}
              </div>
            )}

            {gridExercises.length > 0 && (
              <button
                disabled={!selectedExercise}
                onClick={() => setStep(AppStep.UPLOAD_VIDEO)}
                className={`
                  w-full md:w-auto group flex items-center justify-center gap-3 px-10 py-5 rounded-full text-lg font-bold transition-all duration-300 sticky bottom-8 z-40 shadow-2xl
                  ${selectedExercise 
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/40 transform hover:-translate-y-1' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 opacity-0 pointer-events-none'}
                `}
              >
                Continuar para Gravação
                <ArrowRight className={`w-5 h-5 transition-transform ${selectedExercise ? 'group-hover:translate-x-1' : ''}`} />
              </button>
            )}
          </div>
        )}

        {/* VIEW: UPLOAD VIDEO */}
        {step === AppStep.UPLOAD_VIDEO && (
          <div className="w-full max-w-3xl animate-fade-in">
            <div className="glass-panel rounded-3xl p-6 md:p-12 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Registro de Execução</h2>
                <p className="text-slate-400 text-sm md:text-base">
                  Grave ou envie {isSpecialMode ? "uma foto ou vídeo" : "um vídeo"} de: <br className="md:hidden"/>
                  <span className="text-blue-400 font-semibold">{selectedExercise}</span>
                </p>
              </div>
              
              <div className="flex flex-col gap-4 mb-8">
                {/* 1. Mobile-First Camera Button */}
                {!mediaFile && (
                  <label 
                    htmlFor="camera-upload"
                    className="w-full py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl flex items-center justify-center gap-3 cursor-pointer shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all border border-blue-400/20"
                  >
                    <div className="bg-white/20 p-2 rounded-full">
                      {isSpecialMode ? <ImageIcon className="w-6 h-6 text-white" /> : <Camera className="w-6 h-6 text-white" />}
                    </div>
                    <span className="text-white font-bold text-lg">{isSpecialMode ? 'Tirar Foto ou Gravar' : 'Gravar Agora'}</span>
                    <input 
                      id="camera-upload" 
                      type="file" 
                      accept={acceptedFileTypes}
                      // For special modes, we default to standard file picker to allow selfie cam switch etc easily
                      capture={isSpecialMode ? undefined : "user"} 
                      className="hidden" 
                      onChange={handleFileChange} 
                    />
                  </label>
                )}

                {/* 2. Drag & Drop */}
                <label 
                  htmlFor="video-upload" 
                  className={`
                    group relative flex flex-col items-center justify-center w-full rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden
                    ${mediaFile 
                      ? 'bg-black border border-slate-700 h-auto aspect-video' 
                      : 'h-48 md:h-64 border-2 border-dashed border-slate-600 bg-slate-800/30 hover:bg-slate-800 hover:border-blue-500'}
                  `}
                >
                  {mediaPreview ? (
                    // Logic to render Image or Video tag
                    mediaFile?.type.startsWith('image/') ? (
                      <img 
                        src={mediaPreview} 
                        className="h-full w-full object-contain" 
                        alt="Preview"
                      />
                    ) : (
                      <video 
                        src={mediaPreview} 
                        className="h-full w-full object-contain" 
                        controls={false} 
                        autoPlay 
                        muted 
                        loop 
                        playsInline
                      />
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                      <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                        <UploadCloud className="w-6 h-6 text-slate-300 group-hover:text-blue-400" />
                      </div>
                      <p className="text-slate-200 font-medium">Escolher da Galeria</p>
                      <p className="text-slate-500 text-xs mt-1">{isSpecialMode ? "Fotos ou Vídeos" : "Apenas Vídeos"}</p>
                    </div>
                  )}
                  <input 
                    id="video-upload" 
                    type="file" 
                    accept={acceptedFileTypes}
                    className="hidden" 
                    onChange={handleFileChange} 
                  />
                  
                  {mediaFile && (
                     <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                      <span className="bg-white/10 backdrop-blur px-4 py-2 rounded-full text-white font-medium border border-white/20 flex items-center gap-2">
                        <Smartphone className="w-4 h-4" /> Alterar arquivo
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
                  disabled={!mediaFile}
                  onClick={handleAnalysis}
                  className={`
                    flex-1 px-8 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 text-lg
                    ${mediaFile
                      ? 'bg-white text-blue-900 hover:bg-slate-100 shadow-lg transform hover:-translate-y-0.5' 
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}
                  `}
                >
                  {mediaFile ? <Sparkles className="w-5 h-5 text-blue-600" /> : null}
                  {selectedExercise === ExerciseType.POSTURE_ANALYSIS 
                    ? 'Analisar Postura' 
                    : (selectedExercise === ExerciseType.BODY_COMPOSITION ? 'Analisar Composição' : 'Analisar Movimento')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: ANALYSIS & COMPRESSION */}
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
                    Reduzindo o tamanho do arquivo para upload...
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

        {/* VIEW: RESULTS */}
        {step === AppStep.RESULTS && analysisResult && selectedExercise && (
          <ResultView 
            result={analysisResult} 
            exercise={selectedExercise} 
            onReset={resetApp}
            onSave={() => { /* Auto-save handled in logic, this is mostly for UI flow */ }}
          />
        )}

      </main>
    </div>
  );
};

export default App;