export enum ExerciseType {
  SQUAT = 'Agachamento (Squat)',
  PUSHUP = 'Flexão de Braço (Push-up)',
  LUNGE = 'Afundo (Lunge)',
  BURPEE = 'Burpee',
  PLANK = 'Prancha (Plank)'
}

export interface AnalysisResult {
  score: number;
  repetitions: number;
  feedback: string[];
  formCorrection: string;
  muscleGroups: string[];
}

export enum AppStep {
  SELECT_EXERCISE = 'SELECT_EXERCISE',
  UPLOAD_VIDEO = 'UPLOAD_VIDEO',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS'
}