import React, { useState, useEffect, useRef } from 'react';
import { AppStep, ExerciseType, AnalysisResult, User, ExerciseRecord } from './types';
import { analyzeVideo } from './services/geminiService';
import { compressVideo } from './utils/videoUtils';
import { MockDataService } from './services/mockDataService';
import ExerciseCard from './components/ExerciseCard';
import { ResultView } from './components/ResultView';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import { Video, UploadCloud, Loader2, ArrowRight, Lightbulb, Sparkles, Smartphone, Zap, LogOut, User as UserIcon, ScanLine, Scale, Image as ImageIcon, AlertTriangle, ShieldCheck, RefreshCcw, X } from 'lucide-react';

const DEFAULT_EXERCISE_IMAGES: Record<ExerciseType, string> = {
  [ExerciseType.SQUAT]: "https://images.unsplash.com/photo-1434682881908-b43d0467b798?q=80&w=800&auto=format&fit=crop",
  [ExerciseType.PUSHUP]: "https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=600&auto=format&fit=crop",
  [ExerciseType.LUNGE]: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=600&auto=format&fit=crop",
  [ExerciseType.BURPEE]: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=600&auto=format&fit=crop", 
  [ExerciseType.PLANK]: "https://images.unsplash.com/photo-1434682881908-b43d0467b798?q=80&w=800&auto=format&fit=crop",
  [ExerciseType.JUMPING_JACK]: "https://images.unsplash.com/photo-1522898467493-49726bf28798?q=80&w=800&auto=format&fit=crop",
  [ExerciseType.MOUNTAIN_CLIMBER]: "https://images.unsplash.com/photo-1522898467493-49726bf28798?q=80&w=800&auto=format&fit=crop",
  [ExerciseType.CRUNCH]: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800&auto=format&fit=crop",
  [ExerciseType.PULLUP]: "https://images.unsplash.com/photo-1522898467493-49726bf28798?q=80&w=800&auto=format&fit=crop",
  [ExerciseType.BRIDGE]: "https://images.unsplash.com/photo-1574680178050-55c6a6a96e0a?q=80&w=800&auto=format&fit=crop",
  [ExerciseType.BULGARIAN_SQUAT]: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop",
  [ExerciseType.DEADLIFT]: "https://images.unsplash.com/photo-1522898467493-49726bf28798?q=80&w=800&auto=format&fit=crop",
  [ExerciseType.TRICEP_DIP]: "https://images.unsplash.com/photo-1522898467493-49726bf28798?q=80&w=800&auto=format&fit=crop",
  [ExerciseType.BICEP_CURL]: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop",
  [ExerciseType.CABLE_CROSSOVER]: "https://images.unsplash.com/photo-1534367507873-d2d7e24c797f?q=80&w=800&auto=format&fit=crop",
  [ExerciseType.POSTURE_ANALYSIS]: "https://images.unsplash.com/photo-1544367563-12123d8959eb?q=80&w=800&auto=format&fit=crop",
  [ExerciseType.BODY_COMPOSITION]: "https://images.unsplash.com/photo-1518310383802-640c2de311b2?q=80&w=800&auto=format&fit=crop"
};

const EXERCISE_TIPS: Record<ExerciseType, string[]> = {
  [ExerciseType.SQUAT]: ["Calcanhares no chão.", "Peito estufado.", "Joelhos seguem os pés."],
  [ExerciseType.PUSHUP]: ["Corpo em linha reta.", "Cotovelos para trás.", "Peito quase no chão."],
  [ExerciseType.LUNGE]: ["Tronco vertical.", "Joelhos em 90 graus.", "Equilíbrio centralizado."],
  [ExerciseType.BURPEE]: ["Ritmo constante.", "Core ativado.", "Salto explosivo."],
  [ExerciseType.PLANK]: ["Ombros sobre cotovelos.", "Glúteos contraídos.", "Pescoço neutro."],
  [ExerciseType.JUMPING_JACK]: ["Coordenação rítmica.", "Ponta dos pés.", "Amplitude total."],
  [ExerciseType.MOUNTAIN_CLIMBER]: ["Quadril baixo.", "Joelhos no peito.", "Braços firmes."],
  [ExerciseType.CRUNCH]: ["Lombar no chão.", "Olhar para o teto.", "Solte o ar ao subir."],
  [ExerciseType.PULLUP]: ["Ative as escápulas.", "Queixo acima da barra.", "Descida controlada."],
  [ExerciseType.BRIDGE]: ["Calcanhares empurram.", "Contraia glúteos.", "Lombar estável."],
  [ExerciseType.BULGARIAN_SQUAT]: ["Pé de trás apoiado.", "Tronco firme.", "Desça com controle."],
  [ExerciseType.DEADLIFT]: ["Barra rente à perna.", "Coluna neutra.", "Força no quadril."],
  [ExerciseType.TRICEP_DIP]: ["Cotovelos fechados.", "Ombros longe das orelhas.", "Profundidade 90°."],
  [ExerciseType.BICEP_CURL]: ["Cotovelos colados.", "Sem balançar o tronco.", "Descida lenta."],
  [ExerciseType.CABLE_CROSSOVER]: ["Abraço circular.", "Foco no peito.", "Controle a volta."],
  [ExerciseType.POSTURE_ANALYSIS]: ["Posição relaxada.", "Corpo inteiro visível.", "Local bem iluminado."],
  [ExerciseType.BODY_COMPOSITION]: ["Roupa justa/banho.", "Frente e Lado.", "Pose natural."]
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
  const [exerciseImages, setExerciseImages] = useState<Record<string, string>>(DEFAULT_EXERCISE_IMAGES);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const user = MockDataService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setStep(user.role === 'admin' ? AppStep.ADMIN_DASHBOARD : AppStep.SELECT_EXERCISE);
    }
    const customImages = MockDataService.getExerciseImages();
    if (Object.keys(customImages).length > 0) {
      setExerciseImages({ ...DEFAULT_EXERCISE_IMAGES, ...customImages });
    }
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (step === AppStep.ANALYZING || step === AppStep.COMPRESSING) {
      interval = setInterval(() => {
        setCurrentTipIndex((prev) => {
          if (!selectedExercise) return 0;
          return (prev + 1) % EXERCISE_TIPS[selectedExercise].length;
        });
      }, 3000);
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
    resetAnalysis();
    setStep(AppStep.LOGIN);
  };

  const resetAnalysis = () => {
    setSelectedExercise(null);
    setMediaFile(null);
    setMediaPreview(null);
    setAnalysisResult(null);
    setError(null);
    setStep(AppStep.SELECT_EXERCISE);
  };

  const clearSelectedMedia = () => {
    setMediaFile(null);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) {
        setError("Envie vídeo ou imagem.");
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
      if (mediaFile.type.startsWith('video/') && mediaFile.size > 15 * 1024 * 1024) {
         setStep(AppStep.COMPRESSING);
         try {
           finalFile = await compressVideo(mediaFile);
         } catch (compressError: any) {
           setError("Erro ao otimizar vídeo.");
           setStep(AppStep.UPLOAD_VIDEO);
           return;
         }
      }

      setStep(AppStep.ANALYZING);

      // --- PASSO 1: BUSCAR HISTÓRICO ANTERIOR (GET) ---
      // Buscamos o último resultado para passar como contexto para a IA
      let previousRecord: ExerciseRecord | null = null;
      try {
        console.log("Buscando histórico anterior para contexto...");
        const encodedExercise = encodeURIComponent(selectedExercise);
        const historyUrl = `https://testeai-732767853162.us-west1.run.app/api/historico/${currentUser.id}?exercise=${encodedExercise}`;
        
        const historyResponse = await fetch(historyUrl, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (historyResponse.ok) {
            const historyData: ExerciseRecord[] = await historyResponse.json();
            if (historyData && historyData.length > 0) {
                // Assume que o backend retorna ordenado por data (mais recente primeiro)
                previousRecord = historyData[0];
                console.log("Histórico encontrado. Score anterior:", previousRecord.result.score);
            }
        }
      } catch (histErr) {
        console.warn("Não foi possível buscar o histórico anterior. A análise continuará sem contexto de evolução.", histErr);
      }

      // --- PASSO 2: ANALISAR VÍDEO COM CONTEXTO ---
      // Passamos o resultado anterior (se houver) para a função de IA
      const result = await analyzeVideo(finalFile, selectedExercise, previousRecord?.result);
      
      if (!result.isValidContent) {
        setError(result.validationError || "O conteúdo enviado não condiz com um humano realizando o exercício selecionado.");
        setStep(AppStep.UPLOAD_VIDEO);
        return;
      }
      
      setAnalysisResult(result);
      
      // --- PASSO 3: SALVAR NOVO RESULTADO (POST) ---
      try {
        console.log("Salvando resultado no backend...");
        const saveUrl = "https://testeai-732767853162.us-west1.run.app/api/historico";
        const payload = {
          userId: currentUser.id,
          userName: currentUser.name,
          exercise: selectedExercise,
          timestamp: Date.now(),
          result: { 
            ...result, 
            date: new Date().toISOString() 
          }
        };

        const saveResponse = await fetch(saveUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (saveResponse.ok) {
          console.log("Histórico salvo com sucesso no backend!");
        } else {
          console.error("Erro ao salvar no backend:", await saveResponse.text());
        }
      } catch (saveError) {
        console.error("Falha na conexão ao salvar histórico:", saveError);
      }

      setStep(AppStep.RESULTS);

    } catch (err: any) {
      setError(err.message || "Erro inesperado na análise.");
      setStep(AppStep.UPLOAD_VIDEO);
    }
  };

  const handleGoBackToSelect = () => {
    clearSelectedMedia();
    setStep(AppStep.SELECT_EXERCISE);
  };

  if (step === AppStep.LOGIN) return <Login onLogin={handleLogin} />;

  // Filter exercises based on permissions
  const assigned = currentUser?.assignedExercises || [];
  
  const availableExercises = Object.values(ExerciseType);
  const specialExercises = [ExerciseType.POSTURE_ANALYSIS, ExerciseType.BODY_COMPOSITION];
  
  // Grid exercises: Must be in 'assigned' list AND not be special
  const gridExercises = availableExercises.filter(ex => 
    !specialExercises.includes(ex) && assigned.includes(ex)
  );

  // Special exercises: Must be in 'assigned' list
  const hasPostureAccess = assigned.includes(ExerciseType.POSTURE_ANALYSIS);
  const hasBodyCompAccess = assigned.includes(ExerciseType.BODY_COMPOSITION);

  const isSpecialMode = selectedExercise && specialExercises.includes(selectedExercise);

  return (
    <div className="min-h-screen flex flex-col font-[Plus Jakarta Sans]">
      <header className="sticky top-0 z-50 glass-panel border-b-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-default">
            <div className="p-2 bg-blue-600 rounded-lg group-hover:bg-blue-500 transition-colors shadow-lg">
              <Video className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white hidden md:block">FitAI <span className="text-blue-400 font-light">Analyzer</span></h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-bold text-white">{currentUser?.name}</p>
                  <p className="text-xs text-slate-400 capitalize">{currentUser?.role === 'admin' ? 'Administrador' : 'Aluno'}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600">
                  <UserIcon className="w-5 h-5 text-slate-300" />
                </div>
             </div>
             <button onClick={handleLogout} className="p-2 rounded-lg text-slate-400 hover:text-red-400 transition-colors"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-4 md:p-8">
        {step === AppStep.ADMIN_DASHBOARD && currentUser?.role === 'admin' && (
          <AdminDashboard currentUser={currentUser} onRefreshData={() => {}} />
        )}

        {step === AppStep.SELECT_EXERCISE && (
          <div className="w-full max-w-6xl animate-fade-in flex flex-col items-center">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold uppercase mb-4 border border-blue-500/20">
                <Sparkles className="w-3 h-3" /> Sua Área de Treino
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white">Olá! <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">O que vamos fazer hoje?</span></h2>
            </div>
            
            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <button className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-4 group hover:bg-blue-600/20 transition-all border-dashed border-2 border-slate-700 h-full min-h-[160px]" onClick={() => document.getElementById('exercise-grid')?.scrollIntoView({ behavior: 'smooth' })}>
                 <div className="p-4 bg-blue-600 rounded-full text-white shadow-lg group-hover:scale-110 transition-transform"><Video className="w-8 h-8" /></div>
                 <h3 className="text-white font-bold text-xl">Gravar Treino</h3>
              </button>
              <div className="flex flex-col gap-3">
                {hasPostureAccess ? (
                  <button className="glass-panel p-5 rounded-2xl flex items-center gap-4 group hover:bg-emerald-600/20 transition-all border-2 border-emerald-500/30 flex-1" onClick={() => { setSelectedExercise(ExerciseType.POSTURE_ANALYSIS); setStep(AppStep.UPLOAD_VIDEO); }}>
                     <div className="p-3 bg-emerald-600 rounded-full text-white shadow-lg group-hover:scale-110 transition-transform"><ScanLine className="w-5 h-5" /></div>
                     <div className="text-left"><h3 className="text-white font-bold text-lg">Analisar Postura</h3><p className="text-slate-400 text-xs">Biofeedback Postural</p></div>
                  </button>
                ) : (
                   <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 opacity-40 border-2 border-slate-700 flex-1 cursor-not-allowed">
                     <div className="p-3 bg-slate-700 rounded-full text-white"><ScanLine className="w-5 h-5" /></div>
                     <div className="text-left"><h3 className="text-white font-bold text-lg">Analisar Postura</h3><p className="text-slate-400 text-xs">Não atribuído</p></div>
                  </div>
                )}

                {hasBodyCompAccess ? (
                  <button className="glass-panel p-5 rounded-2xl flex items-center gap-4 group hover:bg-violet-600/20 transition-all border-2 border-violet-500/30 flex-1" onClick={() => { setSelectedExercise(ExerciseType.BODY_COMPOSITION); setStep(AppStep.UPLOAD_VIDEO); }}>
                     <div className="p-3 bg-violet-600 rounded-full text-white shadow-lg group-hover:scale-110 transition-transform"><Scale className="w-5 h-5" /></div>
                     <div className="text-left"><h3 className="text-white font-bold text-lg">Análise Corporal</h3><p className="text-slate-400 text-xs">Biotipo & % Gordura</p></div>
                  </button>
                ) : (
                  <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 opacity-40 border-2 border-slate-700 flex-1 cursor-not-allowed">
                     <div className="p-3 bg-slate-700 rounded-full text-white"><Scale className="w-5 h-5" /></div>
                     <div className="text-left"><h3 className="text-white font-bold text-lg">Análise Corporal</h3><p className="text-slate-400 text-xs">Não atribuído</p></div>
                  </div>
                )}
              </div>
            </div>

            <div id="exercise-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 w-full mb-12">
              {gridExercises.length > 0 ? (
                gridExercises.map((type) => (
                  <ExerciseCard key={type} type={type} imageUrl={exerciseImages[type] || DEFAULT_EXERCISE_IMAGES[type]} selected={selectedExercise === type} onClick={() => setSelectedExercise(type)} />
                ))
              ) : (
                <div className="col-span-full text-center py-10 text-slate-400">
                  <p>Nenhum exercício de força atribuído. Fale com seu administrador.</p>
                </div>
              )}
            </div>

            <button disabled={!selectedExercise} onClick={() => setStep(AppStep.UPLOAD_VIDEO)} className={`w-full md:w-auto group flex items-center justify-center gap-3 px-10 py-5 rounded-full text-lg font-bold transition-all duration-300 sticky bottom-8 z-40 shadow-2xl ${selectedExercise ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'opacity-0 pointer-events-none'}`}>
              Continuar <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {step === AppStep.UPLOAD_VIDEO && (
          <div className="w-full max-w-3xl animate-fade-in">
            <div className="glass-panel rounded-3xl p-6 md:p-12 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Envio de Mídia</h2>
                <p className="text-slate-400">Analise seu <span className="text-blue-400 font-semibold">{selectedExercise}</span></p>
                <div className="mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/10 rounded-full border border-blue-500/20 w-fit mx-auto">
                   <ShieldCheck className="w-4 h-4 text-blue-400" />
                   <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">IA de Validação Ativa</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-4 mb-8">
                <div className="relative w-full">
                  <label htmlFor="video-upload" className={`group relative flex flex-col items-center justify-center w-full rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden ${mediaFile ? 'bg-black border-slate-700 h-auto aspect-video' : 'h-64 border-2 border-dashed border-slate-600 bg-slate-800/30 hover:border-blue-500'}`}>
                    {mediaPreview ? (
                      <>
                        {mediaFile?.type.startsWith('image/') ? <img src={mediaPreview} className="h-full w-full object-contain" /> : <video src={mediaPreview} className="h-full w-full object-contain" controls={false} autoPlay muted loop playsInline />}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <div className="flex flex-col items-center gap-2 text-white">
                             <RefreshCcw className="w-10 h-10" />
                             <span className="font-bold">Clique para Trocar</span>
                           </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center p-4">
                        <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mb-4 text-slate-300 group-hover:text-blue-400 transition-colors shadow-lg">
                          {isSpecialMode ? <ImageIcon className="w-8 h-8" /> : <UploadCloud className="w-8 h-8" />}
                        </div>
                        <p className="text-slate-200 font-bold text-lg">Selecionar da Galeria</p>
                        <p className="text-slate-500 text-xs mt-2">Certifique-se de que um humano está visível</p>
                      </div>
                    )}
                    <input ref={fileInputRef} id="video-upload" type="file" accept={isSpecialMode ? "video/*,image/*" : "video/*"} className="hidden" onChange={handleFileChange} />
                  </label>
                  
                  {mediaFile && (
                    <button 
                      onClick={clearSelectedMedia}
                      className="absolute -top-3 -right-3 p-2 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-500 transition-colors z-10"
                      title="Remover arquivo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <div className="mb-6 p-5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-200 text-center text-sm flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 shadow-xl shadow-red-950/20">
                   <div className="flex items-center gap-4 text-left">
                     <div className="p-2 bg-red-500/20 rounded-full"><AlertTriangle className="w-6 h-6 text-red-400 shrink-0" /></div>
                     <div>
                       <p className="font-bold text-red-400">Conteúdo Rejeitado</p>
                       <p className="opacity-80 leading-relaxed">{error}</p>
                     </div>
                   </div>
                   <button 
                    onClick={triggerFilePicker}
                    className="flex items-center gap-2 whitespace-nowrap px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg text-xs font-bold transition-all border border-red-500/30"
                   >
                     <RefreshCcw className="w-3 h-3" /> Trocar Arquivo
                   </button>
                </div>
              )}

              {mediaFile && !error && (
                <div className="mb-6 flex justify-center">
                   <button 
                    onClick={triggerFilePicker}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-all border border-slate-700"
                   >
                     <RefreshCcw className="w-4 h-4" /> Escolher outro arquivo
                   </button>
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  onClick={handleGoBackToSelect} 
                  className="px-6 py-4 rounded-xl bg-transparent border border-slate-600 text-slate-300 hover:bg-slate-800 transition-all"
                >
                  Voltar
                </button>
                <button disabled={!mediaFile} onClick={handleAnalysis} className={`flex-1 px-8 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 text-lg ${mediaFile ? 'bg-white text-blue-900 hover:bg-slate-100 shadow-lg' : 'bg-slate-800 text-slate-500'}`}>
                  {mediaFile && <Sparkles className="w-5 h-5 text-blue-600" />} Analisar Agora
                </button>
              </div>
            </div>
          </div>
        )}

        {(step === AppStep.ANALYZING || step === AppStep.COMPRESSING) && (
          <div className="text-center animate-fade-in w-full max-w-2xl px-4">
             <div className="relative inline-flex items-center justify-center mb-12">
              <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 blur-2xl animate-pulse"></div>
              <div className="relative bg-slate-900/80 rounded-full p-10 border border-blue-500/30 shadow-2xl shadow-blue-500/20">
                <Loader2 className="w-20 h-20 text-blue-400 animate-spin" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-white">{step === AppStep.COMPRESSING ? 'Otimizando Arquivo' : 'Segurança & Biomecânica'}</h2>
              <p className="text-blue-400 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                 <ShieldCheck className="w-4 h-4" /> Validando presença humana e contexto...
              </p>
            </div>
            <p className="text-slate-400 mt-6 mb-10">Aguarde enquanto nossa IA certifica a validade do conteúdo e analisa o movimento, comparando com seu histórico anterior.</p>
            {selectedExercise && (
              <div className="glass-panel rounded-2xl p-8 border-l-4 border-l-blue-400 shadow-2xl">
                 <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Lightbulb className="w-5 h-5" /></div><span className="text-blue-300 font-semibold uppercase text-xs">Dica do Coach</span></div>
                 <p className="text-white text-2xl font-medium animate-fade-in">"{EXERCISE_TIPS[selectedExercise][currentTipIndex]}"</p>
              </div>
            )}
          </div>
        )}

        {step === AppStep.RESULTS && analysisResult && selectedExercise && (
          <ResultView result={analysisResult} exercise={selectedExercise} onReset={resetAnalysis} />
        )}
      </main>
    </div>
  );
};

export default App;