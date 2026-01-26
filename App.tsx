import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppStep, ExerciseType, AnalysisResult, User, ExerciseRecord, ExerciseDTO, SPECIAL_EXERCISES, WorkoutPlan, DietPlan, WorkoutDayV2, WorkoutPlanV2 } from './types';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import {
  analyzeVideo,
  generateWorkoutPlan,
  generateDietPlan,
  resetGeminiInstance,
  regenerateWorkoutPlan,
  regenerateDietPlan,
  regenerateWorkoutPlanV2,
  regenerateDietPlanV2,
  extractWorkoutDataFromHtml
} from './services/geminiService';
import { compressVideo } from './utils/videoUtils';
import { MockDataService } from './services/mockDataService';
import { apiService } from './services/apiService'; // NEW API SERVICE
import { shareAsPdf } from './utils/pdfUtils';
import ExerciseCard from './components/ExerciseCard';
import { ResultView } from './components/ResultView';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';
import AdminDashboard from './components/AdminDashboard';
import { NotificationCenter } from './components/NotificationCenter';
import { Video, UploadCloud, Loader2, ArrowRight, Lightbulb, Sparkles, Smartphone, Zap, LogOut, User as UserIcon, ScanLine, Scale, Image as ImageIcon, AlertTriangle, ShieldCheck, RefreshCcw, X, History, Lock, HelpCircle, Dumbbell, Calendar, Trash2, Printer, ArrowLeft, Utensils, Flame, Shield, Activity, Timer, ChevronDown, CheckCircle2, Coins, Check, Share2, CheckCircle, ThumbsUp, RefreshCw, MessageCircle, Wand2 } from 'lucide-react';
import { EvolutionModal } from './components/EvolutionModal';
import { OnboardingGuide } from './components/OnboardingGuide';
import Toast, { ToastType } from './components/Toast';
import ConfirmModal from './components/ConfirmModal';
import BuyCreditsModal from './components/BuyCreditsModal';
import { WeeklyCheckInTracker } from './components/WeeklyCheckInTracker';
import LoadingScreen from './components/LoadingScreen';
import { SubscriptionModal } from './components/SubscriptionModal';
import { PaymentCallback } from './components/PaymentCallback';
import { AnamnesisModal } from './components/AnamnesisModal';
import EvolutionPhotosModal from './components/EvolutionPhotosModal';
import { AchievementsModal } from './components/AchievementsModal';
import { Camera, ClipboardList, PlayCircle, Trophy } from 'lucide-react';
import { getFullImageUrl } from './utils/imageUtils';
import { WorkoutSession } from './components/WorkoutSession';
import { getCurrentLocation } from './utils/geolocation';

// --- ICON MAPPING SYSTEM ---
const EXERCISE_ICONS: Record<string, React.ReactNode> = {
  // Legs / Agachamentos
  'SQUAT': <ChevronDown />,
  'LUNGE': <Activity />,
  'BULGARIAN_SQUAT': <Activity />,
  'BRIDGE': <Activity />, // Pelvic bridge
  'DEADLIFT': <ChevronDown />, // Pulling from ground

  // Arms / Upper Body
  'PUSHUP': <ChevronDown className="rotate-180" />, // Pushing up
  'PULLUP': <ChevronDown />,
  'TRICEP_DIP': <ChevronDown />,
  'BICEP_CURL': <Dumbbell />,
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

import { secureStorage } from './utils/secureStorage'; // Import secureStorage

// ... (imports)

const App: React.FC = () => {
  // --- INICIALIZAÇÃO ROBUSTA DE ESTADO (CORREÇÃO F5) ---
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // Lê via secureStorage na inicialização
    return secureStorage.getItem<User>('fitai_current_session');
  });

  const [step, setStep] = useState<AppStep>(() => {
    try {
      // Check for Payment Callback URL params first
      if (window.location.search.includes('collection_status') || window.location.search.includes('status=')) {
        return AppStep.PAYMENT_CALLBACK;
      }

      // Determina o passo inicial baseada no secureStorage
      const user = secureStorage.getItem<User>('fitai_current_session');
      if (user) {
        // CORREÇÃO CRÍTICA: Checar se já viu o onboarding ANTES de definir o dashboard
        const hasSeenOnboarding = secureStorage.getItem<string>('hasSeenOnboarding_v6');
        if (!hasSeenOnboarding) {
          return AppStep.ONBOARDING;
        }

        // Se for admin OU personal OU professor, vai para dashboard
        if (user.role === 'admin' || user.role === 'personal' || user.role === 'professor') {
          return AppStep.ADMIN_DASHBOARD;
        }
        return AppStep.SELECT_EXERCISE;
      }
      return AppStep.LOGIN;
    } catch (e) {
      return AppStep.LOGIN;
    }
  });


  // --- INITIALIZATION CHECK ---
  useEffect(() => {
    // Check if user is already logged in on mount and redirect if needed
    if (currentUser && step === AppStep.LOGIN) {
      // Priority to Payment Callback
      if (window.location.search.includes('collection_status') || window.location.search.includes('status=')) {
        setStep(AppStep.PAYMENT_CALLBACK);
        return;
      }

      const hasSeen = secureStorage.getItem<string>('hasSeenOnboarding_v6');
      if (!hasSeen) {
        setStep(AppStep.ONBOARDING);
      } else if (currentUser.role === 'admin' || currentUser.role === 'personal' || currentUser.role === 'professor') {
        setStep(AppStep.ADMIN_DASHBOARD);
      } else {
        setStep(AppStep.SELECT_EXERCISE);
      }
    }
  }, []);

  // Access Logic for Evolution Photos
  const canAccessEvolution = (
    (currentUser?.plan?.status === 'ACTIVE' && currentUser?.plan?.type !== 'FREE') ||
    !!currentUser?.personalId ||
    ['admin', 'personal', 'professor'].includes(currentUser?.role || '')
  );

  const handleOnboardingComplete = () => {
    secureStorage.setItem('hasSeenOnboarding_v6', 'true');
    if (currentUser?.role === 'admin' || currentUser?.role === 'personal' || currentUser?.role === 'professor') {
      setStep(AppStep.ADMIN_DASHBOARD);
    } else {
      setStep(AppStep.SELECT_EXERCISE);
    }
  };


  // --- ARQUIVO SELECIONADO (PARA UPLOAD) ---
  // UI States
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [historyRecords, setHistoryRecords] = useState<ExerciseRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [showEvolutionModal, setShowEvolutionModal] = useState(false);
  const [showEvolutionPhotosModal, setShowEvolutionPhotosModal] = useState(false);
  const [showRedoModal, setShowRedoModal] = useState(false);
  const [redoFeedback, setRedoFeedback] = useState('');
  const [redoCount, setRedoCount] = useState(0);

  const handleRedoWorkout = async () => {
    // Validation
    if (!currentUser) {
      showToast('Usuário não autenticado.', 'error');
      return;
    }
    if (!redoFeedback.trim()) {
      showToast('Por favor, descreva o que deseja alterar no treino.', 'error');
      return;
    }

    // Get workout content - either from savedWorkouts or from the currently viewing HTML
    const currentWorkout = savedWorkouts.length > 0 ? savedWorkouts[0] : null;
    const workoutContent = currentWorkout?.content || viewingWorkoutHtml;
    const workoutDaysData = currentWorkout?.daysData || null;

    // If no workout content available, exit
    if (!workoutContent && !workoutDaysData) {
      showToast('Nenhum treino disponível para refazer.', 'error');
      return;
    }

    setGeneratingWorkout(true);
    try {
      let newHtml = '';

      if (workoutDaysData) {
        // V2 Workout (JSON)
        const updatedV2 = await regenerateWorkoutPlanV2(
          workoutDaysData,
          redoFeedback,
          currentUser,
          currentUser.id,
          currentUser.role
        );
        newHtml = `<pre class="bg-slate-900 p-4 rounded-lg overflow-x-auto text-xs text-emerald-400 font-mono">${JSON.stringify(updatedV2, null, 2)}</pre>`;
      } else {
        // V1 Workout (HTML) - use workoutContent which could be from savedWorkouts or viewingWorkoutHtml
        newHtml = await regenerateWorkoutPlan(
          workoutContent!,
          redoFeedback,
          currentUser,
          currentUser.id,
          currentUser.role
        );
      }

      setViewingWorkoutHtml(newHtml);

      // Update savedWorkouts array to persist the regenerated content locally
      if (savedWorkouts.length > 0 && currentUser) {
        const workoutId = savedWorkouts[0].id;
        const workoutGoal = savedWorkouts[0].goal || currentUser.goal || 'fitness';

        // Save to backend using DELETE + POST pattern
        try {
          // Delete old workout
          await apiService.deleteTraining(currentUser.id, Number(workoutId));
          // Create new workout with regenerated content
          const newWorkout = await apiService.createTraining(currentUser.id, newHtml, workoutGoal);

          // Update local state with new workout data (including new ID)
          setSavedWorkouts(prevWorkouts => {
            const updated = [...prevWorkouts];
            updated[0] = { ...updated[0], id: newWorkout.id, content: newHtml };
            return updated;
          });
        } catch (saveError) {
          console.warn('Failed to save to backend:', saveError);
          // Still update locally even if backend fails
          setSavedWorkouts(prevWorkouts => {
            const updated = [...prevWorkouts];
            updated[0] = { ...updated[0], content: newHtml };
            return updated;
          });
        }
      }

      setShowRedoModal(false);
      setRedoFeedback('');
      setRedoCount(prev => prev + 1);

      showToast('Treino ajustado com sucesso!', 'success');

    } catch (error: any) {
      showToast('Erro ao ajustar treino: ' + error.message, 'error');
    } finally {
      setGeneratingWorkout(false);
    }
  };

  const handleRedoDiet = async () => {
    // Check for basic requirements
    if (!currentUser || !redoFeedback.trim()) return;

    // Get diet content - either from savedDiets or from the currently viewing HTML
    const currentDiet = savedDiets.length > 0 ? savedDiets[0] : null;
    const dietContent = currentDiet?.content || viewingDietHtml;
    const dietDaysData = currentDiet?.daysData || null;

    // If no diet content available, exit
    if (!dietContent && !dietDaysData) {
      showToast('Nenhuma dieta disponível para refazer.', 'error');
      return;
    }

    setGeneratingDiet(true);
    try {
      let newHtml = '';

      if (dietDaysData) {
        // V2 Diet (JSON) - use V2 regeneration
        const updatedV2 = await regenerateDietPlanV2(
          dietDaysData,
          redoFeedback,
          currentUser,
          currentUser.id,
          currentUser.role
        );
        newHtml = `<pre class="bg-slate-900 p-4 rounded-lg overflow-x-auto text-xs text-emerald-400 font-mono">${JSON.stringify(updatedV2, null, 2)}</pre>`;
      } else {
        // V1 Diet (HTML) - use dietContent which could be from savedDiets or viewingDietHtml
        newHtml = await regenerateDietPlan(
          dietContent!,
          redoFeedback,
          currentUser,
          currentUser.id,
          currentUser.role
        );
      }

      setViewingDietHtml(newHtml);

      // Update savedDiets array to persist the regenerated content locally
      if (savedDiets.length > 0 && currentUser) {
        const dietId = savedDiets[0].id;
        const dietGoal = savedDiets[0].goal || currentUser.goal || 'emagrecer';

        // Save to backend using DELETE + POST pattern
        try {
          // Delete old diet
          await apiService.deleteDiet(currentUser.id, Number(dietId));
          // Create new diet with regenerated content
          const newDiet = await apiService.createDiet(currentUser.id, newHtml, dietGoal);

          // Update local state with new diet data (including new ID)
          setSavedDiets(prevDiets => {
            const updated = [...prevDiets];
            updated[0] = { ...updated[0], id: newDiet.id, content: newHtml };
            return updated;
          });
        } catch (saveError) {
          console.warn('Failed to save diet to backend:', saveError);
          // Still update locally even if backend fails
          setSavedDiets(prevDiets => {
            const updated = [...prevDiets];
            updated[0] = { ...updated[0], content: newHtml };
            return updated;
          });
        }
      }

      setShowRedoModal(false);
      setRedoFeedback('');
      setRedoCount(prev => prev + 1);

      showToast('Dieta ajustada com sucesso!', 'success');

    } catch (error: any) {
      showToast('Erro ao ajustar dieta: ' + error.message, 'error');
    } finally {
      setGeneratingDiet(false);
    }
  };
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showAnamnesisModal, setShowAnamnesisModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [isOffline, setIsOffline] = useState(!window.navigator.onLine);

  // Password Reset Token Detection
  const [resetToken, setResetToken] = useState<string | null>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('token');
  });

  // Deep Link Listener for real-time URL changes
  useEffect(() => {
    const setupDeepLink = async () => {
      CapApp.addListener('appUrlOpen', (event: any) => {
        // Ex: http://localhost:5173/?token=xxx
        const url = new URL(event.url);
        const token = url.searchParams.get('token');
        if (token) {
          setResetToken(token);
        }

        // Handle deep link callback for payment
        if (url.searchParams.has('collection_status') || url.searchParams.has('status')) {
          setStep(AppStep.PAYMENT_CALLBACK);
        }
      });
    };
    setupDeepLink();

    return () => {
      CapApp.removeAllListeners();
    };
  }, []);


  // Accordion State - INICIA FECHADO (false) PARA MINIMIZAR POLUIÇÃO
  const [showExerciseList, setShowExerciseList] = useState(false);

  // Data States
  const [exercisesList, setExercisesList] = useState<ExerciseDTO[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [savedWorkouts, setSavedWorkouts] = useState<WorkoutPlan[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);
  const [savedDiets, setSavedDiets] = useState<DietPlan[]>([]);
  const [loadingDiets, setLoadingDiets] = useState(false);
  const [previousLoads, setPreviousLoads] = useState<Record<string, { actualLoad: string; executedAt: number }>>({});

  // Calculate weekly goal based on training days from the active workout plan
  const calculatedWeeklyGoal = useMemo(() => {
    if (savedWorkouts.length > 0) {
      try {
        const sortedPlans = [...savedWorkouts].sort((a, b) => b.id - a.id);
        const activePlan = sortedPlans[0];
        if (activePlan.daysData) {
          const parsed = typeof activePlan.daysData === 'string'
            ? JSON.parse(activePlan.daysData)
            : activePlan.daysData;
          if (parsed && Array.isArray(parsed.days)) {
            const trainingDays = parsed.days.filter((d: any) => !d.isRestDay).length;
            if (trainingDays > 0) return trainingDays;
          }
        }
      } catch (e) {
        console.warn("Error parsing workout V2 for goal calculation", e);
      }
    }
    return 5; // Default to 5 days
  }, [savedWorkouts]);

  // Modal States
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showGenerateWorkoutForm, setShowGenerateWorkoutForm] = useState(false);
  const [generatingWorkout, setGeneratingWorkout] = useState(false);
  const [upgradingWorkout, setUpgradingWorkout] = useState(false); // NEW: Upgrade state
  const [viewingWorkoutHtml, setViewingWorkoutHtml] = useState<string | null>(null);
  const [viewingDaysData, setViewingDaysData] = useState<string | null>(null); // NEW: To handle immediate preview of V2 data
  const [showPaymentCallback, setShowPaymentCallback] = useState(false);
  const [showDietModal, setShowDietModal] = useState(false);
  const [showGenerateDietForm, setShowGenerateDietForm] = useState(false);
  const [generatingDiet, setGeneratingDiet] = useState(false);
  const [viewingDietHtml, setViewingDietHtml] = useState<string | null>(null);

  // Check-in State
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkInComment, setCheckInComment] = useState('');
  const [checkInLoading, setCheckInLoading] = useState(false);
  // Interactive Workout Session State
  const [activeWorkoutDay, setActiveWorkoutDay] = useState<WorkoutDayV2 | null>(null);

  const handleStartSession = async (day: WorkoutDayV2) => {
    if (currentUser) {
      // Fetch previous loads silently (or with small loading?)
      apiService.getLastUsedLoads(currentUser.id).then(loads => {
        setPreviousLoads(loads);
      }).catch(err => console.warn('Failed to fetch lasts loads', err));
    }
    setActiveWorkoutDay(day);
  };

  const handleFinishSession = async (updatedDay: WorkoutDayV2, feedback?: 'like' | 'dislike') => {
    if (!currentUser || savedWorkouts.length === 0) return;

    try {
      const currentWorkout = savedWorkouts[0];

      // 1. Save Execution Data (V2) - Use v2Id for foreign key constraint
      const workoutIdForExecution = currentWorkout.v2Id || currentWorkout.id;
      // Use day index (1, 2, 3...) as dayOfWeek identifier for backend
      const dayIndex = (updatedDay as any)._dayIndex || '1';
      const executionPayload = {
        userId: currentUser.id,
        workoutId: workoutIdForExecution,
        dayOfWeek: String(dayIndex),
        executedAt: Date.now(),
        exercises: updatedDay.exercises.map((ex, index) => ({
          exerciseName: ex.name,
          order: ex.order || index + 1,
          setsCompleted: ex.sets,
          actualLoad: ex.load
        }))
      };

      await apiService.saveWorkoutExecution(executionPayload);

      // 2. Update Local Structure (to keep UI in sync if user re-opens)
      const daysData: WorkoutPlanV2 = currentWorkout.daysData ? JSON.parse(currentWorkout.daysData) : { summary: {}, days: [] };
      const updatedDays = daysData.days.map((d: any) => {
        // Match by name or dayOfWeek
        const dId = d.name || d.dayOfWeek;
        const updId = (updatedDay as any).name || updatedDay.dayOfWeek;
        return dId === updId ? updatedDay : d;
      });
      const newDaysData = { ...daysData, days: updatedDays };
      const newDaysDataStr = JSON.stringify(newDaysData);

      // Only if we want to also persist the modified plan to DB (Optional in V2, but good for "current state")
      // Currently V2 relies on Execution History for values, but saving to plan acts as a cache.
      await apiService.updateStructuredTraining(currentUser.id, currentWorkout.id, newDaysDataStr);

      setSavedWorkouts(prev => {
        const updated = [...prev];
        updated[0] = { ...updated[0], daysData: newDaysDataStr };
        return updated;
      });

      showToast('Treino salvo com sucesso!', 'success');
      setActiveWorkoutDay(null);

      // 3. Auto Check-in
      const todayDate = new Date().toISOString().split('T')[0];
      const dayName = (updatedDay as any).name || updatedDay.dayLabel || 'treino';

      // Get location for weather-based achievements (non-blocking)
      const location = await getCurrentLocation(5000);

      await apiService.createCheckIn(
        currentUser.id,
        currentWorkout.id,
        todayDate,
        `Treino de ${dayName} finalizado com sucesso.`,
        feedback,
        location
      );

      setCheckInDate(todayDate);
      // setCheckInComment(...); 
      // Instead of showing modal, just show success toast for check-in
      showToast('Check-in realizado automaticamente! 💪', 'success');

      // Refresh check-ins
      setCheckInUpdateTrigger(prev => prev + 1);

    } catch (error) {
      console.error(error);
      showToast('Erro ao salvar treino.', 'error');
    }
  };

  // Forms
  const [workoutFormData, setWorkoutFormData] = useState({
    weight: '', height: '', goal: 'hipertrofia', level: 'iniciante', frequency: '4', observations: '', gender: 'masculino', duration: 'MEDIUM'
  });
  const [dietFormData, setDietFormData] = useState({
    weight: '', height: '', goal: 'emagrecer', gender: 'masculino', observations: ''
  });

  // Workout File States
  const [workoutDocument, setWorkoutDocument] = useState<File | null>(null);
  const [workoutPhoto, setWorkoutPhoto] = useState<File | null>(null);
  const [workoutPhotoPreview, setWorkoutPhotoPreview] = useState<string | null>(null);

  // Diet File States
  const [dietDocument, setDietDocument] = useState<File | null>(null);
  const [dietPhoto, setDietPhoto] = useState<File | null>(null);
  const [dietPhotoPreview, setDietPhotoPreview] = useState<string | null>(null);

  // Trigger for WeeklyCheckInTracker refresh
  const [checkInUpdateTrigger, setCheckInUpdateTrigger] = useState(0);

  const [pdfLoading, setPdfLoading] = useState(false);

  // Reset helpers for forms
  const resetWorkoutForm = () => {
    setWorkoutFormData({ weight: '', height: '', goal: 'hipertrofia', level: 'iniciante', frequency: '4', observations: '', gender: 'masculino', duration: 'MEDIUM' });
    if (workoutPhotoPreview) URL.revokeObjectURL(workoutPhotoPreview);
    setWorkoutDocument(null);
    setWorkoutPhoto(null);
    setWorkoutPhotoPreview(null);
  };

  const handleOpenWorkoutForm = () => {
    if (!canCreateWorkout(currentUser)) return;

    if (currentUser?.anamnesis) {
      const { physical, fitness, personal } = currentUser.anamnesis;
      setWorkoutFormData(prev => ({
        ...prev,
        weight: physical.weight ? String(physical.weight) : prev.weight,
        height: physical.height ? String(physical.height) : prev.height,
        gender: personal.gender === 'Feminino' ? 'feminino' : 'masculino',
        frequency: fitness.weeklyFrequency ? String(fitness.weeklyFrequency) : prev.frequency,
      }));
    }
    setShowGenerateWorkoutForm(true);
  };

  const handleOpenDietForm = () => {
    if (!canCreateWorkout(currentUser)) return; // reusing the same credit check

    if (currentUser?.anamnesis) {
      const { physical, personal } = currentUser.anamnesis;
      setDietFormData(prev => ({
        ...prev,
        weight: physical.weight ? String(physical.weight) : prev.weight,
        height: physical.height ? String(physical.height) : prev.height,
        gender: personal.gender === 'Feminino' ? 'feminino' : 'masculino',
      }));
    }
    setShowGenerateDietForm(true);
  };

  const resetDietForm = () => {
    setDietFormData({ weight: '', height: '', goal: 'emagrecer', gender: 'masculino', observations: '' });
    if (dietPhotoPreview) URL.revokeObjectURL(dietPhotoPreview);
    setDietDocument(null);
    setDietPhoto(null);
    setDietPhotoPreview(null);
  };

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
    isOpen: false, title: '', message: '', onConfirm: () => { }, isDestructive: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    try {
      showToast("Enviando foto...", 'info');
      // Assume requester is the user mostly, unless we want to support admin doing it here?? 
      // The menu is for "currentUser", so valid.
      const response = await apiService.uploadAsset(currentUser.id, file, 'avatar', currentUser.id, currentUser.role);

      if (response && response.success) {
        // Update user state
        const newAvatarUrl = response.imageUrl; // Relative path from backend
        const updatedUser = { ...currentUser, avatar: newAvatarUrl };
        handleUpdateUser(updatedUser);
        showToast("Foto de perfil atualizada!", 'success');
      }
    } catch (error: any) {
      console.error("Erro upload avatar:", error);
      showToast("Erro ao enviar foto: " + error.message, 'error');
    }
  };

  // User Menu State
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Change Password Modal State
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changePasswordForm, setChangePasswordForm] = useState({ senhaAtual: '', novaSenha: '', confirmarSenha: '' });
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  // --- ANDROID BACK BUTTON HANDLER ---
  // Previne que o botão nativo voltar do Android feche o app
  // Em vez disso, fecha modais abertos ou navega para a tela anterior
  useEffect(() => {
    const handleBackButton = CapApp.addListener('backButton', ({ canGoBack }) => {
      // 1. Primeiro, verifica se há algum modal aberto e o fecha
      if (showEvolutionModal) {
        setShowEvolutionModal(false);
        return;
      }
      if (showRedoModal) {
        setShowRedoModal(false);
        return;
      }
      if (showBuyCreditsModal) {
        setShowBuyCreditsModal(false);
        return;
      }
      if (showPlansModal) {
        setShowPlansModal(false);
        return;
      }
      if (showAnamnesisModal) {
        setShowAnamnesisModal(false);
        return;
      }
      if (showWorkoutModal) {
        setShowWorkoutModal(false);
        setViewingWorkoutHtml(null);
        setViewingDaysData(null);
        return;
      }
      if (showDietModal) {
        setShowDietModal(false);
        setViewingDietHtml(null);
        return;
      }
      if (showCheckInModal) {
        setShowCheckInModal(false);
        return;
      }
      if (showChangePasswordModal) {
        setShowChangePasswordModal(false);
        setChangePasswordForm({ senhaAtual: '', novaSenha: '', confirmarSenha: '' });
        return;
      }
      if (showGenerateWorkoutForm) {
        setShowGenerateWorkoutForm(false);
        resetWorkoutForm();
        return;
      }
      if (showGenerateDietForm) {
        setShowGenerateDietForm(false);
        resetDietForm();
        return;
      }
      if (showUserMenu) {
        setShowUserMenu(false);
        return;
      }
      if (confirmModal.isOpen) {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        return;
      }

      // 2. Se não há modal, navega entre as telas/steps
      switch (step) {
        case AppStep.RESULTS:
          // De resultados, volta para upload
          setStep(AppStep.UPLOAD_VIDEO);
          setAnalysisResult(null);
          break;
        case AppStep.UPLOAD_VIDEO:
          // De upload, volta para seleção de exercício
          setStep(AppStep.SELECT_EXERCISE);
          setSelectedExercise(null);
          setMediaFile(null);
          setMediaPreview(null);
          break;
        case AppStep.ADMIN_DASHBOARD:
        case AppStep.SELECT_EXERCISE:
        case AppStep.LOGIN:
        case AppStep.ONBOARDING:
          // Nas telas principais, permite que o app seja minimizado/fechado
          // Não chamamos CapApp.exitApp() para permitir comportamento padrão
          break;
        case AppStep.ANALYZING:
        case AppStep.COMPRESSING:
          // Durante análise/compressão, não permite voltar (previne perda de progresso)
          break;
        case AppStep.PAYMENT_CALLBACK:
          // De callback de pagamento, volta para seleção
          if (currentUser) {
            if (currentUser.role === 'admin' || currentUser.role === 'personal' || currentUser.role === 'professor') {
              setStep(AppStep.ADMIN_DASHBOARD);
            } else {
              setStep(AppStep.SELECT_EXERCISE);
            }
          } else {
            setStep(AppStep.LOGIN);
          }
          break;
        default:
          break;
      }
    });

    return () => {
      handleBackButton.then(listener => listener.remove());
    };
  }, [
    step,
    showEvolutionModal,
    showRedoModal,
    showBuyCreditsModal,
    showPlansModal,
    showAnamnesisModal,
    showWorkoutModal,
    showDietModal,
    showCheckInModal,
    showChangePasswordModal,
    showGenerateWorkoutForm,
    showGenerateDietForm,
    showUserMenu,
    confirmModal.isOpen,
    currentUser
  ]);

  // --- AUTO SCROLL EFFECTS ---
  // Rola para o topo sempre que o passo muda (Ex: Seleção -> Upload)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Rola para o topo quando um arquivo é selecionado para focar no preview
  useEffect(() => {
    if (mediaFile) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [mediaFile]);

  // --- DERIVED STATE ---
  const standardExercises = exercisesList.filter(e => e.category === 'STANDARD');

  const postureExercise = exercisesList.find(e => e.alias === SPECIAL_EXERCISES.POSTURE || e.id === SPECIAL_EXERCISES.POSTURE);
  const bodyCompExercise = exercisesList.find(e => e.alias === SPECIAL_EXERCISES.BODY_COMPOSITION || e.id === SPECIAL_EXERCISES.BODY_COMPOSITION);

  const hasPostureAccess = !!postureExercise;
  const hasBodyCompAccess = !!bodyCompExercise;

  const selectedExerciseObj = exercisesList.find(e => e.id === selectedExercise);

  const isSpecialMode = (selectedExercise === SPECIAL_EXERCISES.FREE_MODE) || (selectedExerciseObj?.category === 'SPECIAL');

  // Specific check for Posture/Body Composition - allows multi-photo for all users
  // This checks both the alias values AND the actual exercise IDs from the list
  const isPostureOrBodyComp =
    selectedExercise === SPECIAL_EXERCISES.POSTURE ||
    selectedExercise === SPECIAL_EXERCISES.BODY_COMPOSITION ||
    selectedExerciseObj?.alias === SPECIAL_EXERCISES.POSTURE ||
    selectedExerciseObj?.alias === SPECIAL_EXERCISES.BODY_COMPOSITION ||
    (postureExercise && selectedExercise === postureExercise.id) ||
    (bodyCompExercise && selectedExercise === bodyCompExercise.id);

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

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- SAFETY CHECK FOR SESSION PERSISTENCE ---
  // Mantém este effect como backup caso o estado inicial falhe por algum motivo raro
  useEffect(() => {
    if (!currentUser) {
      const storedUser = secureStorage.getItem<User>('fitai_current_session');
      if (storedUser) {
        console.log('[DEBUG] Session Restored:', storedUser);
        if (storedUser.plan) console.log('[DEBUG] Restored Plan:', storedUser.plan);
        try {
          // const storedUser = JSON.parse(stored); // Removed manual parse, secureStorage handles it
          setCurrentUser(storedUser);
          // Redirecionamento baseado em role
          if (storedUser.role === 'admin' || storedUser.role === 'personal' || storedUser.role === 'professor') {
            setStep(AppStep.ADMIN_DASHBOARD);
          } else {
            setStep(AppStep.SELECT_EXERCISE);
          }
        } catch (e) {
          // Se falhar o parse, deixa como está (login)
        }
      }
    }
  }, []);

  // --- HELPER FUNCTIONS FOR UI ---
  // Returns the cost in credits for generating a workout/diet based on user's plan
  const getGenerationCost = (): number => {
    const planType = currentUser?.plan?.type?.toUpperCase() || 'FREE';
    switch (planType) {
      case 'STUDIO': return 2;
      case 'PRO': return 3;
      case 'STARTER': return 4;
      default: return 5; // FREE or no plan
    }
  };

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

  const canCreateWorkout = (user: User | null) => {
    if (!user) return false;

    // 0. READONLY check (Absolute Blocker)
    if (user.accessLevel === 'READONLY') {
      showToast("Seu perfil é apenas de leitura.", 'info');
      return false;
    }

    if (user.role === 'admin' || user.role === 'personal' || user.role === 'professor') return true;

    // Planos Ilimitados
    if (user.plan?.type === 'PRO' || user.plan?.type === 'STUDIO') return true;

    // Plano Limitado (Starter)
    if (user.plan?.type === 'STARTER') {
      const used = user.usage?.generations || 0;
      const limit = user.usage?.generationsLimit || 10;

      if (used < limit) return true; // Quota available

      // If limit reached, fall through to check credits
    }

    // Check Credits (Fallback for Free, No Plan, or Exhausted Starter)
    if (user.credits && user.credits > 0) {
      return true;
    }

    // User blocked
    if (user.plan?.type === 'STARTER') {
      showToast("Limite do plano atingido e sem créditos.", 'info');
    } else {
      showToast("Assine um plano ou compre créditos para gerar treinos!", 'info');
    }

    setShowPlansModal(true);
    return false;
  };

  const handleSubscribe = async (planId: string, planName: string, price: string) => {
    if (!currentUser) return;

    // Check for valid Plan ID
    const validPlans = ['STARTER', 'PRO', 'STUDIO'];
    if (!validPlans.includes(planId)) {
      showToast("Plano inválido.", 'error');
      return;
    }

    try {
      showToast("Iniciando pagamento...", 'info');
      const initPointUrl = await apiService.checkoutSubscription(
        currentUser.id,
        planId as 'STARTER' | 'PRO' | 'STUDIO'
      );

      if (initPointUrl) {
        await Browser.open({ url: initPointUrl });
        setShowPlansModal(false);
      }
    } catch (error: any) {
      console.error("Erro na assinatura:", error);
      showToast("Erro ao iniciar assinatura: " + error.message, 'error');
    }
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    secureStorage.setItem('fitai_current_session', updatedUser);
  };

  const handleRefreshUser = async () => {
    if (!currentUser) return;
    try {
      showToast("Atualizando dados...", 'info');
      // 1. Get raw profile data (might miss plan/usage)
      const updatedUser = await apiService.getMe(currentUser.id);

      // 2. Get fresh status (Plan & Usage) - NEW ENDPOINT
      const statusData = await apiService.getUserStatus(currentUser.id);

      // 3. Merge carefully
      const robustUser = {
        ...updatedUser,
        ...statusData, // This will overwrite plan/usage with FRESH data from the specific endpoint
      };

      handleUpdateUser(robustUser as User);
      showToast("Dados atualizados!", 'success');
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      showToast("Erro ao atualizar dados.", 'error');
    }
  };

  // --- DELETE ACCOUNT ---
  const handleDeleteAccount = async () => {
    if (!currentUser) return;

    // Confirmação dupla
    triggerConfirm(
      "Excluir Conta Permanentemente?",
      "ATENÇÃO: Sua conta e todos os dados serão apagados para sempre. Esta ação não pode ser desfeita.",
      async () => {
        try {
          showToast("Processando exclusão...", 'info');
          await apiService.deleteUser(currentUser.id);
          showToast("Conta excluída com sucesso.", 'success');
          handleLogout();
        } catch (e: any) {
          console.error("Erro ao excluir conta:", e);
          showToast("Erro ao excluir conta: " + (e.message || "Tente novamente."), 'error');
        }
      },
      true // isDestructive
    );
  };

  const loadExercisesList = async (user: User) => {
    setLoadingExercises(true);
    try {
      if (user.role === 'admin' || user.role === 'personal' || user.role === 'professor') {
        // Admins e Personais carregam lista completa
        try {
          const allEx = await apiService.getAllExercises();
          if (allEx.length > 0) {
            const mapped = allEx.map((e: any) => {
              const name = e.exercicio || e.name || "Exercício";
              let category: 'STANDARD' | 'SPECIAL' = 'STANDARD';
              let alias = name.toUpperCase().replace(/\s+/g, '_');

              // Identifica exercícios especiais pelo nome para aplicar lógica/ícones corretos
              if (name.toLowerCase().includes("postura")) {
                alias = SPECIAL_EXERCISES.POSTURE;
                category = 'SPECIAL';
              } else if (name.toLowerCase().includes("corporal") || name.toLowerCase().includes("biotipo")) {
                alias = SPECIAL_EXERCISES.BODY_COMPOSITION;
                category = 'SPECIAL';
              }

              return {
                id: String(e.id),
                alias,
                name,
                category
              };
            });
            setExercisesList(mapped);
            return;
          }
        } catch (e) { }

        const exercises = await MockDataService.fetchExercises();
        setExercisesList(exercises);
      } else {
        try {
          const myExercisesV2 = await apiService.getUserExercises(user.id);
          if (myExercisesV2.length > 0) {
            const mapped = myExercisesV2.map((e: any) => {
              const name = e.exercicio || e.name || "Exercício";
              let category: 'STANDARD' | 'SPECIAL' = 'STANDARD';
              let alias = name.toUpperCase().replace(/\s+/g, '_');

              if (name.toLowerCase().includes("postura")) {
                alias = SPECIAL_EXERCISES.POSTURE;
                category = 'SPECIAL';
              } else if (name.toLowerCase().includes("corporal") || name.toLowerCase().includes("biotipo")) {
                alias = SPECIAL_EXERCISES.BODY_COMPOSITION;
                category = 'SPECIAL';
              }

              return {
                id: String(e.id),
                alias,
                name,
                category
              };
            });
            setExercisesList(mapped);
            return;
          }
        } catch (e) { }

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
      // Buscar V1 (HTML) e V2 (estruturado) em paralelo
      const [workoutsV1, workoutsV2] = await Promise.all([
        apiService.getTrainings(userId),
        apiService.getTrainingsV2(userId).catch(() => []) // Fallback se V2 falhar
      ]);

      // Mesclar daysData do V2 no V1 e sempre buscar v2Id
      const mergedWorkouts = workoutsV1.map((w: any) => {
        // Estratégia 1: Match por título no conteúdo HTML
        let v2Match = workoutsV2.find((v2: any) =>
          v2.title && w.content?.includes(v2.title.split(' - ')[0])
        );

        // Estratégia 2: Match por data de criação (dentro de 2 minutos)
        if (!v2Match && w.createdAt) {
          const v1Date = new Date(w.createdAt).getTime();
          v2Match = workoutsV2.find((v2: any) => {
            if (!v2.createdAt) return false;
            const v2Date = new Date(v2.createdAt).getTime();
            const diffMs = Math.abs(v1Date - v2Date);
            return diffMs < 2 * 60 * 1000; // 2 minutos
          });
        }

        // Estratégia 3: Match por goal (usar o V2 mais recente com mesmo goal)
        if (!v2Match && w.goal) {
          v2Match = workoutsV2.find((v2: any) =>
            v2.title?.toLowerCase().includes(w.goal.toLowerCase())
          );
        }

        // Estratégia 4: Se ainda não encontrou, usar o primeiro V2 disponível
        if (!v2Match && workoutsV2.length > 0) {
          v2Match = workoutsV2[0];
        }

        if (v2Match) {
          console.log('[DEBUG] Merged V1 id', w.id, 'with V2 id', v2Match.id);
          // Sempre pegar v2Id, e daysData se não existir no V1
          return {
            ...w,
            daysData: w.daysData || w.days_data || v2Match.daysData,
            v2Id: v2Match.id
          };
        }
        return w;
      });

      setSavedWorkouts(mergedWorkouts);
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
        // --- ALWAYS REFRESH USER DATA ON MOUNT ---
        // Ensuring permissions (accessLevel) and credits are up-to-date
        try {
          // Parallel fetch for speed
          const [fullUser, statusData] = await Promise.all([
            apiService.getMe(currentUser.id),
            apiService.getUserStatus(currentUser.id)
          ]);

          // Merge: Profile + Status
          handleUpdateUser({
            ...currentUser,
            ...fullUser,
            ...statusData // Overwrites plan/usage with fresh data
          });

          console.log('[DEBUG] initData - Merged User Plan:', statusData.plan);
          await loadExercisesList(fullUser); // Load exercises based on fresh role
        } catch (e) {
          console.error("Background sync failed", e);
          // Fallback: load with cached user
          await loadExercisesList(currentUser);
        }

        await fetchUserWorkouts(currentUser.id);
        await fetchUserDiets(currentUser.id);
      }
    };
    initData();
  }, [currentUser?.id]); // Only re-run if ID changes (login/logout), not on every user update to avoid loops

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

  // Refresh workouts when modal opens to ensure sync
  useEffect(() => {
    if (showWorkoutModal && currentUser) {
      fetchUserWorkouts(currentUser.id);
    }
  }, [showWorkoutModal]);


  const handleLogin = (user: User) => {
    console.log('[DEBUG] handleLogin - Incoming User:', user);
    console.log('[DEBUG] handleLogin - User Plan:', user.plan);
    setCurrentUser(user);
    secureStorage.setItem('fitai_current_session', user); // Ensure session is saved

    const hasSeen = secureStorage.getItem<string>('hasSeenOnboarding_v6');
    if (!hasSeen) {
      setStep(AppStep.ONBOARDING);
    } else if (user.role === 'admin' || user.role === 'personal' || user.role === 'professor') {
      setStep(AppStep.ADMIN_DASHBOARD);
    } else {
      setStep(AppStep.SELECT_EXERCISE);
    }
    showToast(`Bem-vindo, ${user.name || 'Usuário'}!`, 'success');

    // Auto-open plans modal if user is FREE and has NO Personal Trainer
    // Robust check for plan type to prevent false positives for PRO/STUDIO users
    let isFree = true;

    // Log for debugging
    console.log('Checking plan for auto-modal:', user.plan);

    if (user.plan) {
      const p = user.plan as any;
      if (typeof p === 'string') {
        isFree = p.toUpperCase() === 'FREE';
      } else if (p.type) {
        isFree = String(p.type).toUpperCase() === 'FREE';
      } else if (p.status === 'ACTIVE' && p.type !== 'FREE') {
        isFree = false;
      } else {
        isFree = false;
      }
    }

    // personalId might be null, undefined or empty string
    const hasPersonal = !!user.personalId;

    console.log(`[DEBUG] Plan Check: plan=${JSON.stringify(user.plan)}, isFree=${isFree}, hasPersonal=${hasPersonal}`);

    if (isFree && !hasPersonal) {
      // Small delay to ensure UI transition is smooth
      setTimeout(() => {
        setShowPlansModal(true);
      }, 500);
    }
  };

  const handleLogout = () => {
    MockDataService.logout();
    resetGeminiInstance(); // Limpa cache da API Key do Gemini
    setCurrentUser(null);
    setExercisesList([]);
    setSavedWorkouts([]);
    setSavedDiets([]);
    resetAnalysis();
    setStep(AppStep.LOGIN);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (changePasswordForm.novaSenha !== changePasswordForm.confirmarSenha) {
      showToast('As senhas não coincidem.', 'error');
      return;
    }

    if (changePasswordForm.novaSenha.length < 6) {
      showToast('A nova senha deve ter pelo menos 6 caracteres.', 'error');
      return;
    }

    setChangePasswordLoading(true);
    try {
      await apiService.changePassword(
        currentUser.id,
        changePasswordForm.senhaAtual,
        changePasswordForm.novaSenha
      );
      showToast('Senha alterada com sucesso!', 'success');
      setShowChangePasswordModal(false);
      setChangePasswordForm({ senhaAtual: '', novaSenha: '', confirmarSenha: '' });
    } catch (err: any) {
      showToast(err.message || 'Erro ao alterar senha.', 'error');
    } finally {
      setChangePasswordLoading(false);
    }
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
    const files = Array.from(event.target.files || []) as File[];
    if (files.length === 0) return;

    const isFreeMode = selectedExercise === SPECIAL_EXERCISES.FREE_MODE;

    // Check if we should allow multiple files and images
    const allowMultipleAndImages = isSpecialMode || isPostureOrBodyComp;

    if (allowMultipleAndImages && !isFreeMode) {
      // Multi-file logic for posture/body composition
      const validFiles: File[] = [];
      const validPreviews: string[] = [];

      for (const file of files) {
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');

        if (!isVideo && !isImage) {
          setError("Tipo de arquivo inválido.");
          return;
        }
        validFiles.push(file);
        validPreviews.push(URL.createObjectURL(file));
      }

      if (validFiles.length > 0) {
        if (validFiles.length === 1) {
          setMediaFile(validFiles[0]);
          setMediaPreview(validPreviews[0]);
        } else {
          setMediaFile(validFiles);
          setMediaPreview(validPreviews);
        }
        setError(null);
      }
    } else {
      // Standard Mode (Single Video Only)
      const file = files[0] as File;
      const isVideo = file.type.startsWith('video/');

      if (!isVideo) {
        setError("Para este modo, envie apenas 1 vídeo.");
        return;
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

    // --- BLOQUEIO PREVENTIVO DE CRÉDITOS ---
    if (currentUser.role === 'user' && (currentUser.credits === undefined || currentUser.credits <= 0)) {
      setShowBuyCreditsModal(true);
      return;
    }

    const exerciseObj = exercisesList.find(e => e.id === selectedExercise);
    let aiContextName = selectedExercise;
    let backendId = selectedExercise;

    if (selectedExercise === SPECIAL_EXERCISES.FREE_MODE) {
      aiContextName = "Análise Livre";
      backendId = SPECIAL_EXERCISES.FREE_MODE;
    } else if (exerciseObj) {
      // CORREÇÃO: Prioriza o ALIAS (ID Técnico) para exercícios especiais
      if (exerciseObj.category === 'SPECIAL') {
        aiContextName = exerciseObj.alias;
      } else {
        aiContextName = exerciseObj.name;
      }
      // Use alias if available for robust checking
      backendId = exerciseObj.alias || exerciseObj.name;
    }

    try {
      setStep(AppStep.ANALYZING);

      let filesToSend: File | File[] = mediaFile;

      // Handle Single Video Optimization
      if (!Array.isArray(mediaFile) && mediaFile.type.startsWith('video/')) {
        setStep(AppStep.COMPRESSING);
        try {
          filesToSend = await compressVideo(mediaFile);
        } catch (e) {
          console.warn("Video compression failed, using original", e);
        }
      } else if (Array.isArray(mediaFile)) {
        filesToSend = mediaFile;
      }

      setStep(AppStep.ANALYZING);

      // --- UPLOAD IMAGES FOR POSTURE / BODY COMP ---
      let uploadedImageUrl: string | undefined = undefined;
      let uploadedImageUrls: string[] = [];

      const isPosture = backendId === SPECIAL_EXERCISES.POSTURE || backendId === 'POSTURE_ANALYSIS';
      const isBodyComp = backendId === SPECIAL_EXERCISES.BODY_COMPOSITION || backendId === 'BODY_COMPOSITION';

      // Ensure backendId matches what analyzeVideo expects if it's Posture/BodyComp
      // If we detected it via alias checking earlier

      if ((isPosture || isBodyComp) && mediaFile) {
        try {
          if (Array.isArray(mediaFile) && mediaFile.length > 1) {
            // Parallel Uploads Fix
            const uploadPromises = mediaFile.map(file =>
              apiService.uploadAnalysisEvidence(currentUser.id, file)
                .then(res => res.success ? res.imageUrl : null)
                .catch(err => {
                  console.error(`Erro no upload mobile do arquivo ${file.name}:`, err);
                  return null;
                })
            );

            const results = await Promise.all(uploadPromises);
            const successUrls = results.filter(url => url !== null) as string[];

            if (successUrls.length > 0) {
              uploadedImageUrls = successUrls;
              uploadedImageUrl = successUrls[0];
            }
          } else {
            // Single file upload
            const fileToUpload = Array.isArray(mediaFile) ? mediaFile[0] : mediaFile;
            if (fileToUpload) {
              const uploadResult = await apiService.uploadAnalysisEvidence(currentUser.id, fileToUpload);
              if (uploadResult.success && uploadResult.imageUrl) {
                uploadedImageUrl = uploadResult.imageUrl;
                uploadedImageUrls = [uploadResult.imageUrl];
              }
            }
          }
        } catch (e) {
          console.error("Erro no upload de evidências mobile:", e);
        }
      }

      let previousRecord: ExerciseRecord | null = null;

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

      const result = await analyzeVideo(filesToSend, aiContextName, currentUser.id, currentUser.role, previousRecord?.result);

      // Inject uploaded URLs into result
      if (uploadedImageUrl) result.imageUrl = uploadedImageUrl;
      if (uploadedImageUrls.length > 0) result.imageUrls = uploadedImageUrls;

      if (!result.isValidContent) {
        setError(result.validationError || "Conteúdo inválido para este exercício.");
        setStep(AppStep.UPLOAD_VIDEO);
        return;
      }

      // --- CONSUMIR CRÉDITO (SE FOR ALUNO E SUCESSO) ---
      if (currentUser.role === 'user') {
        try {
          // Determinar Nome Amigável
          let analysisFriendlyName = backendId;
          if (backendId === SPECIAL_EXERCISES.FREE_MODE) analysisFriendlyName = "Análise Livre";
          else if (backendId === SPECIAL_EXERCISES.POSTURE) analysisFriendlyName = "Avaliação Postural";
          else if (backendId === SPECIAL_EXERCISES.BODY_COMPOSITION) analysisFriendlyName = "Composição Corporal";

          const creditResponse = await apiService.consumeCredit(currentUser.id, 'ANALISE', analysisFriendlyName);
          if (creditResponse && typeof creditResponse.novoSaldo === 'number') {
            handleUpdateUser({ ...currentUser, credits: creditResponse.novoSaldo });
          }
        } catch (e: any) {
          if (e.message === 'CREDITS_EXHAUSTED' || e.message.includes('402')) {
            setShowBuyCreditsModal(true);
            // Opcional: Se quiser impedir de mostrar o resultado se falhar a cobrança, descomente:
            // setStep(AppStep.UPLOAD_VIDEO);
            // return;
          }
          // throw e; // Repassa outros erros se necessário, mas aqui deixamos continuar para mostrar o resultado já obtido
        }
      }

      setAnalysisResult(result);


      // Save History Logic (uses uploadedImageUrl from previous step)
      try {
        const payload = {
          userId: currentUser.id,
          userName: currentUser.name,
          exercise: backendId,
          timestamp: Date.now(),
          result: {
            ...result,
            date: new Date().toISOString(),
            imageUrl: uploadedImageUrl,
            imageUrls: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined
          }
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
      const planHtml = await generateWorkoutPlan(
        { ...workoutFormData, anamnesis: currentUser.anamnesis },
        currentUser.id,
        currentUser.role,
        workoutDocument,
        workoutPhoto
      );

      // --- CRITICAL FIX: Extract Structured Data for Interactive Mode ---
      let daysDataStr: string | undefined = undefined;
      const match = planHtml.match(/<!-- DATA_JSON_START -->([\s\S]*?)<!-- DATA_JSON_END -->/);
      if (match && match[1]) {
        try {
          // Validate JSON integrity
          JSON.parse(match[1]);
          daysDataStr = match[1];
        } catch (e) {
          console.warn("Failed to parse hidden JSON from workout plan", e);
        }
      }

      // Usa apiService para criar e refresh, sem fallbacks quebrados
      await apiService.createTraining(currentUser.id, planHtml, workoutFormData.goal, daysDataStr);

      // CRITICAL: Also create V2 structured record for interactive mode
      if (daysDataStr) {
        try {
          await apiService.createTrainingV2(currentUser.id, daysDataStr, workoutFormData.goal, {
            level: workoutFormData.level,
            legacyHtml: planHtml
          });
          console.log('[DEBUG] V2 structured workout created successfully');
        } catch (v2Error) {
          console.warn('[DEBUG] Failed to create V2 workout (non-blocking):', v2Error);
          // Non-blocking: V1 was created, V2 is a bonus
        }
      }

      // CONSUME CREDIT LOGIC
      const isUnlimited = currentUser.role === 'admin' || currentUser.role === 'personal' || currentUser.role === 'professor'
        || currentUser.plan?.type === 'PRO' || currentUser.plan?.type === 'STUDIO';

      const isStarterQuota = currentUser.plan?.type === 'STARTER' && (currentUser.usage?.generations || 0) < (currentUser.usage?.generationsLimit || 10);

      if (!isUnlimited && !isStarterQuota) {
        try {
          await apiService.consumeCredit(currentUser.id, 'TREINO');
          showToast("1 Crédito Utilizado", 'info');
        } catch (e) {
          console.error("Erro ao consumir crédito", e);
          // Non-blocking? User already got the content. 
          // Ideally we charge before, but here we prioritize UX flow.
        }

        // Force refresh credits on success to update UI
        handleRefreshUser();
      }

      await fetchUserWorkouts(currentUser.id);
      showToast("Treino gerado com sucesso!", 'success');

      // Limpa anexos após sucesso
      if (workoutPhotoPreview) URL.revokeObjectURL(workoutPhotoPreview);
      setWorkoutPhotoPreview(null);
      setWorkoutPhoto(null);
      setWorkoutDocument(null);

      setShowGenerateWorkoutForm(false);
      resetWorkoutForm();
      setViewingWorkoutHtml(planHtml);
      setViewingDaysData(daysDataStr || null); // Set immediate V2 data
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
      // 1. Buscar treino ativo para dar contexto
      let workoutContext = "";
      try {
        const trainings = await apiService.getTrainings(currentUser.id);
        if (trainings && trainings.length > 0) {
          // Pega o último (mais recente)
          const lastWorkout = trainings[0]; // backend já retorna ordenado ou o app assume lista[0] como atual

          if (lastWorkout.daysData) {
            // V2 (JSON) -> Resumir
            try {
              const workoutJson = JSON.parse(lastWorkout.daysData);
              const summary = workoutJson.summary;
              workoutContext = `Estilo: ${summary.trainingStyle}, Foco: ${summary.focus?.join(', ')}, Frequência: ${workoutFormData.frequency || 'N/A'}x. Detalhes: ${summary.considerations || ''}`;
            } catch (e) {
              workoutContext = "Treino V2 (sem resumo legível)";
            }
          } else {
            // V1 (HTML) -> Mandar direto
            workoutContext = lastWorkout.content;
          }
        }
      } catch (e) {
        console.warn("Não foi possível buscar treino para contexto:", e);
      }

      const planHtml = await generateDietPlan({
        ...dietFormData,
        workoutPlan: workoutContext, // INJEÇÃO DO CONTEXTO
        anamnesis: currentUser.anamnesis
      }, currentUser.id, currentUser.role, dietDocument, dietPhoto);

      // Usa apiService para criar e refresh
      await apiService.createDiet(currentUser.id, planHtml, dietFormData.goal);

      // CONSUME CREDIT LOGIC
      const isUnlimited = currentUser.role === 'admin' || currentUser.role === 'personal' || currentUser.role === 'professor'
        || currentUser.plan?.type === 'PRO' || currentUser.plan?.type === 'STUDIO';

      const isStarterQuota = currentUser.plan?.type === 'STARTER' && (currentUser.usage?.generations || 0) < (currentUser.usage?.generationsLimit || 10);

      if (!isUnlimited && !isStarterQuota) {
        try {
          await apiService.consumeCredit(currentUser.id, 'DIETA');
          showToast("1 Crédito Utilizado", 'info');
        } catch (e) {
          console.error("Erro ao consumir crédito", e);
        }

        // Force refresh credits on success to update UI
        handleRefreshUser();
      }

      await fetchUserDiets(currentUser.id);
      showToast("Dieta gerada com sucesso!", 'success');

      // Limpa anexos após sucesso
      if (dietPhotoPreview) URL.revokeObjectURL(dietPhotoPreview);
      setDietPhotoPreview(null);
      setDietPhoto(null);
      setDietDocument(null);

      setShowGenerateDietForm(false);
      resetDietForm();
      setViewingDietHtml(planHtml);
      setShowDietModal(true);

    } catch (err: any) {
      showToast("Erro ao gerar dieta: " + err.message, 'error');
    } finally {
      setGeneratingDiet(false);
    }
  };

  const handleCheckIn = async () => {
    if (!currentUser) return;

    // Pega o ID do treino atual (assumindo que é o primeiro da lista salva, já que o modal mostra ele)
    const currentWorkoutId = savedWorkouts[0]?.id;
    if (!currentWorkoutId) {
      showToast('Nenhum treino encontrado para check-in.', 'error');
      return;
    }

    if (!checkInDate) {
      showToast('Selecione uma data para o check-in.', 'error');
      return;
    }

    setCheckInLoading(true);
    try {
      // Get location for weather-based achievements (non-blocking)
      const location = await getCurrentLocation(5000);

      await apiService.createCheckIn(currentUser.id, currentWorkoutId, checkInDate, checkInComment, undefined, location);
      showToast('Check-in realizado com sucesso! 💪', 'success');

      // Force refresh of tracking data
      setCheckInUpdateTrigger(prev => prev + 1);

      setShowCheckInModal(false);
      setCheckInComment('');
    } catch (error) {
      showToast('Erro ao realizar check-in. Tente novamente.', 'error');
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleSharePdf = async (elementId: string, title: string) => {
    setPdfLoading(true);
    try {
      await shareAsPdf(elementId, title);
      showToast('PDF gerado com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao gerar PDF.', 'error');
    } finally {
      setPdfLoading(false);
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
          setViewingDaysData(null);
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

  // --- UPGRADE LEGACY WORKOUT ---
  const handleUpgradeWorkout = async () => {
    if (!currentUser || savedWorkouts.length === 0) return;
    const currentWorkout = savedWorkouts[0];

    setUpgradingWorkout(true);
    try {
      const extractedData = await extractWorkoutDataFromHtml(
        currentWorkout.content,
        currentUser.id,
        currentUser.role
      );

      const daysDataStr = JSON.stringify(extractedData);

      // Save to Backend
      await apiService.updateStructuredTraining(
        currentUser.id,
        currentWorkout.id,
        daysDataStr
      );

      // Update Local State immediately
      setViewingDaysData(daysDataStr);
      showToast("Treino atualizado para Modo Interativo!", 'success');

      // Refresh background
      fetchUserWorkouts(currentUser.id);

    } catch (error) {
      console.error("Upgrade failed", error);
      showToast("Falha ao converter treino. Tente novamente.", 'error');
    } finally {
      setUpgradingWorkout(false);
    }
  };

  const handleGoBackToSelect = () => {
    clearSelectedMedia();
    setStep(AppStep.SELECT_EXERCISE);
  };

  // Show ResetPassword if token is present
  if (resetToken) {
    return (
      <>
        <ResetPassword
          token={resetToken}
          onComplete={() => {
            setResetToken(null);
            // Clear token from URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }}
        />
        <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={closeToast} />
      </>
    );
  }

  if (step === AppStep.LOGIN) return (
    <>
      <Login
        onLogin={handleLogin}
        showToast={showToast}
        onViewPlans={async () => {
          const url = 'https://fitanalizer.com.br/planos';
          try {
            console.log('Attempting to open via Capacitor Browser...');
            await Browser.open({ url, windowName: '_system' });
          } catch (e) {
            console.warn('Browser.open failed, trying window.open fallback:', e);
            try {
              window.open(url, '_system', 'noopener,noreferrer');
            } catch (fallbackError) {
              console.error('All open methods failed:', fallbackError);
              showToast('Não foi possível abrir o link. Acesse: fitanalizer.com.br/planos', 'error');
            }
          }
        }}
      />
      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={closeToast} />
    </>
  );

  if (step === AppStep.ONBOARDING) return (
    <OnboardingGuide onClose={handleOnboardingComplete} />
  );

  const getPaymentStatus = (): 'success' | 'failure' | 'pending' => {
    const params = new URLSearchParams(window.location.search);
    // Mercado Pago returns 'collection_status' or 'status'
    const status = params.get('collection_status') || params.get('status');

    if (status === 'approved' || status === 'success') return 'success';
    if (status === 'pending' || status === 'in_process') return 'pending';
    return 'failure';
  };

  if (step === AppStep.PAYMENT_CALLBACK) return (
    <PaymentCallback
      status={getPaymentStatus()}
      currentUser={currentUser}
      refreshUser={handleRefreshUser}
      onContinue={() => {
        // Limpa a URL
        window.history.replaceState({}, document.title, window.location.pathname);
        if (currentUser) {
          setStep(AppStep.SELECT_EXERCISE);
        } else {
          setStep(AppStep.LOGIN);
        }
      }}
    />
  );

  const renderWorkoutModal = () => (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 overflow-y-auto animate-in fade-in backdrop-blur-sm">
      <div className="min-h-screen p-4 md:p-8 relative" style={{ paddingTop: 'max(4rem, env(safe-area-inset-top))' }}>
        <div className="flex justify-between items-center max-w-7xl mx-auto mb-6">
          <button
            onClick={() => { setShowWorkoutModal(false); setViewingWorkoutHtml(null); setViewingDaysData(null); resetWorkoutForm(); }}
            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> <span className="hidden sm:inline">Voltar</span>
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => handleSharePdf('workout-view-content', 'Meu Treino FitAI')}
              disabled={pdfLoading}
              className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white disabled:opacity-50 flex items-center gap-2"
            >
              {pdfLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
              <span className="hidden sm:inline">{pdfLoading ? 'Gerando...' : 'Compartilhar'}</span>
            </button>
            <button
              onClick={() => setShowCheckInModal(true)}
              className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition-colors"
              title="Fazer Check-in"
            >
              <CheckCircle className="w-5 h-5" />
            </button>
            {currentUser?.accessLevel !== 'READONLY' && (
              <button
                onClick={() => setShowRedoModal(true)}
                disabled={redoCount >= 2}
                className={`p-2 rounded-lg text-white transition-colors ${redoCount >= 2 ? 'bg-slate-700 text-slate-500' : 'bg-amber-600 hover:bg-amber-500'}`}
                title="Refazer com IA"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
            {currentUser?.accessLevel !== 'READONLY' && (
              <button onClick={confirmDeleteWorkout} className="flex items-center gap-2 p-2 px-3 bg-red-600 hover:bg-red-500 rounded-lg text-white">
                <Trash2 className="w-5 h-5" /> <span className="hidden sm:inline font-bold">Excluir</span>
              </button>
            )}
          </div>
        </div>
        <div className="max-w-6xl mx-auto bg-slate-50 rounded-3xl p-8 shadow-2xl min-h-[80vh]">

          {/* Interactive Workout List (Hybrid Mode) */}
          {(() => {
            const currentWorkout = savedWorkouts[0];
            // Fallback: Try to extract JSON from HTML if explicit daysData is missing
            const embeddedJson = currentWorkout?.content?.match(/<!-- DATA_JSON_START -->([\s\S]*?)<!-- DATA_JSON_END -->/)?.[1];
            // ROBUST CHECK: Check daysData (camel) AND days_data (snake)
            const activeDaysData = viewingDaysData || currentWorkout?.daysData || currentWorkout?.days_data || embeddedJson;

            // SHOW UPGRADE BUTTON IF NO DATA
            if (!activeDaysData && currentWorkout) {
              return (
                <div className="mb-8 p-6 bg-slate-800 rounded-2xl border border-slate-700 text-center">
                  <div className="flex justify-center mb-3">
                    <Sparkles className="w-10 h-10 text-amber-400 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Ativar Modo Interativo</h3>
                  <p className="text-slate-400 mb-6 max-w-md mx-auto">
                    Este treino foi criado em uma versão anterior. A Inteligência Artificial pode ler o conteúdo e criar a ficha interativa automaticamente para você.
                  </p>
                  <button
                    onClick={handleUpgradeWorkout}
                    disabled={upgradingWorkout}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-all shadow-lg flex items-center gap-2 mx-auto"
                  >
                    {upgradingWorkout ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                    {upgradingWorkout ? "Atualizando..." : "Converter Agora (Grátis)"}
                  </button>
                </div>
              );
            }

            if (activeDaysData) {
              try {
                const rawParsed: any = JSON.parse(activeDaysData);
                // Handle both formats: { days: [...] } or direct array
                const parsedDays = Array.isArray(rawParsed) ? rawParsed : (rawParsed.days || []);
                return (
                  <div className="mb-8 grid gap-4 grid-cols-1 md:grid-cols-2 animate-in fade-in slide-in-from-top-4">
                    {parsedDays.map((day: any, idx: number) => {
                      // Support both formats: { name, status } and { dayLabel, trainingType, isRestDay }
                      const isRest = day.status === 'rest' || day.isRestDay || day.is_rest_day;
                      const title = day.name || day.trainingType || day.training_type || day.dayLabel || day.day_label || `Dia ${idx + 1}`;
                      return (
                        <div key={idx} className={`p-4 rounded-2xl border flex items-center justify-between ${isRest ? 'bg-slate-200 border-slate-300 opacity-75' : 'bg-white border-slate-200 shadow-sm transition-all hover:shadow-md'}`}>
                          <div>
                            <h4 className="font-bold text-slate-800">{title}</h4>
                          </div>
                          {!isRest && (
                            <button
                              onClick={() => handleStartSession({ ...day, _dayIndex: idx + 1 })}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-emerald-900/20 shadow-lg active:scale-95"
                            >
                              <PlayCircle size={18} /> Iniciar
                            </button>
                          )}
                          {isRest && <span className="text-xs font-bold px-2 py-1 bg-slate-300 text-slate-600 rounded">DESCANSO</span>}
                        </div>
                      );
                    })}
                  </div>
                );
              } catch (e) {
                console.warn('Failed to parse daysData', e);
                return null;
              }
            }
            return null;
          })()}
          <style>{`
                 #workout-view-content { font-family: 'Plus Jakarta Sans', sans-serif; color: #1e293b; }
                 @media print {
                   body { background: white !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; height: auto !important; }
                   body * { visibility: hidden; }
                   #workout-view-content, #workout-view-content * { visibility: visible; }
                   #workout-view-content { position: relative !important; display: block !important; width: 100% !important; margin: 0 !important; padding: 20px !important; }
                   .no-print { display: none !important; }
                 }
             `}</style>
          <div id="workout-view-content" dangerouslySetInnerHTML={{ __html: (viewingWorkoutHtml || (savedWorkouts[0]?.content || '')).split('<!-- DATA_JSON_START -->')[0] }} />
        </div>
      </div>
      {showRedoModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 w-full max-w-lg relative shadow-2xl">
            <button onClick={() => setShowRedoModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <RefreshCw className="w-6 h-6 text-amber-400" /> Refazer Treino com IA
            </h3>
            <p className="text-sm text-slate-400 mb-4">O que deve ser mudado?</p>
            <textarea
              className={`w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:border-amber-500 outline-none h-32 resize-none ${(generatingWorkout || generatingDiet) ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder="Ex: Quero um treino mais intenso, troque agachamento por leg press..."
              value={redoFeedback}
              onChange={e => setRedoFeedback(e.target.value)}
              disabled={generatingWorkout || generatingDiet}
            />
            <button
              onClick={handleRedoWorkout}
              disabled={generatingWorkout}
              className="w-full mt-4 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-all flex justify-center items-center gap-2"
            >
              {generatingWorkout ? <Loader2 className="animate-spin w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
              Refazer Agora
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderCheckInModal = () => (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md relative shadow-2xl">
        <button onClick={() => setShowCheckInModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-full mb-3">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-white">Check-in de Treino</h3>
          <p className="text-slate-400 text-center text-sm">Registre que você concluiu este treino hoje!</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Data do Treino</label>
            <input
              type="date"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              value={checkInDate}
              onChange={e => setCheckInDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Comentário (Opcional)</label>
            <textarea
              rows={3}
              placeholder="Como foi o treino? (ex: 'Senti um pouco de cansaço na última série')"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none placeholder-slate-500 text-sm"
              value={checkInComment}
              onChange={e => setCheckInComment(e.target.value)}
            />
          </div>

          <button
            onClick={handleCheckIn}
            disabled={checkInLoading}
            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {checkInLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ThumbsUp className="w-5 h-5" />}
            {checkInLoading ? "Enviando..." : "Confirmar Check-in"}
          </button>
        </div>
      </div>
    </div>
  );

  const renderChangePasswordModal = () => (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md relative shadow-2xl">
        <button onClick={() => { setShowChangePasswordModal(false); setChangePasswordForm({ senhaAtual: '', novaSenha: '', confirmarSenha: '' }); }} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-full mb-3">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-white">Alterar Senha</h3>
          <p className="text-slate-400 text-center text-sm">Atualize sua senha de acesso</p>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Senha Atual</label>
            <input
              type="password"
              placeholder="Digite sua senha atual"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={changePasswordForm.senhaAtual}
              onChange={e => setChangePasswordForm({ ...changePasswordForm, senhaAtual: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Nova Senha</label>
            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={changePasswordForm.novaSenha}
              onChange={e => setChangePasswordForm({ ...changePasswordForm, novaSenha: e.target.value })}
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Confirmar Nova Senha</label>
            <input
              type="password"
              placeholder="Repita a nova senha"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={changePasswordForm.confirmarSenha}
              onChange={e => setChangePasswordForm({ ...changePasswordForm, confirmarSenha: e.target.value })}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={changePasswordLoading}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {changePasswordLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
            {changePasswordLoading ? "Salvando..." : "Alterar Senha"}
          </button>
        </form>
      </div>
    </div>
  );

  const renderDietModal = () => (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 overflow-y-auto animate-in fade-in backdrop-blur-sm">
      <div className="min-h-screen p-4 md:p-8 relative" style={{ paddingTop: 'max(4rem, env(safe-area-inset-top))' }}>
        <div className="flex justify-between items-center max-w-7xl mx-auto mb-6">
          <button
            onClick={() => { setShowDietModal(false); setViewingDietHtml(null); resetDietForm(); }}
            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> <span className="hidden sm:inline">Voltar</span>
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => handleSharePdf('diet-view-content', 'Minha Dieta FitAI')}
              disabled={pdfLoading}
              className="px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white disabled:opacity-50 flex items-center gap-2"
            >
              {pdfLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
              <span className="hidden sm:inline">{pdfLoading ? 'Gerando...' : 'Compartilhar'}</span>
            </button>
            {currentUser?.accessLevel !== 'READONLY' && (
              <button
                onClick={() => setShowRedoModal(true)}
                disabled={redoCount >= 2}
                className={`p-2 rounded-lg text-white transition-colors ${redoCount >= 2 ? 'bg-slate-700 text-slate-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                title="Refazer com IA"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
            {currentUser?.accessLevel !== 'READONLY' && (
              <button onClick={confirmDeleteDiet} className="flex items-center gap-2 p-2 px-3 bg-red-600 hover:bg-red-500 rounded-lg text-white">
                <Trash2 className="w-5 h-5" /> <span className="hidden sm:inline font-bold">Excluir</span>
              </button>
            )}
          </div>
        </div>
        <div className="max-w-6xl mx-auto bg-slate-50 rounded-3xl p-8 shadow-2xl min-h-[80vh]">
          <style>{`
                 #diet-view-content { font-family: 'Plus Jakarta Sans', sans-serif; color: #1e293b; }
                 @media print {
                   body { background: white !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; height: auto !important; }
                   body * { visibility: hidden; }
                   #diet-view-content, #diet-view-content * { visibility: visible; }
                   #diet-view-content { position: relative !important; display: block !important; width: 100% !important; margin: 0 !important; padding: 20px !important; }
                   .no-print { display: none !important; }
                 }
             `}</style>
          <div id="diet-view-content" dangerouslySetInnerHTML={{ __html: viewingDietHtml || (savedDiets[0]?.content || '') }} />
        </div>
      </div>
      {showRedoModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 w-full max-w-lg relative shadow-2xl">
            <button onClick={() => setShowRedoModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <RefreshCw className="w-6 h-6 text-emerald-400" /> Refazer Dieta com IA
            </h3>
            <p className="text-sm text-slate-400 mb-4">O que deve ser mudado?</p>
            <textarea
              className={`w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:border-emerald-500 outline-none h-32 resize-none ${generatingDiet ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder="Ex: Quero menos carboidratos, incluir mais frutas..."
              value={redoFeedback}
              onChange={e => setRedoFeedback(e.target.value)}
              disabled={generatingDiet}
            />
            <button
              onClick={handleRedoDiet}
              disabled={generatingDiet}
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all flex justify-center items-center gap-2"
            >
              {generatingDiet ? <Loader2 className="animate-spin w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
              Refazer Agora
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // --- RENDERIZADORES DE FORMULÁRIO (NOVO) ---
  const renderGenerateWorkoutForm = () => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 w-full max-w-lg relative shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button onClick={() => { setShowGenerateWorkoutForm(false); resetWorkoutForm(); }} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Dumbbell className="w-6 h-6 text-blue-400" /> Gerar Treino Personalizado</h3>
        <form onSubmit={handleGenerateWorkout} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input type="number" placeholder="Peso (kg)" required className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-blue-500 focus:outline-none" value={workoutFormData.weight} onChange={e => setWorkoutFormData({ ...workoutFormData, weight: e.target.value })} />
            <input type="number" placeholder="Altura (cm)" required className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-blue-500 focus:outline-none" value={workoutFormData.height} onChange={e => setWorkoutFormData({ ...workoutFormData, height: e.target.value })} />
          </div>
          <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-blue-500 focus:outline-none" value={workoutFormData.gender} onChange={e => setWorkoutFormData({ ...workoutFormData, gender: e.target.value })}>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
          </select>
          <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-blue-500 focus:outline-none" value={workoutFormData.goal} onChange={e => setWorkoutFormData({ ...workoutFormData, goal: e.target.value })}>
            <option value="hipertrofia">Hipertrofia</option>
            <option value="emagrecimento">Emagrecimento</option>
            <option value="definicao">Definição</option>
          </select>
          <div className="grid grid-cols-2 gap-4">
            <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-blue-500 focus:outline-none" value={workoutFormData.level} onChange={e => setWorkoutFormData({ ...workoutFormData, level: e.target.value })}>
              <option value="iniciante">Iniciante</option>
              <option value="intermediario">Intermediário</option>
              <option value="avancado">Avançado</option>
            </select>
            <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-blue-500 focus:outline-none" value={workoutFormData.frequency} onChange={e => setWorkoutFormData({ ...workoutFormData, frequency: e.target.value })}>
              <option value="1">1x Semana</option>
              <option value="2">2x Semana</option>
              <option value="3">3x Semana</option>
              <option value="4">4x Semana</option>
              <option value="5">5x Semana</option>
              <option value="6">6x Semana</option>
              <option value="7">Todos dias</option>
            </select>
          </div>
          <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-blue-500 focus:outline-none" value={workoutFormData.duration} onChange={e => setWorkoutFormData({ ...workoutFormData, duration: e.target.value })}>
            <option value="short">Curto (30min)</option>
            <option value="medium">Médio (60min)</option>
            <option value="long">Longo (90min+)</option>
          </select>
          <textarea placeholder="Observações (lesões, foco...)" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-blue-500 focus:outline-none" value={workoutFormData.observations} onChange={e => setWorkoutFormData({ ...workoutFormData, observations: e.target.value })} />

          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Anexos Opcionais</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <label className="flex flex-col items-center justify-center p-3 bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl hover:border-blue-500 transition-all cursor-pointer group">
                  <UploadCloud className="w-5 h-5 text-slate-500 group-hover:text-blue-400 mb-1" />
                  <span className="text-[10px] text-slate-400 group-hover:text-slate-200 truncate max-w-full">
                    {workoutDocument ? workoutDocument.name : 'Exame/PDF'}
                  </span>
                  <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => setWorkoutDocument(e.target.files?.[0] || null)} />
                </label>
                {workoutDocument && (
                  <button type="button" onClick={() => setWorkoutDocument(null)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-400 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="relative">
                <label className="flex flex-col items-center justify-center p-3 bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl hover:border-blue-500 transition-all cursor-pointer group overflow-hidden">
                  {workoutPhotoPreview ? (
                    <img src={workoutPhotoPreview} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-slate-500 group-hover:text-blue-400 mb-1" />
                  )}
                  <span className="text-[10px] text-slate-400 group-hover:text-slate-200 relative z-10">
                    {workoutPhoto ? 'Trocar Foto' : 'Foto Atual'}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const file = e.target.files?.[0] || null;
                    setWorkoutPhoto(file);
                    if (workoutPhotoPreview) URL.revokeObjectURL(workoutPhotoPreview);
                    if (file) setWorkoutPhotoPreview(URL.createObjectURL(file));
                    else setWorkoutPhotoPreview(null);
                  }} />
                </label>
                {workoutPhoto && (
                  <button type="button" onClick={() => { if (workoutPhotoPreview) URL.revokeObjectURL(workoutPhotoPreview); setWorkoutPhoto(null); setWorkoutPhotoPreview(null); }} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-400 transition-colors z-20">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <button type="submit" disabled={generatingWorkout} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all">{generatingWorkout ? <Loader2 className="animate-spin mx-auto" /> : `Gerar Treino com IA (-${getGenerationCost()} Créditos)`}</button>
        </form>
      </div>
    </div>
  );

  const renderGenerateDietForm = () => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 w-full max-w-lg relative shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button onClick={() => { setShowGenerateDietForm(false); resetDietForm(); }} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Utensils className="w-6 h-6 text-emerald-400" /> Gerar Dieta Personalizada</h3>
        <form onSubmit={handleGenerateDiet} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input type="number" placeholder="Peso (kg)" required className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none" value={dietFormData.weight} onChange={e => setDietFormData({ ...dietFormData, weight: e.target.value })} />
            <input type="number" placeholder="Altura (cm)" required className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none" value={dietFormData.height} onChange={e => setDietFormData({ ...dietFormData, height: e.target.value })} />
          </div>
          <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none" value={dietFormData.gender} onChange={e => setDietFormData({ ...dietFormData, gender: e.target.value })}>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
          </select>
          <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none" value={dietFormData.goal} onChange={e => setDietFormData({ ...dietFormData, goal: e.target.value })}>
            <option value="emagrecer">Emagrecer</option>
            <option value="ganhar_massa">Hipertrofia</option>
            <option value="manutencao">Manutenção</option>
          </select>
          <textarea placeholder="Restrições alimentares..." className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none" value={dietFormData.observations} onChange={e => setDietFormData({ ...dietFormData, observations: e.target.value })} />

          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Anexos Opcionais</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <label className="flex flex-col items-center justify-center p-3 bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl hover:border-emerald-500 transition-all cursor-pointer group">
                  <UploadCloud className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 mb-1" />
                  <span className="text-[10px] text-slate-400 group-hover:text-slate-200 truncate max-w-full">
                    {dietDocument ? dietDocument.name : 'Exame/PDF'}
                  </span>
                  <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => setDietDocument(e.target.files?.[0] || null)} />
                </label>
                {dietDocument && (
                  <button type="button" onClick={() => setDietDocument(null)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-400 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="relative">
                <label className="flex flex-col items-center justify-center p-3 bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl hover:border-emerald-500 transition-all cursor-pointer group overflow-hidden">
                  {dietPhotoPreview ? (
                    <img src={dietPhotoPreview} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 mb-1" />
                  )}
                  <span className="text-[10px] text-slate-400 group-hover:text-slate-200 relative z-10">
                    {dietPhoto ? 'Trocar Foto' : 'Foto Atual'}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const file = e.target.files?.[0] || null;
                    setDietPhoto(file);
                    if (dietPhotoPreview) URL.revokeObjectURL(dietPhotoPreview);
                    if (file) setDietPhotoPreview(URL.createObjectURL(file));
                    else setDietPhotoPreview(null);
                  }} />
                </label>
                {dietPhoto && (
                  <button type="button" onClick={() => { if (dietPhotoPreview) URL.revokeObjectURL(dietPhotoPreview); setDietPhoto(null); setDietPhotoPreview(null); }} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-400 transition-colors z-20">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <button type="submit" disabled={generatingDiet} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all">{generatingDiet ? <Loader2 className="animate-spin mx-auto" /> : `Gerar Dieta com IA (-${getGenerationCost()} Créditos)`}</button>
        </form>
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
      <BuyCreditsModal
        isOpen={showBuyCreditsModal}
        onClose={() => setShowBuyCreditsModal(false)}
        currentUser={currentUser}
      />

      <header className="sticky top-0 z-50 glass-panel border-b-0" style={{ paddingTop: 'max(35px, env(safe-area-inset-top))' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-default">
            {currentUser?.brandLogo ? (
              <img
                src={getFullImageUrl(currentUser.brandLogo)}
                alt="Logo"
                className="h-10 w-auto object-contain max-w-[150px]"
              />
            ) : (
              <>
                <div className="p-2 bg-blue-600 rounded-lg group-hover:bg-blue-500 transition-colors shadow-lg">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-xl font-bold tracking-tight text-white hidden md:block">FitAI <span className="text-blue-400 font-light">Analyzer</span></h1>
                  {currentUser?.plan && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded w-fit -mt-1 hidden md:block
                        ${currentUser.plan.type === 'PRO' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        currentUser.plan.type === 'STUDIO' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' :
                          currentUser.plan.type === 'STARTER' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            'bg-slate-700 text-slate-400 border border-slate-600'}
                    `}>
                      {currentUser.plan.type}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Notification Center - Only for Personal and Professor */}
            {currentUser && (currentUser.role === 'personal' || currentUser.role === 'professor' || currentUser.role === 'user') && (
              <div className="flex items-center justify-center mr-2">
                <NotificationCenter currentUser={currentUser} />
              </div>
            )}
            {currentUser && (
              <button
                onClick={handleRefreshUser}
                className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-full border border-slate-700 text-slate-400 hover:text-white transition-all"
                title="Atualizar dados"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            {currentUser && (currentUser.role === 'user' || currentUser.role === 'personal') && (
              <div
                className="relative group cursor-help"
              >
                <button
                  onClick={() => setShowBuyCreditsModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-full border border-yellow-500/30 transition-all"
                >
                  <Coins className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-yellow-100">{currentUser.credits ?? 0}</span>
                </button>

                {/* Desktop Tooltip */}
                {currentUser.usage && (
                  <div className="hidden md:block absolute top-full right-0 mt-2 p-3 bg-slate-800 border border-slate-700 rounded-xl shadow-xl w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-50">
                    <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider border-b border-slate-700 pb-1">Seu Saldo</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Plano:</span>
                        <span className="text-white font-medium">{currentUser.usage.subscriptionCredits || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Comprados:</span>
                        <span className="text-emerald-400 font-medium">+{currentUser.usage.purchasedCredits || 0}</span>
                      </div>
                      <div className="border-t border-slate-700 my-1 pt-1 flex justify-between text-xs font-bold">
                        <span className="text-slate-300">Total:</span>
                        <span className="text-yellow-400">{currentUser.credits || 0}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* USER DROPDOWN & INTERACTION AREA */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)} // Toggle state
                className="flex items-center gap-2 group outline-none"
              >
                <div className="hidden md:block text-right">
                  <p className="text-sm font-bold text-white group-hover:text-blue-200 transition-colors">{currentUser?.name}</p>
                  <div className="flex items-center justify-end gap-1">
                    <p className="text-xs text-slate-400 capitalize">
                      {currentUser?.role === 'admin' ? 'Administrador' : (currentUser?.role === 'personal' ? 'Personal Trainer' : 'Aluno')}
                    </p>
                    {/* Mobile Badge */}
                    {currentUser?.plan && (
                      <span className={`md:hidden w-2 h-2 rounded-full
                            ${currentUser.plan.type === 'PRO' ? 'bg-emerald-500' :
                          currentUser.plan.type === 'STUDIO' ? 'bg-purple-500' :
                            currentUser.plan.type === 'STARTER' ? 'bg-yellow-500' :
                              'bg-slate-700'}
                        `} />
                    )}
                  </div>
                </div>
                <div className={`w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600 relative transition-all overflow-hidden ${showUserMenu ? 'ring-2 ring-blue-500 border-blue-400' : 'group-hover:border-slate-500'}`}>
                  {currentUser?.avatar ? (
                    <img src={getFullImageUrl(currentUser.avatar)} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-5 h-5 text-slate-300" />
                  )}
                  {currentUser?.plan && (
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 flex items-center justify-center text-[8px] font-bold text-white z-10
                        ${currentUser.plan.type === 'PRO' ? 'bg-emerald-500' :
                        currentUser.plan.type === 'STUDIO' ? 'bg-purple-500' :
                          currentUser.plan.type === 'STARTER' ? 'bg-yellow-500' :
                            'bg-slate-500'}
                     `}>
                      {currentUser.plan.type[0]}
                    </div>
                  )}
                </div>
              </button>

              {/* DROPDOWN MENU */}
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)}></div> {/* Overlay to close */}
                  <div className="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-3 border-b border-slate-700/50 md:hidden">
                      <p className="text-sm font-bold text-white">{currentUser?.name}</p>
                      <p className="text-xs text-slate-400 capitalize">{currentUser?.role}</p>
                    </div>

                    <div className="p-2 space-y-1">
                      {/* Profile Photo Option */}
                      <button
                        onClick={() => { profileInputRef.current?.click(); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-700 transition-colors text-left"
                      >
                        <input
                          type="file"
                          ref={profileInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={handleProfilePhotoUpload}
                        />
                        <div className="p-1.5 bg-slate-600 rounded-lg text-white">
                          <Camera className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Alterar Foto</p>
                          <p className="text-[10px] text-slate-400">Personalize seu perfil</p>
                        </div>
                      </button>

                      <button
                        onClick={() => { setShowPlansModal(true); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-700 transition-colors text-left"
                      >
                        <div className="p-1.5 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg text-white">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Upgrade de Plano</p>
                          <p className="text-[10px] text-slate-400">Desbloqueie recursos</p>
                        </div>
                      </button>

                      <button
                        onClick={() => { setShowBuyCreditsModal(true); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-700 transition-colors text-left"
                      >
                        <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg text-white">
                          <Coins className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Meus Créditos</p>
                          <p className="text-[10px] text-slate-400">Recarga e Histórico</p>
                        </div>
                      </button>
                      <button
                        onClick={() => { setShowAnamnesisModal(true); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-700 transition-colors text-left"
                      >
                        <div className="p-1.5 bg-blue-500 rounded-lg text-white">
                          <ClipboardList className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Meu Perfil de Treino</p>
                          <p className="text-[10px] text-slate-400">Ficha de Avaliação (IA)</p>
                        </div>
                      </button>

                      <button
                        onClick={() => { setShowEvolutionPhotosModal(true); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-700 transition-colors text-left"
                      >
                        <div className="p-1.5 bg-purple-500 rounded-lg text-white">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Minha Evolução</p>
                          <p className="text-[10px] text-slate-400">Fotos comparativas</p>
                        </div>
                      </button>

                      <button
                        onClick={() => { setShowChangePasswordModal(true); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-700 transition-colors text-left"
                      >
                        <div className="p-1.5 bg-slate-700 rounded-lg text-slate-300">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Alterar Senha</p>
                          <p className="text-[10px] text-slate-400">Atualizar credenciais</p>
                        </div>
                      </button>

                      <div className="h-px bg-slate-700/50 my-1"></div>

                      <div className="h-px bg-slate-700/50 my-1"></div>

                      {/* WhatsApp Contact Button */}
                      <a
                        href="https://wa.me/5511974927080?text=Olá! Preciso de ajuda com o FitAI."
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setShowUserMenu(false)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Falar no WhatsApp</span>
                      </a>

                      <button
                        onClick={() => {
                          secureStorage.removeItem('hasSeenOnboarding_v6'); // Reset for re-viewing
                          setStep(AppStep.ONBOARDING);
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-500/10 hover:text-blue-400 text-slate-300 transition-colors"
                      >
                        <HelpCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Ver Tutorial</span>
                      </button>

                      <button
                        onClick={() => { handleLogout(); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 hover:text-red-400 text-slate-300 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm font-medium">Sair da Conta</span>
                      </button>

                      <div className="h-px bg-slate-700/50 my-1"></div>

                      <button
                        onClick={() => { handleDeleteAccount(); setShowUserMenu(false); }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-2 rounded-xl text-slate-600 hover:text-red-400 hover:bg-slate-700/30 transition-all group/delete"
                      >
                        <Trash2 className="w-3 h-3 group-hover/delete:scale-110 transition-transform" />
                        <span className="text-[10px] font-medium uppercase tracking-wider">Excluir Conta</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div >
      </header >

      {showWorkoutModal && renderWorkoutModal()}
      {showDietModal && renderDietModal()}
      {showGenerateWorkoutForm && renderGenerateWorkoutForm()}
      {showGenerateDietForm && renderGenerateDietForm()}
      {showCheckInModal && renderCheckInModal()}
      {showChangePasswordModal && renderChangePasswordModal()}

      {
        showEvolutionPhotosModal && currentUser && (
          <EvolutionPhotosModal
            isOpen={showEvolutionPhotosModal}
            onClose={() => setShowEvolutionPhotosModal(false)}
            targetUser={currentUser}
            currentUser={currentUser}
          />
        )
      }

      {
        showAnamnesisModal && currentUser && (
          <AnamnesisModal
            isOpen={showAnamnesisModal}
            onClose={() => setShowAnamnesisModal(false)}
            user={currentUser}
            onUpdate={handleUpdateUser}
            isEditable={true}
          />
        )
      }

      {/* Evolution Modal Rendering */}
      {
        showEvolutionModal && selectedExercise && (
          <EvolutionModal
            isOpen={showEvolutionModal}
            onClose={() => setShowEvolutionModal(false)}
            history={historyRecords}
            exerciseType={exercisesList.find(e => e.id === selectedExercise)?.name || selectedExercise}
            highlightLatestAsCurrent={false}
            onDelete={handleDeleteRecord}
            triggerConfirm={triggerConfirm}
            userId={currentUser?.id || ''}
            userRole={currentUser?.role || 'user'}
          />
        )
      }

      {/* Achievements Modal Rendering */}
      {
        showAchievementsModal && currentUser && (
          <AchievementsModal
            userId={currentUser.id}
            onClose={() => setShowAchievementsModal(false)}
          />
        )
      }

      {/* Renderização Condicional baseada no Role */}
      <main className="flex-grow flex items-center justify-center p-4 md:p-8">

        {/* DASHBOARD PARA ADMIN, PERSONAL E PROFESSOR */}
        {step === AppStep.ADMIN_DASHBOARD && (currentUser?.role === 'admin' || currentUser?.role === 'personal' || currentUser?.role === 'professor') && (
          <AdminDashboard currentUser={currentUser} onRefreshData={() => { }} onUpdateUser={handleUpdateUser} />
        )}

        {/* FLUXO DE ALUNO (SELEÇÃO DE EXERCÍCIO) */}
        {step === AppStep.SELECT_EXERCISE && (
          <div className="w-full max-w-6xl animate-fade-in flex flex-col items-center">

            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold uppercase mb-4 border border-blue-500/20">
                <Sparkles className="w-3 h-3" /> Sua Área de Treino
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white">Olá! <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">O que vamos fazer hoje?</span></h2>
            </div>

            {/* Weekly Check-in Tracker */}
            {currentUser && (
              <WeeklyCheckInTracker
                userId={currentUser.id}
                onOpenCheckIn={(date) => { setCheckInDate(date); setShowCheckInModal(true); }}
                showToast={showToast}
                refreshTrigger={checkInUpdateTrigger}
                weeklyGoal={calculatedWeeklyGoal}
              />
            )}

            {/* Achievements Button */}
            {currentUser && (
              <button
                onClick={() => setShowAchievementsModal(true)}
                className="w-full max-w-5xl mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 hover:border-amber-500/50 hover:from-amber-500/20 hover:to-orange-500/20 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl text-white shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-amber-400 font-bold text-base">Minhas Conquistas</h3>
                    <p className="text-slate-400 text-xs">Veja suas medalhas e progressos</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-amber-500/50 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
              </button>
            )}

            {/* ALERTA DE SEGURANÇA CARDIOVASCULAR (ANAMNESE) */}
            {currentUser?.anamnesis?.health?.chestPain && (
              <div className="w-full max-w-5xl mb-8 p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/50 flex flex-col md:flex-row items-center gap-4 animate-bounce-subtle">
                <div className="p-3 bg-red-500 rounded-xl text-white shadow-lg shadow-red-500/20">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div className="flex-grow text-center md:text-left">
                  <h3 className="text-xl font-bold text-red-400">Restrição Médica Detectada</h3>
                  <p className="text-slate-300 text-sm">Identificamos dor no peito em sua avaliação. <strong>Não inicie exercícios sem liberação médica.</strong></p>
                </div>
                <button
                  onClick={() => setShowAnamnesisModal(true)}
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20 whitespace-nowrap"
                >
                  Revisar Avaliação
                </button>
              </div>
            )}

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
                  currentUser?.accessLevel === 'READONLY' ? (
                    <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-4 border-2 border-slate-700 bg-slate-800/50 h-full min-h-[160px] cursor-not-allowed opacity-70">
                      <div className="p-4 bg-slate-700 rounded-full text-slate-400 shadow-lg"><Lock className="w-8 h-8" /></div>
                      <div className="text-center"><h3 className="text-slate-400 font-bold text-xl">Gerar Treino</h3><p className="text-slate-500 text-xs mt-1">Consulte seu Professor</p></div>
                    </div>
                  ) : (
                    <button
                      onClick={handleOpenWorkoutForm}
                      className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all border-2 border-blue-500/30 hover:bg-blue-600/10 hover:border-blue-500 h-full min-h-[160px] group"
                    >
                      <div className="p-4 bg-blue-600 rounded-full text-white shadow-lg group-hover:scale-110 transition-transform"><Dumbbell className="w-8 h-8" /></div>
                      <div className="text-center"><h3 className="text-blue-400 font-bold text-xl">Gerar Treino IA</h3><p className="text-slate-400 text-xs mt-1">Crie sua ficha personalizada</p></div>
                    </button>
                  )
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
                  currentUser?.accessLevel === 'READONLY' ? (
                    <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-4 border-2 border-slate-700 bg-slate-800/50 h-full min-h-[160px] cursor-not-allowed opacity-70">
                      <div className="p-4 bg-slate-700 rounded-full text-slate-400 shadow-lg"><Lock className="w-8 h-8" /></div>
                      <div className="text-center"><h3 className="text-slate-400 font-bold text-xl">Gerar Dieta</h3><p className="text-slate-500 text-xs mt-1">Consulte seu Professor</p></div>
                    </div>
                  ) : (
                    <button
                      onClick={handleOpenDietForm}
                      className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all border-2 border-emerald-500/30 hover:bg-emerald-600/10 hover:border-emerald-500 h-full min-h-[160px] group"
                    >
                      <div className="p-4 bg-emerald-600 rounded-full text-white shadow-lg group-hover:scale-110 transition-transform"><Utensils className="w-8 h-8" /></div>
                      <div className="text-center"><h3 className="text-emerald-400 font-bold text-xl">Gerar Dieta IA</h3><p className="text-slate-400 text-xs mt-1">Crie seu cardápio ideal</p></div>
                    </button>
                  )
                )
              )}

              {/* Card de Análise Livre */}
              <button
                disabled={currentUser?.accessLevel === 'READONLY'}
                onClick={() => handleExerciseToggle(SPECIAL_EXERCISES.FREE_MODE)}
                className={`glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all border-2 h-full min-h-[160px] group ${selectedExercise === SPECIAL_EXERCISES.FREE_MODE ? 'border-yellow-500 bg-yellow-600/10' : 'border-yellow-500/30 hover:bg-yellow-600/10'}`}
              >
                <div className={`p-4 rounded-full text-white shadow-lg transition-transform ${selectedExercise === SPECIAL_EXERCISES.FREE_MODE ? 'bg-yellow-500' : 'bg-yellow-600/80 group-hover:scale-110'}`}>
                  <HelpCircle className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <h3 className="text-white font-bold text-xl">Análise Livre</h3>
                  <p className="text-slate-400 text-xs mt-1">Exercício não listado? Envie o vídeo aqui.</p>
                </div>
              </button>
            </div>

            <div className="w-full max-w-5xl flex flex-col md:flex-row gap-3 mb-8">
              {/* Posture Analysis Card */}
              {postureExercise && (
                <button
                  disabled={currentUser?.accessLevel === 'READONLY'}
                  className={`glass-panel p-5 rounded-2xl flex items-center gap-4 group transition-all border-2 flex-1 text-left ${currentUser?.accessLevel === 'READONLY' ? 'opacity-50 cursor-not-allowed border-slate-700' : (selectedExercise === postureExercise.id ? 'border-emerald-500 bg-emerald-600/20' : 'border-emerald-500/30 hover:bg-emerald-600/20')}`}
                  onClick={() => handleExerciseToggle(postureExercise.id)}
                >
                  <div className={`p-3 rounded-full text-white shadow-lg transition-transform ${hasPostureAccess ? 'bg-emerald-600 group-hover:scale-110' : 'bg-slate-700'}`}><ScanLine className="w-5 h-5" /></div>
                  <div className="text-left"><h3 className="text-white font-bold text-lg">{postureExercise.name}</h3><p className="text-slate-400 text-xs">Biofeedback Postural</p></div>
                </button>
              )}

              {/* Body Composition Card */}
              {bodyCompExercise && (
                <button
                  disabled={currentUser?.accessLevel === 'READONLY'}
                  className={`glass-panel p-5 rounded-2xl flex items-center gap-4 group transition-all border-2 flex-1 text-left ${currentUser?.accessLevel === 'READONLY' ? 'opacity-50 cursor-not-allowed border-slate-700' : (selectedExercise === bodyCompExercise.id ? 'border-violet-500 bg-violet-600/20' : 'border-violet-500/30 hover:bg-violet-600/20')}`}
                  onClick={() => handleExerciseToggle(bodyCompExercise.id)}
                >
                  <div className={`p-3 rounded-full text-white shadow-lg transition-transform ${hasBodyCompAccess ? 'bg-violet-600 group-hover:scale-110' : 'bg-slate-700'}`}><Scale className="w-5 h-5" /></div>
                  <div className="text-left"><h3 className="text-white font-bold text-lg">{bodyCompExercise.name}</h3><p className="text-slate-400 text-xs">Biotipo & % Gordura</p></div>
                </button>
              )}


              {/* Fotos Evolução Card */}
              <button
                disabled={!canAccessEvolution}
                className={`glass-panel p-5 rounded-2xl flex items-center gap-4 group transition-all border-2 flex-1 text-left ${canAccessEvolution ? 'border-blue-500/30 hover:bg-blue-600/20' : 'opacity-50 cursor-not-allowed grayscale border-slate-700'}`}
                onClick={() => canAccessEvolution && setShowEvolutionPhotosModal(true)}
              >
                <div className={`p-3 rounded-full text-white shadow-lg transition-transform ${canAccessEvolution ? 'bg-blue-600 group-hover:scale-110' : 'bg-slate-700'}`}><ImageIcon className="w-5 h-5" /></div>
                <div className="text-left"><h3 className="text-white font-bold text-lg">Fotos Evolução</h3><p className="text-slate-400 text-xs">{canAccessEvolution ? 'Comparativo Visual' : 'Recurso Bloqueado'}</p></div>
              </button>
            </div>

            {/* --- ACCORDION CONTAINER FOR EXERCISE LIST --- */}
            {currentUser?.accessLevel !== 'READONLY' && (
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
                  {/* MODIFICAÇÃO: Removido overflow-hidden interno e adicionado padding para permitir scale sem corte */}
                  <div className="overflow-visible p-4">
                    <div id="exercise-grid" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full min-h-[10px]">
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
            )}

            <div className={`sticky bottom-8 z-40 flex flex-col items-center gap-4 transition-all duration-300 justify-center ${selectedExercise ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>

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
        )
        }

        {/* ... (Step UPLOAD_VIDEO mantido) ... */}
        {
          step === AppStep.UPLOAD_VIDEO && selectedExercise && (
            <div className="w-full max-w-4xl animate-fade-in relative">

              {/* Background Glow Effect for Depth */}
              <div className="absolute inset-0 bg-blue-600/10 blur-[100px] rounded-full pointer-events-none -z-10 transform scale-150 opacity-50"></div>

              <div className="glass-panel rounded-3xl p-6 md:p-12 shadow-2xl border border-slate-700/50 backdrop-blur-xl relative overflow-hidden">

                {/* Decorative Header Bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-70"></div>

                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center p-3 bg-blue-500/20 text-blue-400 rounded-full mb-4 shadow-inner ring-1 ring-blue-500/30">
                    {selectedExercise === SPECIAL_EXERCISES.FREE_MODE ? <Sparkles className="w-8 h-8" /> : (selectedExerciseObj ? EXERCISE_ICONS[selectedExerciseObj.alias] || <Dumbbell className="w-8 h-8" /> : <Dumbbell className="w-8 h-8" />)}
                  </div>
                  <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 tracking-tight">Envio de Mídia</h2>
                  <p className="text-slate-400 text-lg">Analise seu <span className="text-white font-bold">{selectedExerciseName}</span></p>

                  {/* AI Features Badge Grid */}
                  <div className="grid grid-cols-3 gap-2 max-w-md mx-auto mt-6">
                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                      <ScanLine className="w-4 h-4 text-emerald-400 mb-1" />
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Biomecânica</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                      <ShieldCheck className="w-4 h-4 text-blue-400 mb-1" />
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Segurança</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                      <Activity className="w-4 h-4 text-purple-400 mb-1" />
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Performance</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-6 mb-8">
                  {/* Pre-Upload Tip Context */}
                  {!mediaFile && (
                    <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3 animate-in slide-in-from-bottom-2">
                      <Lightbulb className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-blue-100 text-sm font-medium">Dica de Ouro:</p>
                        <p className="text-slate-400 text-xs italic">"{getExerciseTip()}"</p>
                      </div>
                    </div>
                  )}

                  <div className="relative w-full">
                    <label htmlFor="video-upload" className={`group relative flex flex-col items-center justify-center w-full rounded-2xl cursor-pointer transition-all duration-500 overflow-hidden ${!!mediaFile ? 'bg-black border-slate-700 h-auto aspect-video shadow-2xl' : 'h-72 border-2 border-dashed border-slate-600 bg-slate-800/30 hover:border-blue-500 hover:bg-slate-800/60'}`}>
                      {mediaPreview ? (
                        <>
                          {mediaFile && mediaFile.type && mediaFile.type.startsWith('image/') ? <img src={mediaPreview!} className="h-full w-full object-contain" /> : <video src={mediaPreview!} className="h-full w-full object-contain" controls={false} autoPlay muted loop playsInline />}

                          {/* TECH HUD OVERLAY */}
                          <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-blue-500/70 rounded-tl-lg"></div>
                            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-blue-500/70 rounded-tr-lg"></div>
                            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-blue-500/70 rounded-bl-lg"></div>
                            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-blue-500/70 rounded-br-lg"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-white/20 rounded-full flex items-center justify-center">
                              <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse"></div>
                            </div>
                            <div className="absolute bottom-6 left-0 right-0 text-center">
                              <span className="bg-black/60 px-3 py-1 rounded text-[10px] text-white font-mono uppercase tracking-widest border border-white/10">Análise Pronta</span>
                            </div>
                          </div>

                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                            <div className="flex flex-col items-center gap-2 text-white">
                              <div className="p-3 bg-white/10 rounded-full backdrop-blur-md border border-white/20">
                                <RefreshCcw className="w-8 h-8" />
                              </div>
                              <span className="font-bold text-sm tracking-wide">Clique para Trocar</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center p-4">
                          <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center mb-6 text-slate-400 group-hover:text-blue-400 transition-all duration-300 shadow-xl border border-slate-600 group-hover:border-blue-500/50 group-hover:scale-110 relative">
                            {/* Pulse Effect behind icon */}
                            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping opacity-0 group-hover:opacity-100"></div>
                            {(isSpecialMode || isPostureOrBodyComp) ? <ImageIcon className="w-8 h-8 relative z-10" /> : <UploadCloud className="w-8 h-8 relative z-10" />}
                          </div>
                          <p className="text-slate-200 font-bold text-lg group-hover:text-white transition-colors">{isPostureOrBodyComp ? 'Selecionar Fotos' : (isSpecialMode && selectedExercise !== SPECIAL_EXERCISES.FREE_MODE) ? 'Selecionar Foto' : 'Selecionar Vídeo'}</p>
                          <p className="text-slate-500 text-xs mt-2 max-w-[200px] text-center group-hover:text-slate-400">
                            Certifique-se de que o corpo inteiro esteja visível
                          </p>
                          {!isSpecialMode && !isPostureOrBodyComp && (
                            <div className="mt-4 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full flex items-center gap-2">
                              <Timer className="w-3 h-3 text-yellow-500" />
                              <span className="text-[10px] text-yellow-200 font-medium">Recomendado: vídeos de até 2 min</span>
                            </div>
                          )}
                        </div>
                      )}
                      <input ref={fileInputRef} id="video-upload" type="file" accept={(isSpecialMode || isPostureOrBodyComp) ? "video/*,image/*" : "video/*"} className="hidden" onChange={handleFileChange} multiple={isPostureOrBodyComp} />
                    </label>

                    {!!mediaFile && (
                      <button
                        onClick={clearSelectedMedia}
                        className="absolute -top-3 -right-3 p-2 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-500 transition-colors z-10 border-2 border-slate-900"
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

                {!!mediaFile && !error && (
                  <div className="mb-6 flex justify-center">
                    <button
                      onClick={triggerFilePicker}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700 text-slate-300 rounded-full text-xs font-semibold transition-all border border-slate-700"
                    >
                      <RefreshCcw className="w-3 h-3" /> Trocar Arquivo
                    </button>
                  </div>
                )}

                <div className="flex gap-4 pt-4 border-t border-slate-700/50">
                  <button
                    onClick={handleGoBackToSelect}
                    className="px-6 py-4 rounded-2xl bg-transparent border border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white transition-all font-semibold"
                  >
                    Voltar
                  </button>
                  <button
                    disabled={!mediaFile}
                    onClick={handleAnalysis}
                    className={`flex-1 px-8 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 text-lg group ${!!mediaFile ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] hover:scale-[1.02]' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                  >
                    {!!mediaFile ? (
                      <>
                        <Sparkles className="w-5 h-5 text-yellow-300 group-hover:animate-spin" />
                        <span>Iniciar Análise IA</span>
                      </>
                    ) : 'Analisar Agora'}
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {
          (step === AppStep.ANALYZING || step === AppStep.COMPRESSING) && selectedExercise && (
            <LoadingScreen
              step={step}
              tip={getExerciseTip()}
              exerciseType={selectedExercise === SPECIAL_EXERCISES.FREE_MODE ? SPECIAL_EXERCISES.FREE_MODE : (selectedExerciseObj?.alias || 'STANDARD')}
            />
          )
        }

        {
          step === AppStep.RESULTS && analysisResult && selectedExercise && (
            <ResultView
              result={analysisResult}
              exercise={selectedExercise === SPECIAL_EXERCISES.FREE_MODE ? SPECIAL_EXERCISES.FREE_MODE : (selectedExerciseObj?.name || 'Exercício')}
              history={historyRecords}
              userId={currentUser?.id || ''}
              currentUser={currentUser}
              onReset={resetAnalysis}
              onDeleteRecord={handleDeleteRecord}
              onWorkoutSaved={() => currentUser && fetchUserWorkouts(currentUser.id)}
              onDietSaved={() => currentUser && fetchUserDiets(currentUser.id)}
              showToast={showToast}
              triggerConfirm={triggerConfirm}
            />
          )
        }
      </main >

      {/* --- MODALS --- */}
      {activeWorkoutDay && (
        <WorkoutSession
          dayData={activeWorkoutDay}
          dayLabel={activeWorkoutDay.dayLabel}
          onFinish={handleFinishSession}
          onCancel={() => setActiveWorkoutDay(null)}
          previousLoads={previousLoads}
        />
      )}
      < SubscriptionModal
        isOpen={showPlansModal}
        onClose={() => setShowPlansModal(false)}
        currentUser={currentUser}
      />

      {/* --- OFFLINE BANNER --- */}
      {
        isOffline && (
          <div className="fixed bottom-0 left-0 right-0 bg-red-600 text-white py-2 px-4 flex items-center justify-center gap-3 z-[1000] animate-in slide-in-from-bottom-full duration-300">
            <Smartphone className="w-5 h-5 opacity-80" />
            <span className="text-sm font-bold">Você está offline. Algumas funções podem não funcionar.</span>
            <RefreshCcw className="w-4 h-4 animate-spin-slow opacity-60" />
          </div>
        )
      }
    </div >
  );
};

export default App;