import React, { useState, useEffect } from 'react';
import { AppStep, ExerciseType, AnalysisResult, User } from './types';
import { analyzeVideo } from './services/geminiService';
import { compressVideo } from './utils/videoUtils';
import { MockDataService } from './services/mockDataService';
import ExerciseCard from './components/ExerciseCard';
import ResultView from './components/ResultView';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import { Video, UploadCloud, Loader2, ArrowRight, Lightbulb, Sparkles, Camera, Smartphone, Zap, LogOut, User as UserIcon } from 'lucide-react';

const DEFAULT_EXERCISE_IMAGES: Record<ExerciseType, string> = {
  // Updated with a reliable working URL (Dynamic athletic movement)
  [ExerciseType.SQUAT]: "https://images.unsplash.com/photo-1434682881908-b43d0467b798?q=80&w=800&auto=format&fit=crop",
  [ExerciseType.PUSHUP]: "https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=600&auto=format&fit=crop",
  [ExerciseType.LUNGE]: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=600&auto=format&fit=crop",
  [ExerciseType.BURPEE]: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=600&auto=format&fit=crop", 
  // Updated Plank image to a very stable URL (man doing plank/pushup position)
  [ExerciseType.PLANK]: "https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?q=80&w=800&auto=format&fit=crop"
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [step, setStep] = useState<AppStep>(AppStep.LOGIN);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
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
    setVideoFile(null);
    setVideoPreview(null);
    setAnalysisResult(null);
    setError(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
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
    if (!videoFile || !selectedExercise || !currentUser) return;

    try {
      let finalFile = videoFile;

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
      
      // Save result immediately when analysis is done
      MockDataService.saveResult(currentUser.id, currentUser.name, selectedExercise, result);
      
      setStep(AppStep.RESULTS);

    } catch (err: any) {
      console.error(err);
      setError("Ocorreu um erro ao processar o vídeo. Tente novamente.");
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
    if (!currentUser || currentUser.role === 'admin') return true; // Admins see all for demo (or none if they don't do exercises)
    if (currentUser.assignedExercises && currentUser.assignedExercises.length > 0) {
      return currentUser.assignedExercises.includes(ex);
    }
    return false; // User has no exercises
  });

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
            <div className="text-center mb-10 max-w-2xl mt-4 md:mt-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4 border border-blue-500/20">
                <Sparkles className="w-3 h-3" /> Sua Ficha de Treino
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                Olá, {currentUser?.name.split(' ')[0]}! <br/> 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                  Qual o treino de hoje?
                </span>
              </h2>
            </div>
            
            {availableExercises.length === 0 ? (
              <div className="w-full max-w-md bg-slate-800/50 p-8 rounded-3xl text-center border border-slate-700">
                <p className="text-slate-300 mb-2">Você ainda não possui exercícios atribuídos.</p>
                <p className="text-sm text-slate-500">Peça ao seu treinador para atualizar sua ficha.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 w-full mb-12">
                {availableExercises.map((type) => (
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

            {availableExercises.length > 0 && (
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
            )}
          </div>
        )}

        {/* VIEW: UPLOAD VIDEO */}
        {step === AppStep.UPLOAD_VIDEO && (
          <div className="w-full max-w-3xl animate-fade-in">
            <div className="glass-panel rounded-3xl p-6 md:p-12 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Registro de Execução</h2>
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
                      capture="user"
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