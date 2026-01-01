import React, { useState, useEffect, useRef } from 'react';
import { AppStep, ExerciseType, AnalysisResult, User, ExerciseRecord, ExerciseDTO, SPECIAL_EXERCISES, WorkoutPlan } from './types';
import { analyzeVideo, generateWorkoutPlan } from './services/geminiService';
import { compressVideo } from './utils/videoUtils';
import { MockDataService } from './services/mockDataService';
import ExerciseCard from './components/ExerciseCard';
import { ResultView } from './components/ResultView';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import { Video, UploadCloud, Loader2, ArrowRight, Lightbulb, Sparkles, Smartphone, Zap, LogOut, User as UserIcon, ScanLine, Scale, Image as ImageIcon, AlertTriangle, ShieldCheck, RefreshCcw, X, History, Lock, HelpCircle, Dumbbell, Calendar, Trash2, Printer, ArrowLeft } from 'lucide-react';
import { EvolutionModal } from './components/EvolutionModal';
import LoadingScreen from './components/LoadingScreen';

const DEFAULT_EXERCISE_IMAGES: Record<string, string> = {
  'SQUAT': "https://images.unsplash.com/photo-1434682881908-b43d0467b798?q=80&w=800&auto=format&fit=crop",
  'PUSHUP': "https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=600&auto=format&fit=crop",
  'LUNGE': "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=600&auto=format&fit=crop",
  'BURPEE': "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=600&auto=format&fit=crop", 
  'PLANK': "https://images.unsplash.com/photo-1434682881908-b43d0467b798?q=80&w=800&auto=format&fit=crop",
  'JUMPING_JACK': "https://images.unsplash.com/photo-1522898467493-49726bf28798?q=80&w=800&auto=format&fit=crop",
  'MOUNTAIN_CLIMBER': "https://images.unsplash.com/photo-1522898467493-49726bf28798?q=80&w=800&auto=format&fit=crop",
  'CRUNCH': "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800&auto=format&fit=crop",
  'PULLUP': "https://images.unsplash.com/photo-1522898467493-49726bf28798?q=80&w=800&auto=format&fit=crop",
  'BRIDGE': "https://images.unsplash.com/photo-1574680178050-55c6a6a96e0a?q=80&w=800&auto=format&fit=crop",
  'BULGARIAN_SQUAT': "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop",
  'DEADLIFT': "https://images.unsplash.com/photo-1522898467493-49726bf28798?q=80&w=800&auto=format&fit=crop",
  'TRICEP_DIP': "https://images.unsplash.com/photo-1522898467493-49726bf28798?q=80&w=800&auto=format&fit=crop",
  'BICEP_CURL': "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop",
  'CABLE_CROSSOVER': "https://images.unsplash.com/photo-1534367507873-d2d7e24c797f?q=80&w=800&auto=format&fit=crop",
  'POSTURE_ANALYSIS': "https://images.unsplash.com/photo-1544367563-12123d8959eb?q=80&w=800&auto=format&fit=crop",
  'BODY_COMPOSITION': "https://images.unsplash.com/photo-1518310383802-640c2de311b2?q=80&w=800&auto=format&fit=crop"
};

const EXERCISE_TIPS: Record<string, string[]> = {
  'SQUAT': ["Calcanhares no chão.", "Peito estufado.", "Joelhos seguem os pés."],
  'PUSHUP': ["Corpo em linha reta.", "Cotovelos para trás.", "Peito quase no chão."],
  'LUNGE': ["Tronco vertical.", "Joelhos em 90 graus.", "Equilíbrio centralizado."],
  'BURPEE': ["Ritmo constante.", "Core ativado.", "Salto explosivo."],
  'PLANK': ["Ombros sobre cotovelos.", "Glúteos contraídos.", "Pescoço neutro."],
  'JUMPING_JACK': ["Coordenação rítmica.", "Ponta dos pés.", "Amplitude total."],
  'MOUNTAIN_CLIMBER': ["Quadril baixo.", "Joelhos no peito.", "Braços firmes."],
  'CRUNCH': ["Lombar no chão.", "Olhar para o teto.", "Solte o ar ao subir."],
  'PULLUP': ["Ative as escápulas.", "Queixo acima da barra.", "Descida controlada."],
  'BRIDGE': ["Calcanhares empurram.", "Contraia glúteos.", "Lombar estável."],
  'BULGARIAN_SQUAT': ["Pé de trás apoiado.", "Tronco firme.", "Desça com controle."],
  'DEADLIFT': ["Barra rente à perna.", "Coluna neutra.", "Força no quadril."],
  'TRICEP_DIP': ["Cotovelos fechados.", "Ombros longe das orelhas.", "Profundidade 90°."],
  'BICEP_CURL': ["Cotovelos colados.", "Sem balançar o tronco.", "Descida lenta."],
  'CABLE_CROSSOVER': ["Abraço circular.", "Foco no peito.", "Controle a volta."],
  'POSTURE_ANALYSIS': ["Posição relaxada.", "Corpo inteiro visível.", "Local bem iluminado."],
  'BODY_COMPOSITION': ["Roupa justa/banho.", "Frente e Lado.", "Pose natural."],
  'FREE_ANALYSIS_MODE': ["Certifique-se que o corpo todo aparece.", "Boa iluminação ajuda na detecção.", "Execute o movimento completo."]
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [step, setStep] = useState<AppStep>(AppStep.LOGIN);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [historyRecords, setHistoryRecords] = useState<ExerciseRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [exerciseImages, setExerciseImages] = useState<Record<string, string>>(DEFAULT_EXERCISE_IMAGES);
  const [showEvolutionModal, setShowEvolutionModal] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Dynamic Exercises State
  const [exercisesList, setExercisesList] = useState<ExerciseDTO[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);

  // Saved Workouts State
  const [savedWorkouts, setSavedWorkouts] = useState<WorkoutPlan[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false); // View
  const [showGenerateWorkoutForm, setShowGenerateWorkoutForm] = useState(false); // Create
  const [generatingWorkout, setGeneratingWorkout] = useState(false);
  const [viewingWorkoutHtml, setViewingWorkoutHtml] = useState<string | null>(null);

  // Workout Form State
  const [workoutFormData, setWorkoutFormData] = useState({
    weight: '',
    height: '',
    goal: 'hipertrofia',
    level: 'iniciante',
    frequency: '4',
    observations: '',
    gender: 'masculino'
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Função para carregar exercícios
  // Se for admin, carrega lista global. Se for user, carrega APENAS os atribuídos via nova rota.
  const loadExercisesList = async (user: User) => {
    setLoadingExercises(true);
    try {
      if (user.role === 'admin') {
         console.log("Admin logado, buscando catálogo global...");
         const exercises = await MockDataService.fetchExercises();
         setExercisesList(exercises);
      } else {
         console.log(`Buscando exercícios atribuídos para usuário ${user.id}...`);
         const myExercises = await MockDataService.fetchUserExercises(user.id);
         setExercisesList(myExercises);
      }
    } catch (e) {
      console.error("Error loading exercises list", e);
    } finally {
      setLoadingExercises(false);
    }
  };

  const fetchUserWorkouts = async (userId: string) => {
    setLoadingWorkouts(true);
    try {
      const response = await fetch(`https://testeai-732767853162.us-west1.run.app/api/treinos/${userId}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setSavedWorkouts(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Error fetching workouts:", e);
    } finally {
      setLoadingWorkouts(false);
    }
  };

  // Initialize Data
  useEffect(() => {
    const init = async () => {
      // Load User
      const user = MockDataService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setStep(user.role === 'admin' ? AppStep.ADMIN_DASHBOARD : AppStep.SELECT_EXERCISE);
        
        // Load specific exercises for this session
        await loadExercisesList(user);

        // Load existing workouts if any
        await fetchUserWorkouts(user.id);
      }

      // Custom Images
      const customImages = MockDataService.getExerciseImages();
      if (Object.keys(customImages).length > 0) {
        setExerciseImages({ ...DEFAULT_EXERCISE_IMAGES, ...customImages });
      }
    };
    init();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (step === AppStep.ANALYZING || step === AppStep.COMPRESSING) {
      interval = setInterval(() => {
        setCurrentTipIndex((prev) => {
          if (!selectedExercise) return 0;
          const tips = EXERCISE_TIPS[selectedExercise] || ["Mantenha a postura correta."];
          return (prev + 1) % tips.length;
        });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [step, selectedExercise]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setStep(user.role === 'admin' ? AppStep.ADMIN_DASHBOARD : AppStep.SELECT_EXERCISE);
    loadExercisesList(user);
    fetchUserWorkouts(user.id);
  };

  const handleLogout = () => {
    MockDataService.logout();
    setCurrentUser(null);
    setExercisesList([]); // Clear list on logout
    setSavedWorkouts([]);
    resetAnalysis();
    setStep(AppStep.LOGIN);
  };

  const resetAnalysis = () => {
    setSelectedExercise(null);
    setMediaFile(null);
    setMediaPreview(null);
    setAnalysisResult(null);
    setHistoryRecords([]);
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
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (isSpecialMode) {
          // Postura e Biotipo aceitam ambos
          if (!isVideo && !isImage) {
            setError("Envie vídeo ou imagem.");
            return;
          }
      } else {
          // Exercícios Padrão e MODO LIVRE aceitam APENAS vídeo
          if (!isVideo) {
            setError("Para este modo, envie apenas vídeo.");
            return;
          }
      }

      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleViewHistory = async () => {
    if (!selectedExercise || !currentUser) return;
    
    // No modo livre, não carregamos histórico
    if (selectedExercise === SPECIAL_EXERCISES.FREE_MODE) return;

    setLoadingHistory(true);
    try {
        const encodedExercise = encodeURIComponent(selectedExercise);
        const historyUrl = `https://testeai-732767853162.us-west1.run.app/api/historico/${currentUser.id}?exercise=${encodedExercise}`;
        
        const response = await fetch(historyUrl, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (response.ok) {
            const data: ExerciseRecord[] = await response.json();
            if (data && data.length > 0) {
                setHistoryRecords(data);
                setShowEvolutionModal(true);
            } else {
                alert("Você ainda não realizou este exercício nenhuma vez.");
            }
        } else {
            alert("Não foi possível carregar o histórico.");
        }
    } catch (e) {
        console.error("Erro ao buscar histórico:", e);
        alert("Erro de conexão.");
    } finally {
        setLoadingHistory(false);
    }
  };

  // --- DELETE RECORD HANDLER ---
  const handleDeleteRecord = async (recordId: string) => {
    if (!currentUser) return;
    const success = await MockDataService.deleteRecord(currentUser.id, recordId);
    if (success) {
        // Update local state to reflect deletion immediately
        setHistoryRecords(prev => prev.filter(r => r.id !== recordId));
    } else {
        alert("Não foi possível remover o registro. Tente novamente.");
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

      let previousRecord: ExerciseRecord | null = null;
      
      // Apenas busca histórico se NÃO for modo livre
      if (selectedExercise !== SPECIAL_EXERCISES.FREE_MODE) {
          try {
            const encodedExercise = encodeURIComponent(selectedExercise);
            const historyUrl = `https://testeai-732767853162.us-west1.run.app/api/historico/${currentUser.id}?exercise=${encodedExercise}`;
            const historyResponse = await fetch(historyUrl, { method: "GET" });
            if (historyResponse.ok) {
                const historyData: ExerciseRecord[] = await historyResponse.json();
                if (historyData && historyData.length > 0) {
                    previousRecord = historyData[0];
                }
            }
          } catch (histErr) {
            console.warn("Sem histórico para contexto.", histErr);
          }
      }

      const result = await analyzeVideo(finalFile, selectedExercise, previousRecord?.result);
      
      if (!result.isValidContent) {
        setError(result.validationError || "Conteúdo inválido para este exercício.");
        setStep(AppStep.UPLOAD_VIDEO);
        return;
      }
      
      setAnalysisResult(result);
      
      // Apenas salva no histórico se NÃO for modo livre
      if (selectedExercise !== SPECIAL_EXERCISES.FREE_MODE) {
          try {
            const saveUrl = "https://testeai-732767853162.us-west1.run.app/api/historico";
            const payload = {
              userId: currentUser.id,
              userName: currentUser.name,
              exercise: selectedExercise,
              timestamp: Date.now(),
              result: { ...result, date: new Date().toISOString() }
            };
            await fetch(saveUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            
            // Recarrega histórico local para a view de resultados
            try {
                const encodedExercise = encodeURIComponent(selectedExercise);
                const historyUrl = `https://testeai-732767853162.us-west1.run.app/api/historico/${currentUser.id}?exercise=${encodedExercise}`;
                const historyResponse = await fetch(historyUrl, { method: "GET" });
                if (historyResponse.ok) {
                    const fullHistoryData: ExerciseRecord[] = await historyResponse.json();
                    setHistoryRecords(fullHistoryData);
                }
            } catch (e) {
                console.error("Erro atualização histórico:", e);
            }

          } catch (saveError) {
            console.error("Falha ao salvar:", saveError);
          }
      }

      setStep(AppStep.RESULTS);

    } catch (err: any) {
      setError(err.message || "Erro inesperado.");
      setStep(AppStep.UPLOAD_VIDEO);
    }
  };

  const handleGenerateWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setGeneratingWorkout(true);
    try {
        const planHtml = await generateWorkoutPlan(workoutFormData);
        
        // Save to backend
        const response = await fetch("https://testeai-732767853162.us-west1.run.app/api/treinos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: currentUser.id,
                goal: workoutFormData.goal,
                content: planHtml
            })
        });

        if (response.ok) {
            await fetchUserWorkouts(currentUser.id); // Refresh list
            setShowGenerateWorkoutForm(false);
            // Optionally open the view immediately
            const data = await response.json();
            setViewingWorkoutHtml(data.content || planHtml);
            setShowWorkoutModal(true);
        } else {
            throw new Error("Erro ao salvar treino");
        }
    } catch (err: any) {
        alert("Erro ao gerar/salvar treino: " + err.message);
    } finally {
        setGeneratingWorkout(false);
    }
  };

  const handleDeleteWorkout = async () => {
    if (!currentUser || savedWorkouts.length === 0) return;
    
    if (!confirm("Tem certeza que deseja apagar seu treino atual?")) return;

    try {
        const workoutId = savedWorkouts[0].id;
        const response = await fetch(`https://testeai-732767853162.us-west1.run.app/api/treinos/${workoutId}`, {
            method: "DELETE"
        });

        if (response.ok) {
            setSavedWorkouts([]);
            setShowWorkoutModal(false);
            setViewingWorkoutHtml(null);
            alert("Treino removido com sucesso.");
        }
    } catch (e) {
        alert("Erro ao remover treino.");
    }
  };

  const handleGoBackToSelect = () => {
    clearSelectedMedia();
    setStep(AppStep.SELECT_EXERCISE);
  };

  if (step === AppStep.LOGIN) return <Login onLogin={handleLogin} />;

  // --- NEW LOGIC: Use exercisesList directly ---
  // A lista já vem filtrada do backend. Se está na lista, o usuário tem acesso.
  
  // Categorize exercises from the fetched list
  const standardExercises = exercisesList.filter(ex => ex.category !== 'SPECIAL');
  const postureExercise = exercisesList.find(ex => ex.id === SPECIAL_EXERCISES.POSTURE);
  const bodyCompExercise = exercisesList.find(ex => ex.id === SPECIAL_EXERCISES.BODY_COMPOSITION);

  // Access flags are simply true if the exercise exists in the returned list
  const hasPostureAccess = !!postureExercise;
  const hasBodyCompAccess = !!bodyCompExercise;

  // Check if selected exercise is 'special' mode (Allows Images)
  // REMOVED FREE_MODE from here to force VIDEO ONLY behavior
  const isSpecialMode = selectedExercise && 
    (selectedExercise === SPECIAL_EXERCISES.POSTURE || selectedExercise === SPECIAL_EXERCISES.BODY_COMPOSITION);

  // Get selected exercise display name
  const selectedExerciseName = selectedExercise === SPECIAL_EXERCISES.FREE_MODE
    ? "Análise Livre"
    : (selectedExercise ? exercisesList.find(e => e.id === selectedExercise)?.name || selectedExercise : '');

  const getExerciseTip = () => {
    if (!selectedExercise) return "";
    const tips = EXERCISE_TIPS[selectedExercise] || EXERCISE_TIPS['FREE_ANALYSIS_MODE'] || ["Mantenha a postura correta."];
    return tips[currentTipIndex % tips.length];
  }

  // --- RENDER HELPERS ---
  const renderWorkoutModal = () => (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 overflow-y-auto animate-in fade-in backdrop-blur-sm">
      <div className="min-h-screen p-4 md:p-8 relative">
          <div className="flex justify-between items-center max-w-7xl mx-auto mb-6">
             <button 
                onClick={() => { setShowWorkoutModal(false); setViewingWorkoutHtml(null); }}
                className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
             >
                <ArrowLeft className="w-5 h-5" /> Voltar
             </button>
             <div className="flex gap-3">
                 <button onClick={() => window.print()} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white">
                    <Printer className="w-5 h-5" />
                 </button>
                 <button onClick={handleDeleteWorkout} className="p-2 bg-red-600 hover:bg-red-500 rounded-lg text-white">
                    <Trash2 className="w-5 h-5" />
                 </button>
             </div>
          </div>
          
          <div className="max-w-6xl mx-auto bg-slate-50 rounded-3xl p-8 shadow-2xl min-h-[80vh]">
             <style>{`
                 #workout-view-content { font-family: 'Plus Jakarta Sans', sans-serif; color: #1e293b; }
                 @media print {
                   body * { visibility: hidden; }
                   #workout-view-content, #workout-view-content * { visibility: visible; }
                   #workout-view-content { position: absolute; left: 0; top: 0; width: 100%; }
                 }
             `}</style>
             <div id="workout-view-content" dangerouslySetInnerHTML={{ __html: viewingWorkoutHtml || (savedWorkouts[0]?.content || '') }} />
          </div>
      </div>
    </div>
  );

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

      {/* WORKOUT VIEW MODAL */}
      {showWorkoutModal && renderWorkoutModal()}

      {/* GENERATE WORKOUT FORM MODAL */}
      {showGenerateWorkoutForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md relative shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
             <button onClick={() => setShowGenerateWorkoutForm(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
               <X className="w-6 h-6" />
             </button>
             
             <div className="flex flex-col items-center mb-6">
               <div className="p-3 bg-blue-600/20 text-blue-400 rounded-full mb-3">
                 <Dumbbell className="w-8 h-8" />
               </div>
               <h3 className="text-2xl font-bold text-white">Criar Ficha de Treino</h3>
               <p className="text-slate-400 text-center text-sm">A IA criará um plano personalizado para você.</p>
             </div>

             <form onSubmit={handleGenerateWorkout} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Peso (kg)</label>
                    <input type="number" required step="0.1" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={workoutFormData.weight} onChange={e => setWorkoutFormData({...workoutFormData, weight: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Altura (cm)</label>
                    <input type="number" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={workoutFormData.height} onChange={e => setWorkoutFormData({...workoutFormData, height: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Sexo Biológico</label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={workoutFormData.gender} onChange={e => setWorkoutFormData({...workoutFormData, gender: e.target.value})}>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Objetivo</label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={workoutFormData.goal} onChange={e => setWorkoutFormData({...workoutFormData, goal: e.target.value})}>
                    <option value="hipertrofia">Hipertrofia (Crescer)</option>
                    <option value="definicao">Definição (Secar)</option>
                    <option value="emagrecimento">Emagrecimento (Perder Peso)</option>
                    <option value="forca">Força Pura</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Nível de Experiência</label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={workoutFormData.level} onChange={e => setWorkoutFormData({...workoutFormData, level: e.target.value})}>
                    <option value="iniciante">Iniciante (Começando agora)</option>
                    <option value="intermediario">Intermediário (Já treina)</option>
                    <option value="avancado">Avançado (Atleta/Experiente)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Dias por Semana</label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={workoutFormData.frequency} onChange={e => setWorkoutFormData({...workoutFormData, frequency: e.target.value})}>
                    <option value="2">2 dias</option>
                    <option value="3">3 dias</option>
                    <option value="4">4 dias</option>
                    <option value="5">5 dias</option>
                    <option value="6">6 dias</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Observações / Limitações</label>
                  <textarea 
                    rows={3}
                    placeholder="Ex: Tenho condromalácia no joelho esquerdo, prefiro treinos curtos, sinto dor no ombro..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none placeholder-slate-500 text-sm"
                    value={workoutFormData.observations}
                    onChange={e => setWorkoutFormData({...workoutFormData, observations: e.target.value})}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">A IA usará isso para adaptar ou remover exercícios.</p>
                </div>

                <button type="submit" disabled={generatingWorkout} className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                  {generatingWorkout ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {generatingWorkout ? "Gerando..." : "Gerar Treino"}
                </button>
             </form>
          </div>
        </div>
      )}

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
            
            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              
              {/* CARD DE TREINO DINÂMICO (GERAR ou VISUALIZAR) */}
              {loadingWorkouts ? (
                 <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-4 border-dashed border-2 border-slate-700/50 h-full min-h-[160px] animate-pulse">
                    <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
                    <span className="text-slate-500 text-xs">Buscando treinos...</span>
                 </div>
              ) : (
                savedWorkouts.length > 0 ? (
                  /* MODO: VISUALIZAR TREINO EXISTENTE */
                  <button 
                    onClick={() => setShowWorkoutModal(true)}
                    className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all border-2 border-emerald-500/30 hover:bg-emerald-600/10 hover:border-emerald-500 h-full min-h-[160px] group"
                  >
                     <div className="p-4 bg-emerald-600 rounded-full text-white shadow-lg group-hover:scale-110 transition-transform">
                        <Calendar className="w-8 h-8" />
                     </div>
                     <div className="text-center">
                       <h3 className="text-emerald-400 font-bold text-xl">Ver Meu Treino</h3>
                       <p className="text-slate-400 text-xs mt-1">Ficha ativa disponível</p>
                     </div>
                  </button>
                ) : (
                  /* MODO: GERAR NOVO TREINO */
                  <button 
                    onClick={() => setShowGenerateWorkoutForm(true)}
                    className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all border-2 border-blue-500/30 hover:bg-blue-600/10 hover:border-blue-500 h-full min-h-[160px] group"
                  >
                     <div className="p-4 bg-blue-600 rounded-full text-white shadow-lg group-hover:scale-110 transition-transform">
                        <Dumbbell className="w-8 h-8" />
                     </div>
                     <div className="text-center">
                       <h3 className="text-blue-400 font-bold text-xl">Gerar Treino IA</h3>
                       <p className="text-slate-400 text-xs mt-1">Crie sua ficha personalizada</p>
                     </div>
                  </button>
                )
              )}

              {/* Novo Card de Análise Livre */}
              <button 
                 onClick={() => setSelectedExercise(SPECIAL_EXERCISES.FREE_MODE)}
                 className={`glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all border-2 h-full min-h-[160px] group ${selectedExercise === SPECIAL_EXERCISES.FREE_MODE ? 'border-yellow-500 bg-yellow-600/10' : 'border-yellow-500/30 hover:bg-yellow-600/10'}`}
              >
                 <div className={`p-4 rounded-full text-white shadow-lg transition-transform ${selectedExercise === SPECIAL_EXERCISES.FREE_MODE ? 'bg-yellow-500' : 'bg-yellow-600/80 group-hover:scale-110'}`}>
                    <HelpCircle className="w-8 h-8" />
                 </div>
                 <div className="text-center">
                   <h3 className="text-white font-bold text-xl">Análise Livre</h3>
                   <p className="text-slate-400 text-xs mt-1">Exercício não listado? Envie aqui.</p>
                 </div>
              </button>
              
              <div className="flex flex-col gap-3">
                {/* Posture Analysis Card */}
                {postureExercise && (
                  <button 
                    className={`glass-panel p-5 rounded-2xl flex items-center gap-4 group transition-all border-2 flex-1 text-left ${selectedExercise === postureExercise.id ? 'border-emerald-500 bg-emerald-600/20' : 'border-emerald-500/30 hover:bg-emerald-600/20'}`}
                    onClick={() => setSelectedExercise(postureExercise.id)}
                  >
                     <div className={`p-3 rounded-full text-white shadow-lg transition-transform ${hasPostureAccess ? 'bg-emerald-600 group-hover:scale-110' : 'bg-slate-700'}`}><ScanLine className="w-5 h-5" /></div>
                     <div className="text-left"><h3 className="text-white font-bold text-lg">{postureExercise.name}</h3><p className="text-slate-400 text-xs">Biofeedback Postural</p></div>
                  </button>
                )}

                {/* Body Composition Card */}
                {bodyCompExercise && (
                  <button 
                    className={`glass-panel p-5 rounded-2xl flex items-center gap-4 group transition-all border-2 flex-1 text-left ${selectedExercise === bodyCompExercise.id ? 'border-violet-500 bg-violet-600/20' : 'border-violet-500/30 hover:bg-violet-600/20'}`}
                    onClick={() => setSelectedExercise(bodyCompExercise.id)}
                  >
                     <div className={`p-3 rounded-full text-white shadow-lg transition-transform ${hasBodyCompAccess ? 'bg-violet-600 group-hover:scale-110' : 'bg-slate-700'}`}><Scale className="w-5 h-5" /></div>
                     <div className="text-left"><h3 className="text-white font-bold text-lg">{bodyCompExercise.name}</h3><p className="text-slate-400 text-xs">Biotipo & % Gordura</p></div>
                  </button>
                )}
              </div>
            </div>

            <div id="exercise-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 w-full mb-12 min-h-[300px]">
              {loadingExercises ? (
                <div className="col-span-full flex flex-col items-center justify-center py-12 bg-slate-800/30 rounded-3xl border border-slate-700/50 backdrop-blur-sm animate-pulse">
                   <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                   <p className="text-slate-300 font-medium">Sincronizando catálogo de exercícios...</p>
                </div>
              ) : (
                standardExercises.length > 0 ? (
                  standardExercises.map((ex) => (
                    <ExerciseCard 
                      key={ex.id} 
                      type={ex.name} 
                      imageUrl={exerciseImages[ex.id] || DEFAULT_EXERCISE_IMAGES[ex.id] || DEFAULT_EXERCISE_IMAGES['SQUAT']} 
                      selected={selectedExercise === ex.id} 
                      onClick={() => setSelectedExercise(ex.id)} 
                    />
                  ))
                ) : (
                  <div className="col-span-full text-center py-10 text-slate-400">
                    <p>Nenhum exercício de força atribuído para você.</p>
                  </div>
                )
              )}
            </div>
            
            <div className={`sticky bottom-8 z-40 flex items-center gap-4 transition-all duration-300 justify-center ${selectedExercise ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                {/* Botão de Histórico só aparece para exercícios normais, não para análise livre */}
                {selectedExercise && selectedExercise !== SPECIAL_EXERCISES.FREE_MODE && (
                    <button 
                        onClick={handleViewHistory}
                        disabled={loadingHistory}
                        className="group flex items-center justify-center gap-3 px-6 py-5 rounded-full text-lg font-bold bg-slate-700 hover:bg-slate-600 text-white shadow-2xl transition-all"
                    >
                        {loadingHistory ? <Loader2 className="w-5 h-5 animate-spin" /> : <History className="w-5 h-5" />}
                        <span className="hidden md:inline">Comparar Evolução</span>
                    </button>
                )}
                
                <button 
                    disabled={!selectedExercise} 
                    onClick={() => setStep(AppStep.UPLOAD_VIDEO)} 
                    className="group flex items-center justify-center gap-3 px-10 py-5 rounded-full text-lg font-bold transition-all duration-300 shadow-2xl bg-blue-600 hover:bg-blue-500 text-white"
                >
                    Continuar <ArrowRight className="w-5 h-5" />
                </button>
            </div>
          </div>
        )}

        {/* Modal de Evolução Separado (Acionado pelo dashboard) */}
        {selectedExercise && (
             <EvolutionModal 
                isOpen={showEvolutionModal}
                onClose={() => setShowEvolutionModal(false)}
                history={historyRecords}
                exerciseType={selectedExercise}
                highlightLatestAsCurrent={false}
                onDelete={handleDeleteRecord} // Passando a função de deletar
            />
        )}

        {step === AppStep.UPLOAD_VIDEO && selectedExercise && (
          <div className="w-full max-w-3xl animate-fade-in">
            <div className="glass-panel rounded-3xl p-6 md:p-12 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Envio de Mídia</h2>
                <p className="text-slate-400">Analise seu <span className="text-blue-400 font-semibold">{selectedExerciseName}</span></p>
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

        {/* LOADING STATE UI - NEW COMPONENT */}
        {(step === AppStep.ANALYZING || step === AppStep.COMPRESSING) && selectedExercise && (
           <LoadingScreen step={step} tip={getExerciseTip()} exerciseType={selectedExercise} />
        )}

        {step === AppStep.RESULTS && analysisResult && selectedExercise && (
          <ResultView 
            result={analysisResult} 
            exercise={selectedExercise} 
            history={historyRecords} // Passa o histórico atualizado
            userId={currentUser?.id || ''} // Added userId prop
            onReset={resetAnalysis}
            onDeleteRecord={handleDeleteRecord} // Passando a função também para o ResultView
            onWorkoutSaved={() => currentUser && fetchUserWorkouts(currentUser.id)} // Passa a função de recarregar treinos
          />
        )}
      </main>
    </div>
  );
};

export default App;