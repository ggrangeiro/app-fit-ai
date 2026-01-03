
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
}

export interface DietPlan {
  id: number;
  userId: string | number;
  goal: string; // Frontend usa string, mapeamos para Enum no envio
  content: string; // HTML content
  createdAt?: string;
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
  RESULTS = 'RESULTS'
}

export type UserRole = 'admin' | 'user';

export interface User {
  id: string; // Frontend usa string, backend pode mandar number. Converteremos.
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  assignedExercises: string[]; // Agora é string[] pois vem do banco dinâmico
  token?: string; // JWT Token para o novo backend
  refreshToken?: string;
}

export interface ExerciseRecord {
  id: string;
  userId: string;
  userName: string;
  exercise: string; // Alterado de ExerciseType para string
  result: AnalysisResult;
  timestamp: number;
}