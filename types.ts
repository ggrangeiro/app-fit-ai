
// Mantemos como type string para compatibilidade com o resto do código,
// mas removemos o ENUM hardcoded de valores.
export type ExerciseType = string;

// Interface para o objeto de exercício vindo do Backend
export interface ExerciseDTO {
  id: string; // ex: 'SQUAT'
  name: string; // ex: 'Agachamento (Squat)'
  category?: 'STANDARD' | 'SPECIAL';
  image_url?: string;
  description?: string;
}

export interface WorkoutPlan {
  id: number;
  userId: string;
  goal: string;
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
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  assignedExercises: string[]; // Agora é string[] pois vem do banco dinâmico
}

export interface ExerciseRecord {
  id: string;
  userId: string;
  userName: string;
  exercise: string; // Alterado de ExerciseType para string
  result: AnalysisResult;
  timestamp: number;
}