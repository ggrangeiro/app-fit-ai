
// Mantemos como type string para compatibilidade com o resto do código,
// mas removemos o ENUM hardcoded de valores.
export type ExerciseType = string;

// Interface para o objeto de exercício vindo do Backend
export interface ExerciseDTO {
  id: string; // ID ÚNICO (ex: "45" ou "uuid")
  alias: string; // ID DE TIPO/LÓGICA (ex: 'SQUAT') - usado para imagens/regras
  name: string; // ex: 'Agachamento (Squat)'
  category?: 'STANDARD' | 'SPECIAL';
  image_url?: string;
  description?: string;
}

// --- NOVOS ENUMS DO BACKEND V2 ---
export enum DietGoalEntity {
  WEIGHT_LOSS = 'WEIGHT_LOSS',
  HYPERTROPHY = 'HYPERTROPHY',
  MAINTENANCE = 'MAINTENANCE',
  DEFINITION = 'DEFINITION'
}

export enum TrainingGoalEntity {
  WEIGHT_LOSS = 'WEIGHT_LOSS',
  HYPERTROPHY = 'HYPERTROPHY',
  PURE_STRENGTH = 'PURE_STRENGTH',
  DEFINITION = 'DEFINITION'
}

export interface WorkoutPlan {
  id: number;
  userId: string | number;
  goal: string; // Frontend usa string, mapeamos para Enum no envio
  content: string; // HTML content
  createdAt?: string;
  daysData?: string; // JSON V2 structure
}

export interface DietPlan {
  id: number;
  userId: string | number;
  goal: string; // Frontend usa string, mapeamos para Enum no envio
  content: string; // HTML content
  createdAt?: string;
  daysData?: string; // JSON V2 structure
}

export const SPECIAL_EXERCISES = {
  POSTURE: 'POSTURE_ANALYSIS',
  BODY_COMPOSITION: 'BODY_COMPOSITION',
  FREE_MODE: 'FREE_ANALYSIS_MODE'
};

export interface FeedbackItem {
  message: string;
  score: number;
}

export interface DetailedImprovement {
  instruction: string; // O que fazer (ex: "Mantenha a coluna neutra")
  detail: string;      // O porquê/detalhe (ex: "Arredondar a lombar aumenta risco de hérnia...")
}

export interface AnalysisResult {
  isValidContent: boolean; // Indica se passou na validação de humano + categoria
  validationError?: string; // Mensagem explicando por que falhou na validação
  score: number;
  repetitions: number;
  feedback: FeedbackItem[]; // Mantido para compatibilidade, mas usado para scores por parte do corpo

  // Novos campos detalhados
  strengths?: string[]; // O que o usuário fez certo
  improvements?: DetailedImprovement[]; // Lista detalhada de correções

  gender?: string; // 'masculino' | 'feminino' detectado pela IA

  formCorrection: string;
  muscleGroups: string[];
  date?: string;
  identifiedExercise?: string; // Nome do exercício identificado no modo livre
}

export enum AppStep {
  LOGIN = 'LOGIN',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  SELECT_EXERCISE = 'SELECT_EXERCISE',
  UPLOAD_VIDEO = 'UPLOAD_VIDEO',
  COMPRESSING = 'COMPRESSING',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
  ONBOARDING = 'ONBOARDING',
  PAYMENT_CALLBACK = 'PAYMENT_CALLBACK'
}

export type UserRole = 'admin' | 'user' | 'personal';

export interface Plan {
  type: 'FREE' | 'STARTER' | 'PRO' | 'STUDIO';
  status: 'ACTIVE' | 'INACTIVE' | 'CANCELED' | 'PAST_DUE';
  renewsAt: string;
}

export interface Usage {
  credits: number;
  subscriptionCredits: number;
  purchasedCredits: number;
  generations: number;
  generationsLimit: number;
}

export interface Anamnesis {
  userId: string | number;
  updatedAt: string;

  personal: {
    fullName: string;
    whatsapp: string;
    birthDate: string;
    age: number;
    location: { city: string; state: string; country: string };
    maritalStatus: 'Solteiro(a)' | 'Casado(a)' | 'Divorciado(a)' | 'Viúvo(a)';
    profession: string;
    gender: 'Masculino' | 'Feminino';
  };

  physical: {
    weight: number;
    height: number;
    targetWeight: number;
    currentBodyShape: number; // 1-10
    desiredBodyShape: number;
  };

  health: {
    conditions: string[];
    injuries: string;
    dailyActivity: 'Sentado(a)' | 'Em pé' | 'Moderada' | 'Intensa';
    sleepQuality: 'Ruim' | 'Regular' | 'Boa' | 'Excelente';
    chestPain: boolean;
  };

  fitness: {
    currentlyExercising: boolean;
    trainingLocation: 'Academia' | 'Casa' | 'Ar Livre';
    weeklyFrequency: number;
    trainingTimeAvailable: string;
  };

  nutrition: {
    nutritionalMonitoring: boolean;
    eatingHabits: string;
  };

  preferences: {
    likedExercises: string;
    dislikedExercises: string;
    bodyPartFocus: string;
    cardioPreference: string;
  };

  goals: {
    threeMonthGoal: string;
    mainObstacle: string;
  };
}

export interface User {
  id: string; // Frontend usa string, backend pode mandar number. Converteremos.
  name: string;
  email: string;
  role: UserRole;
  credits: number; // Campo obrigatório para controle de fluxo
  avatar?: string;
  assignedExercises: string[]; // Agora é string[] pois vem do banco dinâmico
  token?: string; // JWT Token para o novo backend
  refreshToken?: string;
  personalId?: string; // ID do personal trainer responsável (se houver)
  phone?: string; // Telefone do usuário (mapeado do campo 'telefone' do backend)
  plan?: Plan;
  usage?: Usage;
  accessLevel?: 'FULL' | 'READONLY'; // Novo campo para controle de permissões
  anamnesis?: Anamnesis; // Novo campo para ficha de avaliação
  brandLogo?: string; // URL Relativa da Logo do Personal (White Label)
}

export interface ExerciseRecord {
  id: string;
  userId: string;
  userName: string;
  exercise: string; // Alterado de ExerciseType para string
  result: AnalysisResult;
  timestamp: number;
}
export interface WorkoutCheckIn {
  id: string;         // Gerado pelo backend (UUID)
  userId: string;     // ID do aluno
  workoutId: number;  // ID do treino/ficha realizado
  date: string;       // Data da realização (formato YYYY-MM-DD)
  status: 'completed';// Fixo em 'completed'
  timestamp: number;  // Unix timestamp (ms) do momento do registro
  comment?: string;   // Comentário opcional (string)
}

export interface CreditHistoryItem {
  id: number;
  userId: string;
  amount: number;
  reason: string;
  description: string;
  date: string;
}

// --- V2 STRUCTURED DATA TYPES ---

export interface SecurityAdjustment {
  alert: string;
  details: string;
}

export interface Motivation {
  quote: string;
  context: string;
}

export interface ExerciseV2 {
  order: number;
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  rest: string;
  technique?: string;
  videoQuery: string;
}

export interface WorkoutDayV2 {
  dayOfWeek: string;
  dayLabel: string;
  trainingType: string;
  isRestDay: boolean;
  note?: string;
  exercises: ExerciseV2[];
}

export interface WorkoutSummaryV2 {
  trainingStyle: string;
  estimatedDuration: string;
  focus: string[];
  considerations?: string;
  securityAdjustment?: SecurityAdjustment;
  motivation?: Motivation;
  technicalTip?: string;
}

export interface WorkoutPlanV2 {
  summary: WorkoutSummaryV2;
  days: WorkoutDayV2[];
}

export interface MealItemV2 {
  name: string;
  quantity: string;
  calories?: number;
  protein?: number;
  notes?: string;
}

export interface MealV2 {
  type: string;
  label: string;
  icon: string;
  time: string;
  items: MealItemV2[];
}

export interface DietDayV2 {
  dayOfWeek: string;
  dayLabel: string;
  isRestDay: boolean;
  note?: string;
  meals: MealV2[];
}

export interface DietSummaryV2 {
  totalCalories: number;
  protein: number;
  carbohydrates: number;
  fats: number;
  fiber?: number;
  water: string;
  considerations: string;
  securityAdjustment?: SecurityAdjustment;
  motivation?: Motivation;
}

export interface DietPlanV2 {
  summary: DietSummaryV2;
  days: DietDayV2[];
}
