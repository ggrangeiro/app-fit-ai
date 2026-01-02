import React, { useState, useEffect, useRef } from 'react';
import { AppStep, ExerciseType, AnalysisResult, User, ExerciseRecord, ExerciseDTO, SPECIAL_EXERCISES, WorkoutPlan, DietPlan } from './types';
import { analyzeVideo, generateWorkoutPlan, generateDietPlan } from './services/geminiService';
import { compressVideo } from './utils/videoUtils';
import { MockDataService } from './services/mockDataService';
import ExerciseCard from './components/ExerciseCard';
import { ResultView } from './components/ResultView';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import { Video, UploadCloud, Loader2, ArrowRight, Lightbulb, Sparkles, Smartphone, Zap, LogOut, User as UserIcon, ScanLine, Scale, Image as ImageIcon, AlertTriangle, ShieldCheck, RefreshCcw, X, History, Lock, HelpCircle, Dumbbell, Calendar, Trash2, Printer, ArrowLeft, Utensils } from 'lucide-react';
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
  'BENCH_PRESS': "https://images.unsplash.com/photo-1534367610401-9f5ed68180aa?q=80&w=800&auto=format&fit=crop",
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
  'BENCH_PRESS': ["Pés firmes no chão.", "Escápulas retraídas.", "Cotovelos levemente fechados."],
  'POSTURE_ANALYSIS': ["Posição relaxada.", "Corpo inteiro visível.", "Local bem iluminado."],
  'BODY_COMPOSITION': ["Roupa justa/banho.", "Frente e Lado.", "Pose natural."],
  'FREE_ANALYSIS_MODE': ["Certifique-se que o corpo todo aparece.", "Boa iluminação ajuda na detecção.", "Execute o movimento completo."]
};

const App: React.FC = () => {
  // --- INICIALIZAÇÃO LAZY DO ESTADO ---
  // Verifica o localStorage IMEDIATAMENTE na criação do componente para evitar "flash" de login
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return MockDataService.getCurrentUser();
  });

  const [step, setStep] = useState<AppStep>(() => {
    const user = MockDataService.getCurrentUser();
    if (user) {
      return user.role === 'admin' ? AppStep.ADMIN_DASHBOARD : AppStep.SELECT_EXERCISE;
    }
    return AppStep.LOGIN;
  });

  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
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

  // Saved Diet State
  const [savedDiets, setSavedDiets] = useState<DietPlan[]>([]);
  const [loadingDiets, setLoadingDiets] = useState(false);
  const [showDietModal, setShowDietModal] = useState(false); // View
  const [showGenerateDietForm, setShowGenerateDietForm] = useState(false); // Create
  const [generatingDiet, setGeneratingDiet] = useState(false);
  const [viewingDietHtml, setViewingDietHtml] = useState<string | null>(null);

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

  // Diet Form State
  const [dietFormData, setDietFormData] = useState({
    weight: '',
    height: '',
    goal: 'emagrecer',
    gender: 'masculino',
    observations: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Função para carregar exercícios
  const loadExercisesList = async (user: User) => {
    setLoadingExercises(true);
    try {
      if (user.role === 'admin') {
         const exercises = await MockDataService.fetchExercises();
         setExercisesList(exercises);
      } else {
         const myExercises = await MockDataService.fetchUserExercises(user.id);
         setExercisesList(myExercises);
      }
    } catch (e) {
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
    } finally {
      setLoadingWorkouts(false);
    }
  };

  const fetchUserDiets = async (userId: string) => {
    setLoadingDiets(true);
    try {
      const response = await fetch(`https://testeai-732767853162.us-west1.run.app/api/dietas/${userId}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setSavedDiets(Array.isArray(data) ? data : []);
      }
    } catch (e) {
    } finally {
      setLoadingDiets(false);
    }
  };

  // Initialize Data on Mount or User Change
  useEffect(() => {
    const initData = async () => {
      if (currentUser) {
        // Se já temos o usuário (do login ou do refresh/lazy init), carregamos os dados
        await loadExercisesList(currentUser);
        await fetchUserWorkouts(currentUser.id);
        await fetchUserDiets(currentUser.id);
      }

      // Custom Images - Carrega sempre
      const customImages = MockDataService.getExerciseImages();
      if (Object.keys(customImages).length > 0) {
        setExerciseImages({ ...DEFAULT_EXERCISE_IMAGES, ...customImages });
      }
    };
    initData();
  }, [currentUser]); // Dependência em currentUser garante que rode ao logar ou ao montar se já logado

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (step === AppStep.ANALYZING || step === AppStep.COMPRESSING) {
      interval = setInterval(() => {
        setCurrentTipIndex((prev) => {
          if (!selectedExercise) return 0;
          // Usa o alias/typeId para buscar a dica
          const exerciseObj = exercisesList.find(e => e.id === selectedExercise);
          const typeKey = exerciseObj ? exerciseObj.alias : 'FREE_ANALYSIS_MODE';
          const tips = EXERCISE_TIPS[typeKey] || ["Mantenha a postura correta."];
          return (prev + 1) % tips.length;
        });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [step, selectedExercise, exercisesList]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setStep(user.role === 'admin' ? AppStep.ADMIN_DASHBOARD : AppStep.SELECT_EXERCISE);
    // A carga de dados será disparada pelo useEffect que observa [currentUser]
  };

  const handleLogout = () => {
    MockDataService.logout();
    setCurrentUser(null);
    setExercisesList([]);
    setSavedWorkouts([]);
    setSavedDiets([]);
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
          if (!isVideo && !isImage) {
            setError("Envie vídeo ou imagem.");
            return;
          }
      } else {
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
    if (selectedExercise === SPECIAL_EXERCISES.FREE_MODE) return;

    setLoadingHistory(true);
    try {
        // Encontra o exercício para pegar o nome
        const exerciseObj = exercisesList.find(e => e.id === selectedExercise);
        
        // BACKEND ID (Alias) - Para buscar o histórico correto
        const idToSend = exerciseObj ? exerciseObj.alias : selectedExercise;

        const encodedExercise = encodeURIComponent(idToSend);
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
        alert("Erro de conexão.");
    } finally {
        setLoadingHistory(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!currentUser) return;
    const success = await MockDataService.deleteRecord(currentUser.id, recordId);
    if (success) {
        setHistoryRecords(prev => prev.filter(r => r.id !== recordId));
    } else {
        alert("Não foi possível remover o registro. Tente novamente.");
    }
  };

  const handleAnalysis = async () => {
    if (!mediaFile || !selectedExercise || !currentUser) return;

    // Encontra o objeto do exercício selecionado
    const exerciseObj = exercisesList.find(e => e.id === selectedExercise);
    
    // Separamos o que vai pra IA (Nome é melhor contexto) do que vai pro Backend (ID é obrigatório)
    let aiContextName = selectedExercise;
    let backendId = selectedExercise;
    
    if (selectedExercise === SPECIAL_EXERCISES.FREE_MODE) {
        aiContextName = "Análise Livre";
        backendId = SPECIAL_EXERCISES.FREE_MODE;
    } else if (exerciseObj) {
        // Envia o Nome Legível para o Gemini entender melhor
        aiContextName = exerciseObj.name;
        // Envia o ID TÉCNICO (Alias) para o Backend salvar no banco
        backendId = exerciseObj.alias;
    }

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
      
      if (selectedExercise !== SPECIAL_EXERCISES.FREE_MODE) {
          try {
            const encodedExercise = encodeURIComponent(backendId);
            const historyUrl = `https://testeai-732767853162.us-west1.run.app/api/historico/${currentUser.id}?exercise=${encodedExercise}`;
            const historyResponse = await fetch(historyUrl, { method: "GET" });
            if (historyResponse.ok) {
                const historyData: ExerciseRecord[] = await historyResponse.json();
                if (historyData && historyData.length > 0) {
                    previousRecord = historyData[0];
                }
            }
          } catch (histErr) {
          }
      }

      // Chama a IA usando o NOME do exercício (melhor contexto semântico)
      const result = await analyzeVideo(finalFile, aiContextName, previousRecord?.result);
      
      if (!result.isValidContent) {
        setError(result.validationError || "Conteúdo inválido para este exercício.");
        setStep(AppStep.UPLOAD_VIDEO);
        return;
      }
      
      setAnalysisResult(result);
      
      if (selectedExercise !== SPECIAL_EXERCISES.FREE_MODE) {
          try {
            const saveUrl = "https://testeai-732767853162.us-west1.run.app/api/historico";
            // Salvamos com o ID TÉCNICO (backendId) para consistência no banco
            const payload = {
              userId: currentUser.id,
              userName: currentUser.name,
              exercise: backendId, // Alterado para enviar o ID/Alias
              timestamp: Date.now(),
              result: { ...result, date: new Date().toISOString() }
            };
            await fetch(saveUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            
            try {
                const encodedExercise = encodeURIComponent(backendId);
                const historyUrl = `https://testeai-732767853162.us-west1.run.app/api/historico/${currentUser.id}?exercise=${encodedExercise}`;
                const historyResponse = await fetch(historyUrl, { method: "GET" });
                if (historyResponse.ok) {
                    const fullHistoryData: ExerciseRecord[] = await historyResponse.json();
                    setHistoryRecords(fullHistoryData);
                }
            } catch (e) {
            }

          } catch (saveError) {
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
            await fetchUserWorkouts(currentUser.id);
            setShowGenerateWorkoutForm(false);
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

  const handleGenerateDiet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setGeneratingDiet(true);
    try {
        const planHtml = await generateDietPlan(dietFormData);
        const response = await fetch("https://testeai-732767853162.us-west1.run.app/api/dietas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: currentUser.id,
                goal: dietFormData.goal,
                content: planHtml
            })
        });

        if (response.ok) {
            await fetchUserDiets(currentUser.id);
            setShowGenerateDietForm(false);
            const data = await response.json();
            setViewingDietHtml(data.content || planHtml);
            setShowDietModal(true);
        } else {
            throw new Error("Erro ao salvar dieta");
        }
    } catch (err: any) {
        alert("Erro ao gerar/salvar dieta: " + err.message);
    } finally {
        setGeneratingDiet(false);
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

  const handleDeleteDiet = async () => {
    if (!currentUser || savedDiets.length === 0) return;
    if (!confirm("Tem certeza que deseja apagar sua dieta atual?")) return;

    try {
        const dietId = savedDiets[0].id;
        const response = await fetch(`https://testeai-732767853162.us-west1.run.app/api/dietas/${dietId}`, {
            method: "DELETE"
        });

        if (response.ok) {
            setSavedDiets([]);
            setShowDietModal(false);
            setViewingDietHtml(null);
            alert("Dieta removida com sucesso.");
        }
    } catch (e) {
        alert("Erro ao remover dieta.");
    }
  };

  const handleGoBackToSelect = () => {
    clearSelectedMedia();
    setStep(AppStep.SELECT_EXERCISE);
  };

  const handleExerciseToggle = (exerciseId: string) => {
    if (selectedExercise === exerciseId) {
      setSelectedExercise(null);
    } else {
      setSelectedExercise(exerciseId);
    }
  };

  if (step === AppStep.LOGIN) return <Login onLogin={handleLogin} />;

  // Categorize exercises from the fetched list
  const standardExercises = exercisesList.filter(ex => ex.category !== 'SPECIAL');
  const postureExercise = exercisesList.find(ex => ex.alias === SPECIAL_EXERCISES.POSTURE);
  const bodyCompExercise = exercisesList.find(ex => ex.alias === SPECIAL_EXERCISES.BODY_COMPOSITION);

  // Access flags
  const hasPostureAccess = !!postureExercise;
  const hasBodyCompAccess = !!bodyCompExercise;

  // Check if selected exercise is 'special' mode (Allows Images) based on alias
  const selectedExerciseObj = exercisesList.find(e => e.id === selectedExercise);
  const isSpecialMode = selectedExerciseObj && 
    (selectedExerciseObj.alias === SPECIAL_EXERCISES.POSTURE || selectedExerciseObj.alias === SPECIAL_EXERCISES.BODY_COMPOSITION);

  // Get selected exercise display name
  const selectedExerciseName = selectedExercise === SPECIAL_EXERCISES.FREE_MODE
    ? "Análise Livre"
    : (selectedExerciseObj ? selectedExerciseObj.name : '');

  const getExerciseTip = () => {
    if (!selectedExercise) return "";
    const typeKey = selectedExercise === SPECIAL_EXERCISES.FREE_MODE 
        ? 'FREE_ANALYSIS_MODE' 
        : (selectedExerciseObj ? selectedExerciseObj.alias : 'SQUAT');
        
    const tips = EXERCISE_TIPS[typeKey] || EXERCISE_TIPS['FREE_ANALYSIS_MODE'] || ["Mantenha a postura correta."];
    return tips[currentTipIndex % tips.length];
  }

  // --- RENDER HELPERS (View Modal code unchanged) ---
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

  const renderDietModal = () => (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 overflow-y-auto animate-in fade-in backdrop-blur-sm">
      <div className="min-h-screen p-4 md:p-8 relative">
          <div className="flex justify-between items-center max-w-7xl mx-auto mb-6">
             <button 
                onClick={() => { setShowDietModal(false); setViewingDietHtml(null); }}
                className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
             >
                <ArrowLeft className="w-5 h-5" /> Voltar
             </button>
             <div className="flex gap-3">
                 <button onClick={() => window.print()} className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white">
                    <Printer className="w-5 h-5" />
                 </button>
                 <button onClick={handleDeleteDiet} className="p-2 bg-red-600 hover:bg-red-500 rounded-lg text-white">
                    <Trash2 className="w-5 h-5" />
                 </button>
             </div>
          </div>
          <div className="max-w-6xl mx-auto bg-slate-50 rounded-3xl p-8 shadow-2xl min-h-[80vh]">
             <style>{`
                 #diet-view-content { font-family: 'Plus Jakarta Sans', sans-serif; color: #1e293b; }
                 @media print {
                   body * { visibility: hidden; }
                   #diet-view-content, #diet-view-content * { visibility: visible; }
                   #diet-view-content { position: absolute; left: 0; top: 0; width: 100%; }
                 }
             `}</style>
             <div id="diet-view-content" dangerouslySetInnerHTML={{ __html: viewingDietHtml || (savedDiets[0]?.content || '') }} />
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

      {showWorkoutModal && renderWorkoutModal()}
      {showDietModal && renderDietModal()}
      {showGenerateWorkoutForm && (
        // ... (Render Form - No changes needed)
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md relative shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
             <button onClick={() => setShowGenerateWorkoutForm(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
               <X className="w-6 h-6" />
             </button>
             <div className="flex flex-col items-center mb-6">
               <div className="p-3 bg-blue-600/20 text-blue-400 rounded-full mb-3"><Dumbbell className="w-8 h-8" /></div>
               <h3 className="text-2xl font-bold text-white">Criar Ficha de Treino</h3>
               <p className="text-slate-400 text-center text-sm">A IA criará um plano personalizado para você.</p>
             </div>
             <form onSubmit={handleGenerateWorkout} className="space-y-4">
                {/* ... fields ... */}
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-slate-300 mb-1">Peso (kg)</label><input type="number" required step="0.1" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" value={workoutFormData.weight} onChange={e => setWorkoutFormData({...workoutFormData, weight: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium text-slate-300 mb-1">Altura (cm)</label><input type="number" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" value={workoutFormData.height} onChange={e => setWorkoutFormData({...workoutFormData, height: e.target.value})} /></div>
                </div>
                <div><label className="block text-sm font-medium text-slate-300 mb-1">Sexo Biológico</label><select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" value={workoutFormData.gender} onChange={e => setWorkoutFormData({...workoutFormData, gender: e.target.value})}><option value="masculino">Masculino</option><option value="feminino">Feminino</option></select></div>
                <div><label className="block text-sm font-medium text-slate-300 mb-1">Objetivo</label><select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" value={workoutFormData.goal} onChange={e => setWorkoutFormData({...workoutFormData, goal: e.target.value})}><option value="hipertrofia">Hipertrofia (Crescer)</option><option value="definicao">Definição (Secar)</option><option value="emagrecimento">Emagrecimento (Perder Peso)</option><option value="forca">Força Pura</option></select></div>
                <div><label className="block text-sm font-medium text-slate-300 mb-1">Nível de Experiência</label><select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" value={workoutFormData.level} onChange={e => setWorkoutFormData({...workoutFormData, level: e.target.value})}><option value="iniciante">Iniciante</option><option value="intermediario">Intermediário</option><option value="avancado">Avançado</option></select></div>
                <div><label className="block text-sm font-medium text-slate-300 mb-1">Dias por Semana</label><select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" value={workoutFormData.frequency} onChange={e => setWorkoutFormData({...workoutFormData, frequency: e.target.value})}><option value="2">2 dias</option><option value="3">3 dias</option><option value="4">4 dias</option><option value="5">5 dias</option><option value="6">6 dias</option></select></div>
                <div><label className="block text-sm font-medium text-slate-300 mb-1">Observações</label><textarea rows={3} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none placeholder-slate-500 text-sm" value={workoutFormData.observations} onChange={e => setWorkoutFormData({...workoutFormData, observations: e.target.value})} /><p className="text-[10px] text-slate-500 mt-1">A IA usará isso para adaptar ou remover exercícios.</p></div>
                <button type="submit" disabled={generatingWorkout} className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">{generatingWorkout ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}{generatingWorkout ? "Gerando..." : "Gerar Treino"}</button>
             </form>
          </div>
        </div>
      )}
      {showGenerateDietForm && (
        // ... (Render Diet Form - No changes needed)
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md relative shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
             <button onClick={() => setShowGenerateDietForm(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
             <div className="flex flex-col items-center mb-6"><div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-full mb-3"><Utensils className="w-8 h-8" /></div><h3 className="text-2xl font-bold text-white">Montar Dieta</h3><p className="text-slate-400 text-center text-sm">Cardápio personalizado com inteligência artificial.</p></div>
             <form onSubmit={handleGenerateDiet} className="space-y-4">
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-300 mb-1">Peso (kg)</label><input type="number" required step="0.1" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none" value={dietFormData.weight} onChange={e => setDietFormData({...dietFormData, weight: e.target.value})} /></div><div><label className="block text-sm font-medium text-slate-300 mb-1">Altura (cm)</label><input type="number" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none" value={dietFormData.height} onChange={e => setDietFormData({...dietFormData, height: e.target.value})} /></div></div>
                <div><label className="block text-sm font-medium text-slate-300 mb-1">Sexo Biológico</label><select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none" value={dietFormData.gender} onChange={e => setDietFormData({...dietFormData, gender: e.target.value})}><option value="masculino">Masculino</option><option value="feminino">Feminino</option></select></div>
                <div><label className="block text-sm font-medium text-slate-300 mb-1">Objetivo</label><select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none" value={dietFormData.goal} onChange={e => setDietFormData({...dietFormData, goal: e.target.value})}><option value="emagrecer">Emagrecer</option><option value="ganhar_massa">Hipertrofia</option><option value="manutencao">Manutenção</option><option value="definicao">Definição</option></select></div>
                <div><label className="block text-sm font-medium text-slate-300 mb-1">Observações</label><textarea rows={3} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none placeholder-slate-500 text-sm" value={dietFormData.observations} onChange={e => setDietFormData({...dietFormData, observations: e.target.value})} /><p className="text-[10px] text-slate-500 mt-1">A IA usará isso para personalizar os alimentos.</p></div>
                <button type="submit" disabled={generatingDiet} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">{generatingDiet ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}{generatingDiet ? "Gerando..." : "Gerar Dieta"}</button>
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
              
              {/* CARD DE TREINO DINÂMICO */}
              {loadingWorkouts ? (
                 <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-4 border-dashed border-2 border-slate-700/50 h-full min-h-[160px] animate-pulse">
                    <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
                    <span className="text-slate-500 text-xs">Buscando treinos...</span>
                 </div>
              ) : (
                savedWorkouts.length > 0 ? (
                  <button 
                    onClick={() => setShowWorkoutModal(true)}
                    className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all border-2 border-blue-500/30 hover:bg-blue-600/10 hover:border-blue-500 h-full min-h-[160px] group"
                  >
                     <div className="p-4 bg-blue-600 rounded-full text-white shadow-lg group-hover:scale-110 transition-transform"><Calendar className="w-8 h-8" /></div>
                     <div className="text-center"><h3 className="text-blue-400 font-bold text-xl">Ver Meu Treino</h3><p className="text-slate-400 text-xs mt-1">Ficha ativa disponível</p></div>
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowGenerateWorkoutForm(true)}
                    className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all border-2 border-blue-500/30 hover:bg-blue-600/10 hover:border-blue-500 h-full min-h-[160px] group"
                  >
                     <div className="p-4 bg-blue-600 rounded-full text-white shadow-lg group-hover:scale-110 transition-transform"><Dumbbell className="w-8 h-8" /></div>
                     <div className="text-center"><h3 className="text-blue-400 font-bold text-xl">Gerar Treino IA</h3><p className="text-slate-400 text-xs mt-1">Crie sua ficha personalizada</p></div>
                  </button>
                )
              )}

              {/* CARD DE DIETA DINÂMICO */}
              {loadingDiets ? (
                 <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-4 border-dashed border-2 border-slate-700/50 h-full min-h-[160px] animate-pulse">
                    <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
                    <span className="text-slate-500 text-xs">Buscando dietas...</span>
                 </div>
              ) : (
                savedDiets.length > 0 ? (
                  <button 
                    onClick={() => setShowDietModal(true)}
                    className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all border-2 border-emerald-500/30 hover:bg-emerald-600/10 hover:border-emerald-500 h-full min-h-[160px] group"
                  >
                     <div className="p-4 bg-emerald-600 rounded-full text-white shadow-lg group-hover:scale-110 transition-transform"><Utensils className="w-8 h-8" /></div>
                     <div className="text-center"><h3 className="text-emerald-400 font-bold text-xl">Ver Minha Dieta</h3><p className="text-slate-400 text-xs mt-1">Plano nutricional ativo</p></div>
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowGenerateDietForm(true)}
                    className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all border-2 border-emerald-500/30 hover:bg-emerald-600/10 hover:border-emerald-500 h-full min-h-[160px] group"
                  >
                     <div className="p-4 bg-emerald-600 rounded-full text-white shadow-lg group-hover:scale-110 transition-transform"><Utensils className="w-8 h-8" /></div>
                     <div className="text-center"><h3 className="text-emerald-400 font-bold text-xl">Gerar Dieta IA</h3><p className="text-slate-400 text-xs mt-1">Crie seu cardápio ideal</p></div>
                  </button>
                )
              )}

              {/* Card de Análise Livre */}
              <button 
                 onClick={() => handleExerciseToggle(SPECIAL_EXERCISES.FREE_MODE)}
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
            </div>
            
            <div className="w-full max-w-5xl flex gap-3 mb-8">
                {/* Posture Analysis Card */}
                {postureExercise && (
                  <button 
                    className={`glass-panel p-5 rounded-2xl flex items-center gap-4 group transition-all border-2 flex-1 text-left ${selectedExercise === postureExercise.id ? 'border-emerald-500 bg-emerald-600/20' : 'border-emerald-500/30 hover:bg-emerald-600/20'}`}
                    onClick={() => handleExerciseToggle(postureExercise.id)}
                  >
                     <div className={`p-3 rounded-full text-white shadow-lg transition-transform ${hasPostureAccess ? 'bg-emerald-600 group-hover:scale-110' : 'bg-slate-700'}`}><ScanLine className="w-5 h-5" /></div>
                     <div className="text-left"><h3 className="text-white font-bold text-lg">{postureExercise.name}</h3><p className="text-slate-400 text-xs">Biofeedback Postural</p></div>
                  </button>
                )}

                {/* Body Composition Card */}
                {bodyCompExercise && (
                  <button 
                    className={`glass-panel p-5 rounded-2xl flex items-center gap-4 group transition-all border-2 flex-1 text-left ${selectedExercise === bodyCompExercise.id ? 'border-violet-500 bg-violet-600/20' : 'border-violet-500/30 hover:bg-violet-600/20'}`}
                    onClick={() => handleExerciseToggle(bodyCompExercise.id)}
                  >
                     <div className={`p-3 rounded-full text-white shadow-lg transition-transform ${hasBodyCompAccess ? 'bg-violet-600 group-hover:scale-110' : 'bg-slate-700'}`}><Scale className="w-5 h-5" /></div>
                     <div className="text-left"><h3 className="text-white font-bold text-lg">{bodyCompExercise.name}</h3><p className="text-slate-400 text-xs">Biotipo & % Gordura</p></div>
                  </button>
                )}
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
                      key={ex.id} // Usa ID único
                      type={ex.name} 
                      // Usa ALIAS para imagem
                      imageUrl={exerciseImages[ex.alias] || DEFAULT_EXERCISE_IMAGES[ex.alias] || DEFAULT_EXERCISE_IMAGES['SQUAT']} 
                      selected={selectedExercise === ex.id} // Compara ID único
                      onClick={() => handleExerciseToggle(ex.id)} 
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

        {/* LOADING STATE UI - NEW COMPONENT */}
        {(step === AppStep.ANALYZING || step === AppStep.COMPRESSING) && selectedExercise && (
           <LoadingScreen 
                step={step} 
                tip={getExerciseTip()} 
                // Passa o ID canônico para que o LoadingScreen saiba qual ícone mostrar
                exerciseType={selectedExercise === SPECIAL_EXERCISES.FREE_MODE ? SPECIAL_EXERCISES.FREE_MODE : (selectedExerciseObj?.alias || 'STANDARD')} 
           />
        )}

        {step === AppStep.RESULTS && analysisResult && selectedExercise && (
          <ResultView 
            result={analysisResult} 
            // Passa o nome para exibição na tela de resultados
            exercise={selectedExercise === SPECIAL_EXERCISES.FREE_MODE ? "Análise Livre" : (selectedExerciseObj?.name || 'Exercício')} 
            history={historyRecords} // Passa o histórico atualizado
            userId={currentUser?.id || ''} // Added userId prop
            onReset={resetAnalysis}
            onDeleteRecord={handleDeleteRecord} // Passando a função também para o ResultView
            onWorkoutSaved={() => currentUser && fetchUserWorkouts(currentUser.id)} // Passa a função de recarregar treinos
            onDietSaved={() => currentUser && fetchUserDiets(currentUser.id)} // Passa a função de recarregar dietas
          />
        )}
      </main>
    </div>
  );
};

export default App;