
export enum ExerciseType {
  SQUAT = 'Agachamento (Squat)',
  PUSHUP = 'Flexão de Braço (Push-up)',
  LUNGE = 'Afundo (Lunge)',
  BURPEE = 'Burpee',
  PLANK = 'Prancha (Plank)',
  JUMPING_JACK = 'Polichinelo (Jumping Jacks)',
  MOUNTAIN_CLIMBER = 'Escalador (Mountain Climber)',
  CRUNCH = 'Abdominal Supra (Crunch)',
  PULLUP = 'Barra Fixa (Pull-up)',
  BRIDGE = 'Elevação Pélvica (Glute Bridge)',
  
  // New Exercises
  BULGARIAN_SQUAT = 'Agachamento Búlgaro',
  DEADLIFT = 'Levantamento Terra (Deadlift)',
  TRICEP_DIP = 'Tríceps Banco (Dips)',
  BICEP_CURL = 'Rosca Direta (Bicep Curl)',
  CABLE_CROSSOVER = 'Crucifixo no Cross Over',
  
  // Special Analysis
  POSTURE_ANALYSIS = 'Análise de Postura (Biofeedback)',
  BODY_COMPOSITION = 'Análise Corporal (Biotipo & Gordura)'
}

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
  
  formCorrection: string;
  muscleGroups: string[];
  date?: string;
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
  assignedExercises: ExerciseType[]; 
}

export interface ExerciseRecord {
  id: string;
  userId: string;
  userName: string;
  exercise: ExerciseType;
  result: AnalysisResult;
  timestamp: number;
}
