export enum ExerciseType {
  SQUAT = 'Agachamento (Squat)',
  PUSHUP = 'Flexão de Braço (Push-up)',
  LUNGE = 'Afundo (Lunge)',
  BURPEE = 'Burpee',
  PLANK = 'Prancha (Plank)'
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