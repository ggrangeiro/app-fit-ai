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
  CABLE_CROSSOVER = 'Crucifixo no Cross Over'
}

export interface FeedbackItem {
  message: string;
  score: number;
}

export interface AnalysisResult {
  score: number;
  repetitions: number;
  feedback: FeedbackItem[];
  formCorrection: string;
  muscleGroups: string[];
  date?: string; // Add date for history
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
  assignedExercises: ExerciseType[]; // List of exercises this user is allowed to do
}

export interface ExerciseRecord {
  id: string;
  userId: string;
  userName: string;
  exercise: ExerciseType;
  result: AnalysisResult;
  timestamp: number;
}