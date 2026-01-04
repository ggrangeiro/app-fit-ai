import React, { useState, useEffect, useRef } from 'react';
import { AppStep, ExerciseType, AnalysisResult, User, ExerciseRecord, ExerciseDTO, SPECIAL_EXERCISES, WorkoutPlan, DietPlan } from './types';
import { analyzeVideo, generateWorkoutPlan, generateDietPlan } from './services/geminiService';
import { compressVideo } from './utils/videoUtils';
import { MockDataService } from './services/mockDataService';
import { apiService } from './services/apiService'; // NEW API SERVICE
import ExerciseCard from './components/ExerciseCard';
import { ResultView } from './components/ResultView';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import { Video, UploadCloud, Loader2, ArrowRight, Lightbulb, Sparkles, Smartphone, Zap, LogOut, User as UserIcon, ScanLine, Scale, Image as ImageIcon, AlertTriangle, ShieldCheck, RefreshCcw, X, History, Lock, HelpCircle, Dumbbell, Calendar, Trash2, Printer, ArrowLeft, Utensils, Footprints, BicepsFlexed, ArrowDownToLine, Flame, Shield, Activity, Timer, MoveDown, ChevronDown, CheckCircle2 } from 'lucide-react';
import { EvolutionModal } from './components/EvolutionModal';
import LoadingScreen from './components/LoadingScreen';
import Toast, { ToastType } from './components/Toast';
import ConfirmModal from './components/ConfirmModal';

// --- ICON MAPPING SYSTEM ---
const EXERCISE_ICONS: Record<string, React.ReactNode> = {
  // Legs / Agachamentos
  'SQUAT': <MoveDown />,
  'LUNGE': <Footprints />,
  'BULGARIAN_SQUAT': <Footprints />,
  'BRIDGE': <Activity />, // Pelvic bridge
  'DEADLIFT': <ArrowDownToLine />, // Pulling from ground

  // Arms / Upper Body
  'PUSHUP': <ArrowDownToLine className="rotate-180" />, // Pushing up
  'PULLUP': <ArrowDownToLine />,
  'TRICEP_DIP': <ArrowDownToLine />,
  'BICEP_CURL': <BicepsFlexed />,
  'BENCH_PRESS': <Dumbbell />,
  'CABLE_CROSSOVER': <Activity />,

  // Core
  'PLANK': <Shield />,
  'CRUNCH': <ShieldCheck />,

  // Cardio / HIIT
  'BURPEE': <Flame />,
  'JUMPING_JACK': <Activity />,
  'MOUNTAIN_CLIMBER': <Timer />,

  // Special
  'POSTURE_ANALYSIS': <ScanLine />,
  'BODY_COMPOSITION': <Scale />,
  'FREE_ANALYSIS_MODE': <Sparkles />,
  
  // Default Fallback
  'DEFAULT': <Dumbbell />
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
  'FREE_ANALYSIS_MODE': ["Certifique-se que o corpo todo aparece.", "Boa iluminação ajuda na detecção.", "Execute o movimento completo."],
  'DEFAULT': ["Mantenha a postura correta.", "Respire de forma controlada.", "Concentre-se na execução."]
};

const App: React.FC = () => {
  // --- INICIALIZAÇÃO ROBUSTA DE ESTADO (CORREÇÃO F5) ---
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // Lê DIRETAMENTE do localStorage na inicialização para evitar delay/logout
    try {
      const stored = localStorage.getItem('fitai_current_session');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const [step, setStep] = useState<AppStep>(() => {
    try {
      // Determina o passo inicial baseado no localStorage também
      const stored = localStorage.getItem('fitai_current_session');
      if (stored) {
        const user = JSON.parse(stored);
        // Se for admin OU personal, vai para dashboard
        if (user.role === 'admin' || user.role === 'personal') {
            return AppStep.ADMIN_DASHBOARD;
        }
        return AppStep.SELECT_EXERCISE;
      }
      return AppStep.LOGIN;
    } catch (e) {
      return AppStep.LOGIN;
    }
  });

  // UI States
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [historyRecords, setHistoryRecords] = useState<ExerciseRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [showEvolutionModal, setShowEvolutionModal] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Accordion State - INICIA FECHADO (false) PARA MINIMIZAR POLUIÇÃO
  const [showExerciseList, setShowExerciseList] = useState(false);

  // Data States
  const [exercisesList, setExercisesList] = useState<ExerciseDTO[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [savedWorkouts, setSavedWorkouts] = useState<WorkoutPlan[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);
  const [savedDiets, setSavedDiets] = useState<DietPlan[]>([]);
  const [loadingDiets, setLoadingDiets] = useState(false);

  // Modal States
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showGenerateWorkoutForm, setShowGenerateWorkoutForm] = useState(false);
  const [generatingWorkout, setGeneratingWorkout] = useState(false);
  const [viewingWorkoutHtml, setViewingWorkoutHtml] = useState<string | null>(null);
  const [showDietModal, setShowDietModal] = useState(false);
  const [showGenerateDietForm, setShowGenerateDietForm] = useState(false);
  const [generatingDiet, setGeneratingDiet] = useState(false);
  const [viewingDietHtml, setViewingDietHtml] = useState<string | null>(null);

  // Forms
  const [workoutFormData, setWorkoutFormData] = useState({
    weight: '', height: '', goal: 'hipertrofia', level: 'iniciante', frequency: '4', observations: '', gender: 'masculino'
  });
  const [dietFormData, setDietFormData] = useState({
    weight: '', height: '', goal: 'emagrecer', gender: 'masculino', observations: ''
  });
  
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '', type: 'info', isVisible: false
  });
  
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    onConfirm: () => void; 
    isDestructive?: boolean;
  }>({
    isOpen: false, title: '', message: '', onConfirm: () => {}, isDestructive: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- DERIVED STATE ---
  const standardExercises = exercisesList.filter(e => e.category === 'STANDARD');
  
  const postureExercise = exercisesList.find(e => e.alias === SPECIAL_EXERCISES.POSTURE || e.id === SPECIAL_EXERCISES.POSTURE);
  const bodyCompExercise = exercisesList.find(e => e.alias === SPECIAL_EXERCISES.BODY_COMPOSITION || e.id === SPECIAL_EXERCISES.BODY_COMPOSITION);
  
  const hasPostureAccess = !!postureExercise;
  const hasBodyCompAccess = !!bodyCompExercise;

  const selectedExerciseObj = exercisesList.find(e => e.id === selectedExercise);
  
  const isSpecialMode = (selectedExercise === SPECIAL_EXERCISES.FREE_MODE) || (selectedExerciseObj?.category === 'SPECIAL');
  
  const isSelectedInStandard = !!selectedExerciseObj && selectedExerciseObj.category === 'STANDARD';

  const selectedExerciseName = selectedExercise === SPECIAL_EXERCISES.FREE_MODE 
     ? 'Análise Livre' 
     : (selectedExerciseObj?.name || 'Exercício Selecionado');

  const getExerciseTip = () => {
      if (!selectedExercise) return "Prepare-se...";
      const alias = selectedExercise === SPECIAL_EXERCISES.FREE_MODE ? SPECIAL_EXERCISES.FREE_MODE : (selectedExerciseObj?.alias || 'DEFAULT');
      // Garante um fallback seguro se a chave não existir
      const tips = EXERCISE_TIPS[alias] || EXERCISE_TIPS['DEFAULT'] || ["Aguarde a análise da IA..."];
      return tips[currentTipIndex % tips.length];
  };

  // --- SAFETY CHECK FOR SESSION PERSISTENCE ---
  // Mantém este effect como backup caso o estado inicial falhe por algum motivo raro
  useEffect(() => {
    if (!currentUser) {
       const stored = localStorage.getItem('fitai_current_session');
       if (stored) {
           try {
             const storedUser = JSON.parse(stored);
             setCurrentUser(storedUser);
             // Redirecionamento baseado em role
             if (storedUser.role === 'admin' || storedUser.role === 'personal') {
                 setStep(AppStep.ADMIN_DASHBOARD);
             } else {
                 setStep(AppStep.SELECT_EXERCISE);
             }
           } catch(e) {
             // Se falhar o parse, deixa como está (login)
           }
       }
    }
  }, []);

  // --- HELPER FUNCTIONS FOR UI ---
  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type, isVisible: true });
  };

  const closeToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, isDestructive = false) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      isDestructive
    });
  };

  const loadExercisesList = async (user: User) => {
    setLoadingExercises(true);
    try {
      if (user.role === 'admin' || user.role === 'personal') {
         // Admins e Personais carregam lista completa
         try {
           const allEx = await apiService.getAllExercises();
           if(allEx.length > 0) {
             const mapped = allEx.map((e: any) => ({
                 id: String(e.id),
                 alias: e.name.toUpperCase().replace(/\s+/g, '_'), 
                 name: e.name,
                 category: 'STANDARD'
             }));
             setExercisesList(mapped);
             return;
           }
         } catch(e) {}
         
         const exercises = await MockDataService.fetchExercises();
         setExercisesList(exercises);
      } else {
         try {
            const myExercisesV2 = await apiService.getUserExercises(user.id);
            if(myExercisesV2.length > 0) {
                const mapped = myExercisesV2.map((e: any) => ({
                    id: String(e.id),
                    alias: e.name.toUpperCase().replace(/\s+/g, '_'),
                    name: e.name,
                    category: 'STANDARD'
                }));
                setExercisesList(mapped);
                return;
            }
         } catch(e) {}

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
      const workouts = await apiService.getTrainings(userId);
      setSavedWorkouts(workouts);
    } catch (e) {
      setSavedWorkouts([]);
    } finally {
      setLoadingWorkouts(false);
    }
  };

  const fetchUserDiets = async (userId: string) => {
    setLoadingDiets(true);
    try {
      const diets = await apiService.getDiets(userId);
      setSavedDiets(diets);
    } catch (e) {
      setSavedDiets([]);
    } finally {
      setLoadingDiets(false);
    }
  };

  useEffect(() => {
    const initData = async () => {
      if (currentUser) {
        await loadExercisesList(currentUser);
        await fetchUserWorkouts(currentUser.id);
        await fetchUserDiets(currentUser.id);
      }
    };
    initData();
  }, [currentUser]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (step === AppStep.ANALYZING || step === AppStep.COMPRESSING) {
      interval = setInterval(() => {
        setCurrentTipIndex((prev) => {
          if (!selectedExercise) return 0;
          const exerciseObj = exercisesList.find(e => e.id === selectedExercise);
          const typeKey = exerciseObj ? exerciseObj.alias : 'FREE_ANALYSIS_MODE';
          // Fallback seguro também no intervalo
          const tips = EXERCISE_TIPS[typeKey] || EXERCISE_TIPS['DEFAULT'] || ["Mantenha a postura correta."];
          return (prev + 1) % tips.length;
        });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [step, selectedExercise, exercisesList]);


  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'admin' || user.role === 'personal') {
        setStep(AppStep.ADMIN_DASHBOARD);
    } else {
        setStep(AppStep.SELECT_EXERCISE);
    }
    showToast(`Bem-vindo, ${user.name || 'Usuário'}!`, 'success');
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

  const handleExerciseToggle = (id: string) => {
    if (selectedExercise === id) {
        setSelectedExercise(null);
    } else {
        setSelectedExercise(id);
        setMediaFile(null);
        if (mediaPreview) {
            URL.revokeObjectURL(mediaPreview);
        }
        setMediaPreview(null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleViewHistory = async () => {
    if (!selectedExercise || !currentUser) return;
    if (selectedExercise === SPECIAL_EXERCISES.FREE_MODE) return;

    setLoadingHistory(true);
    try {
        const exerciseObj = exercisesList.find(e => e.id === selectedExercise);
        const idToSend = exerciseObj ? exerciseObj.alias : selectedExercise;
        
        // --- CORREÇÃO: Usar apiService que já inclui os parâmetros de autenticação (requesterId/Role) ---
        const data = await apiService.getUserHistory(currentUser.id, idToSend);
        
        if (data && data.length > 0) {
            // Se vier objeto agrupado, tenta pegar array flat ou apenas os valores
            const records = Array.isArray(data) ? data : Object.values(data).flat();
            const sorted = (records as ExerciseRecord[]).sort((a, b) => b.timestamp - a.timestamp);
            setHistoryRecords(sorted);
            setShowEvolutionModal(true);
        } else {
            showToast("Você ainda não realizou este exercício.", 'info');
        }

    } catch (e) {
        showToast("Erro de conexão ao buscar histórico.", 'error');
    } finally {
        setLoadingHistory(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!currentUser) return;
    const success = await MockDataService.deleteRecord(currentUser.id, recordId);
    if (success) {
        setHistoryRecords(prev => prev.filter(r => r.id !== recordId));
        showToast("Registro removido com sucesso.", 'success');
        // Close modal if no records left
        if (historyRecords.length <= 1) setShowEvolutionModal(false);
    } else {
        showToast("Erro ao remover registro.", 'error');
    }
  };

  const handleAnalysis = async () => {
    if (!mediaFile || !selectedExercise || !currentUser) return;

    const exerciseObj = exercisesList.find(e => e.id === selectedExercise);
    let aiContextName = selectedExercise;
    let backendId = selectedExercise;
    
    if (selectedExercise === SPECIAL_EXERCISES.FREE_MODE) {
        aiContextName = "Análise Livre";
        backendId = SPECIAL_EXERCISES.FREE_MODE;
    } else if (exerciseObj) {
        aiContextName = exerciseObj.name;
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
            // --- CORREÇÃO: Usar apiService para buscar histórico prévio com os parâmetros corretos ---
            const historyData = await apiService.getUserHistory(currentUser.id, backendId);
            
            if (historyData) {
               const records = Array.isArray(historyData) ? historyData : Object.values(historyData).flat() as ExerciseRecord[];
               if (records.length > 0) {
                   // Sort descending to get latest
                   records.sort((a, b) => b.timestamp - a.timestamp);
                   previousRecord = records[0];
               }
            }
          } catch (histErr) {
          }
      }

      const result = await analyzeVideo(finalFile, aiContextName, previousRecord?.result);
      
      if (!result.isValidContent) {
        setError(result.validationError || "Conteúdo inválido para este exercício.");
        setStep(AppStep.UPLOAD_VIDEO);
        return;
      }
      
      setAnalysisResult(result);
      
      if (selectedExercise !== SPECIAL_EXERCISES.FREE_MODE) {
          try {
            const payload = {
              userId: currentUser.id,
              userName: currentUser.name,
              exercise: backendId,
              timestamp: Date.now(),
              result: { ...result, date: new Date().toISOString() }
            };
            
            // USE APISERVICE TO SAVE HISTORY (Auto-handles requester logic)
            await apiService.saveHistory(payload);
            
            try {
                // --- CORREÇÃO: Re-busca com apiService para garantir lista atualizada ---
                const fullHistoryData = await apiService.getUserHistory(currentUser.id, backendId);
                
                if (fullHistoryData) {
                    const records = Array.isArray(fullHistoryData) ? fullHistoryData : Object.values(fullHistoryData).flat() as ExerciseRecord[];
                    setHistoryRecords(records.sort((a, b) => b.timestamp - a.timestamp));
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
        // Usa apiService para criar e refresh, sem fallbacks quebrados
        await apiService.createTraining(currentUser.id, planHtml, workoutFormData.goal);
        await fetchUserWorkouts(currentUser.id);
        showToast("Treino gerado com sucesso!", 'success');

        setShowGenerateWorkoutForm(false);
        setViewingWorkoutHtml(planHtml);
        setShowWorkoutModal(true);
        
    } catch (err: any) {
        showToast("Erro ao gerar treino: " + err.message, 'error');
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
        
        // Usa apiService para criar e refresh
        await apiService.createDiet(currentUser.id, planHtml, dietFormData.goal);
        await fetchUserDiets(currentUser.id);
        showToast("Dieta gerada com sucesso!", 'success');

        setShowGenerateDietForm(false);
        setViewingDietHtml(planHtml);
        setShowDietModal(true);
        
    } catch (err: any) {
        showToast("Erro ao gerar dieta: " + err.message, 'error');
    } finally {
        setGeneratingDiet(false);
    }
  };

  const confirmDeleteWorkout = () => {
    triggerConfirm(
        "Excluir Treino Atual?",
        "Você perderá sua ficha de treino atual permanentemente. Deseja continuar?",
        async () => {
            if (!currentUser || savedWorkouts.length === 0) return;
            const workoutId = savedWorkouts[0].id;

            try {
                await apiService.deleteTraining(currentUser.id, workoutId);
                setSavedWorkouts([]);
                setShowWorkoutModal(false);
                setViewingWorkoutHtml(null);
                showToast("Treino removido com sucesso.", 'success');
            } catch (e) {
                showToast("Erro ao remover treino.", 'error');
            }
        },
        true 
    );
  };

  const confirmDeleteDiet = () => {
    triggerConfirm(
        "Excluir Dieta Atual?",
        "Você perderá seu plano nutricional atual permanentemente. Deseja continuar?",
        async () => {
            if (!currentUser || savedDiets.length === 0) return;
            const dietId = savedDiets[0].id;
            
            try {
                await apiService.deleteDiet(currentUser.id, dietId);
                setSavedDiets([]);
                setShowDietModal(false);
                setViewingDietHtml(null);
                showToast("Dieta removida com sucesso.", 'success');
            } catch (e) {
                showToast("Erro ao remover dieta.", 'error');
            }
        },
        true 
    );
  };

  const handleGoBackToSelect = () => {
    clearSelectedMedia();
    setStep(AppStep.SELECT_EXERCISE);
  };

  if (step === AppStep.LOGIN) return (
    <>
      <Login onLogin={handleLogin} showToast={showToast} />
      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={closeToast} />
    </>
  );

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
                 <button onClick={confirmDeleteWorkout} className="p-2 bg-red-600 hover:bg-red-500 rounded-lg text-white">
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
                 <button onClick={confirmDeleteDiet} className="p-2 bg-red-600 hover:bg-red-500 rounded-lg text-white">
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
      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={closeToast} />
      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        title={confirmModal.title} 
        message={confirmModal.message} 
        onConfirm={confirmModal.onConfirm} 
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
      />

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
                  <p className="text-xs text-slate-400 capitalize">
                      {currentUser?.role === 'admin' ? 'Administrador' : (currentUser?.role === 'personal' ? 'Personal Trainer' : 'Aluno')}
                  </p>
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
      
      {/* Evolution Modal Rendering */}
      {showEvolutionModal && selectedExercise && (
        <EvolutionModal 
          isOpen={showEvolutionModal}
          onClose={() => setShowEvolutionModal(false)}
          history={historyRecords}
          exerciseType={exercisesList.find(e => e.id === selectedExercise)?.name || selectedExercise}
          highlightLatestAsCurrent={false}
          onDelete={handleDeleteRecord}
          triggerConfirm={triggerConfirm}
        />
      )}

      {/* Renderização Condicional baseada no Role */}
      <main className="flex-grow flex items-center justify-center p-4 md:p-8">
        
        {/* DASHBOARD PARA ADMIN E PERSONAL */}
        {step === AppStep.ADMIN_DASHBOARD && (currentUser?.role === 'admin' || currentUser?.role === 'personal') && (
          <AdminDashboard currentUser={currentUser} onRefreshData={() => {}} />
        )}

        {/* FLUXO DE ALUNO (SELEÇÃO DE EXERCÍCIO) */}
        {step === AppStep.SELECT_EXERCISE && (
          <div className="w-full max-w-6xl animate-fade-in flex flex-col items-center">
            
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold uppercase mb-4 border border-blue-500/20">
                <Sparkles className="w-3 h-3" /> Sua Área de Treino
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white">Olá! <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">O que vamos fazer hoje?</span></h2>
            </div>
            
            {/* ... Restante do código de seleção de exercício (igual ao anterior) ... */}
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

            {/* --- ACCORDION CONTAINER FOR EXERCISE LIST --- */}
            <div className="w-full max-w-5xl mb-12">
               <button
                  onClick={() => setShowExerciseList(!showExerciseList)}
                  className={`w-full glass-panel p-4 md:p-6 rounded-2xl flex items-center justify-between group hover:bg-slate-800/60 transition-all border ${isSelectedInStandard ? 'border-blue-500/40 bg-blue-900/10' : 'border-slate-700/50'}`}
               >
                  <div className="flex items-center gap-4">
                     <div className={`p-3 rounded-full transition-colors ${isSelectedInStandard ? 'bg-blue-600 text-white' : 'bg-blue-600/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white'}`}>
                        {isSelectedInStandard ? <CheckCircle2 className="w-6 h-6" /> : <Dumbbell className="w-6 h-6" />}
                     </div>
                     <div className="text-left">
                        <h3 className={`font-bold text-lg ${isSelectedInStandard ? 'text-blue-400' : 'text-white'}`}>
                           {isSelectedInStandard ? 'Exercício Selecionado' : 'Exercícios de Força'}
                        </h3>
                        <p className="text-slate-400 text-xs">
                           {isSelectedInStandard ? 'Toque para alterar' : `${standardExercises.length} disponíveis`}
                        </p>
                     </div>
                  </div>
                  <div className={`p-2 rounded-full bg-slate-800 text-slate-400 transition-transform duration-300 ${showExerciseList ? 'rotate-180' : ''}`}>
                     <ChevronDown className="w-5 h-5" />
                  </div>
               </button>

               <div className={`grid transition-all duration-500 ease-in-out overflow-hidden ${showExerciseList ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                   <div className="overflow-hidden">
                       <div id="exercise-grid" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full min-h-[10px] pb-2">
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
                                  // USA O ÍCONE MAPEADO OU UM FALLBACK
                                  icon={EXERCISE_ICONS[ex.alias] || <Dumbbell />}
                                  selected={selectedExercise === ex.id} 
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
                   </div>
               </div>
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

        {/* ... (Step UPLOAD_VIDEO mantido) ... */}
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

        {(step === AppStep.ANALYZING || step === AppStep.COMPRESSING) && selectedExercise && (
           <LoadingScreen 
                step={step} 
                tip={getExerciseTip()} 
                exerciseType={selectedExercise === SPECIAL_EXERCISES.FREE_MODE ? SPECIAL_EXERCISES.FREE_MODE : (selectedExerciseObj?.alias || 'STANDARD')} 
           />
        )}

        {step === AppStep.RESULTS && analysisResult && selectedExercise && (
          <ResultView 
            result={analysisResult} 
            exercise={selectedExercise === SPECIAL_EXERCISES.FREE_MODE ? SPECIAL_EXERCISES.FREE_MODE : (selectedExerciseObj?.name || 'Exercício')} 
            history={historyRecords} 
            userId={currentUser?.id || ''} 
            onReset={resetAnalysis}
            onDeleteRecord={handleDeleteRecord} 
            onWorkoutSaved={() => currentUser && fetchUserWorkouts(currentUser.id)} 
            onDietSaved={() => currentUser && fetchUserDiets(currentUser.id)} 
            showToast={showToast}
            triggerConfirm={triggerConfirm}
          />
        )}
      </main>
    </div>
  );
};

export default App;