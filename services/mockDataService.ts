import { ExerciseDTO, ExerciseRecord, User, UserRole, AnalysisResult } from "../types";
import { apiService } from "./apiService"; // Importando o serviço que já tem a correção de CORS

// Keys for LocalStorage
const USERS_KEY = 'fitai_users';
const RECORDS_KEY = 'fitai_records';
const CURRENT_USER_KEY = 'fitai_current_session';
const IMAGES_KEY = 'fitai_exercise_images';

const FALLBACK_EXERCISES: ExerciseDTO[] = [
  { id: 'SQUAT', alias: 'SQUAT', name: 'Agachamento (Squat)', category: 'STANDARD' },
  { id: 'PUSHUP', alias: 'PUSHUP', name: 'Flexão de Braço (Push-up)', category: 'STANDARD' },
  { id: 'POSTURE_ANALYSIS', alias: 'POSTURE_ANALYSIS', name: 'Análise de Postura', category: 'SPECIAL' },
  { id: 'BODY_COMPOSITION', alias: 'BODY_COMPOSITION', name: 'Composição Corporal', category: 'SPECIAL' },
  { id: 'FREE_ANALYSIS_MODE', alias: 'FREE_ANALYSIS_MODE', name: 'Análise Livre', category: 'SPECIAL' }
];

const mapBackendToInternalId = (backendName: string): string => {
  const lower = backendName.toLowerCase();
  if (lower.includes('squat') || lower.includes('agachamento')) return 'SQUAT';
  if (lower.includes('bench') || lower.includes('supino')) return 'BENCH_PRESS';
  if (lower.includes('push-up') || lower.includes('flexão')) return 'PUSHUP';
  if (lower.includes('lunge') || lower.includes('afundo')) return 'LUNGE';
  if (lower.includes('burpee')) return 'BURPEE';
  if (lower.includes('plank') || lower.includes('prancha')) return 'PLANK';
  if (lower.includes('jumping') || lower.includes('polichinelo')) return 'JUMPING_JACK';
  if (lower.includes('mountain') || lower.includes('escalador')) return 'MOUNTAIN_CLIMBER';
  if (lower.includes('crunch') || lower.includes('abdominal')) return 'CRUNCH';
  if (lower.includes('pull-up') || (lower.includes('barra') && !lower.includes('com barra')) || lower.includes('barra fixa')) return 'PULLUP';
  if (lower.includes('bridge') || lower.includes('pélvica')) return 'BRIDGE';
  if (lower.includes('búlgaro') || lower.includes('bulgarian')) return 'BULGARIAN_SQUAT';
  if (lower.includes('deadlift') || lower.includes('terra')) return 'DEADLIFT';
  if (lower.includes('dips') || lower.includes('tríceps') || lower.includes('mergulho')) return 'TRICEP_DIP';
  if (lower.includes('bicep') || lower.includes('rosca')) return 'BICEP_CURL';
  if (lower.includes('cross over') || lower.includes('crucifixo')) return 'CABLE_CROSSOVER';
  if (lower.includes('postura') || lower.includes('biofeedback')) return 'POSTURE_ANALYSIS';
  if (lower.includes('biotipo') || lower.includes('gordura') || lower.includes('corporal')) return 'BODY_COMPOSITION';
  return backendName.toUpperCase().replace(/\s+/g, '_');
};

export const MockDataService = {

  init: () => {
    // Inicialização básica de sessão local se necessário
    if (!localStorage.getItem(USERS_KEY)) {
      localStorage.setItem(USERS_KEY, JSON.stringify([]));
    }
  },

  // --- EXERCISES (GLOBAL LIST) ---
  fetchExercises: async (): Promise<ExerciseDTO[]> => {
      try {
          // Agora usamos o apiService para evitar CORS
          const data = await apiService.getAllExercises(1);
          if (Array.isArray(data) && data.length > 0) {
               return data.map((item: any) => {
                  const alias = mapBackendToInternalId(item.exercicio || item.name);
                  return {
                      id: item.id ? String(item.id) : (item.exercicio || item.name),
                      alias: alias,
                      name: item.exercicio || item.name,
                      category: (alias === 'POSTURE_ANALYSIS' || alias === 'BODY_COMPOSITION') ? 'SPECIAL' : 'STANDARD'
                  };
              });
          }
          return FALLBACK_EXERCISES;
      } catch (e) {
          return FALLBACK_EXERCISES;
      }
  },

  // --- FETCH USER SPECIFIC EXERCISES ---
  fetchUserExercises: async (userId: string): Promise<ExerciseDTO[]> => {
    try {
      // USANDO O MOTOR NATIVO VIA APISERVICE
      const data = await apiService.getUserExercises(userId);

      if (Array.isArray(data)) {
          return data.map((item: any) => {
              const alias = mapBackendToInternalId(item.exercicio);
              return {
                  id: item.id ? String(item.id) : item.exercicio,
                  alias: alias,
                  name: item.exercicio,
                  category: (alias === 'POSTURE_ANALYSIS' || alias === 'BODY_COMPOSITION') ? 'SPECIAL' : 'STANDARD'
              };
          });
      }
      return [];
    } catch (error) {
      console.error("Erro no MockDataService ao buscar exercícios:", error);
      return [];
    }
  },

  // --- AUTH ---
  login: async (email: string): Promise<User | null> => {
    const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      return user;
    }
    return null;
  },

  logout: () => {
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  // --- RECORDS / HISTORY ---
  saveResult: (userId: string, userName: string, exercise: string, result: AnalysisResult) => {
    const records: ExerciseRecord[] = JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]');
    const newRecord: ExerciseRecord = {
      id: Date.now().toString(),
      userId,
      userName,
      exercise,
      result: { ...result, date: new Date().toISOString() },
      timestamp: Date.now()
    };
    records.push(newRecord);
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  },

  // Atualizado para usar o backend via apiService se necessário, ou apenas local
  deleteRecord: async (userId: string, recordId: string): Promise<boolean> => {
    try {
        // Se quiser deletar do backend também, adicione uma rota no apiService
        // Por enquanto, limpamos o local para a UI atualizar
        const records: ExerciseRecord[] = JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]');
        const updatedRecords = records.filter(r => r.id !== recordId);
        localStorage.setItem(RECORDS_KEY, JSON.stringify(updatedRecords));
        return true;
    } catch (e) {
        return false;
    }
  },

  getUserHistory: (userId: string): ExerciseRecord[] => {
    const records: ExerciseRecord[] = JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]');
    return records
      .filter(r => r.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp);
  },

  // --- ASSETS ---
  getExerciseImages: (): Record<string, string> => {
    try {
      return JSON.parse(localStorage.getItem(IMAGES_KEY) || '{}');
    } catch (e) { return {}; }
  },

  saveExerciseImages: (images: Record<string, string>) => {
    try {
      localStorage.setItem(IMAGES_KEY, JSON.stringify(images));
    } catch (e) {}
  }
};

MockDataService.init();