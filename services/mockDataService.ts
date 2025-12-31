
import { ExerciseDTO, ExerciseRecord, User, UserRole, AnalysisResult } from "../types";

// Keys for LocalStorage
const USERS_KEY = 'fitai_users';
const RECORDS_KEY = 'fitai_records';
const CURRENT_USER_KEY = 'fitai_current_session';
const IMAGES_KEY = 'fitai_exercise_images';

// Fallback exercises caso a API falhe, para o app não quebrar totalmente
const FALLBACK_EXERCISES: ExerciseDTO[] = [
  { id: 'SQUAT', name: 'Agachamento (Squat)', category: 'STANDARD' },
  { id: 'PUSHUP', name: 'Flexão de Braço (Push-up)', category: 'STANDARD' },
  { id: 'POSTURE_ANALYSIS', name: 'Análise de Postura', category: 'SPECIAL' }
];

// Initial Seed Data (Default Admin)
const DEFAULT_ADMIN: User = {
  id: 'admin-1',
  name: 'Administrador Principal',
  email: 'admin@fitai.com',
  role: 'admin',
  assignedExercises: []
};

// Default Test User
const DEFAULT_TEST_USER: User = {
  id: 'test-user-1',
  name: 'Teste',
  email: 'teste@teste.com',
  role: 'user',
  assignedExercises: ['SQUAT', 'PUSHUP', 'POSTURE_ANALYSIS', 'BODY_COMPOSITION'] 
};

// Helper to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const MockDataService = {
  
  // --- EXERCISES (GLOBAL LIST - For Admin or Fallback) ---
  fetchExercises: async (): Promise<ExerciseDTO[]> => {
      try {
          const response = await fetch("https://testeai-732767853162.us-west1.run.app/api/usuarios/exercises", {
             method: 'GET',
             mode: 'cors',
             headers: { 
                 'Content-Type': 'application/json',
                 'Accept': 'application/json'
             }
          });
          
          if (response.ok) {
              const data = await response.json();
              if (Array.isArray(data) && data.length > 0) {
                  return data;
              }
          }
          return FALLBACK_EXERCISES;
      } catch (e) {
          console.error("Erro ao buscar exercícios globais:", e);
          return FALLBACK_EXERCISES;
      }
  },

  // --- NEW: FETCH USER SPECIFIC EXERCISES ---
  fetchUserExercises: async (userId: string): Promise<ExerciseDTO[]> => {
    const URL = `https://testeai-732767853162.us-west1.run.app/api/usuarios/${userId}/exercicios`;
    try {
      const response = await fetch(URL, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Garante que é um array
        if (Array.isArray(data)) {
            return data;
        }
      }
      console.warn(`API de exercícios do usuário retornou status ${response.status} ou formato inválido.`);
      return [];
    } catch (error) {
      console.error("Erro de conexão ao buscar exercícios do usuário:", error);
      return [];
    }
  },

  // --- AUTH ---

  init: () => {
    const usersRaw = localStorage.getItem(USERS_KEY);
    let users: User[] = usersRaw ? JSON.parse(usersRaw) : [];
    let hasChanges = false;

    // Ensure Admin exists
    if (!users.find(u => u.email === DEFAULT_ADMIN.email)) {
      users.push(DEFAULT_ADMIN);
      hasChanges = true;
    }

    // Ensure Test User exists
    if (!users.find(u => u.email === DEFAULT_TEST_USER.email)) {
      users.push(DEFAULT_TEST_USER);
      hasChanges = true;
    }

    if (hasChanges || !usersRaw) {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  },

  login: async (email: string): Promise<User | null> => {
    await delay(800); // Simulate network request
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

  // --- USER MANAGEMENT (Admin Only) ---

  getUsers: (): User[] => {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  },

  createUser: async (name: string, email: string, initialExercises?: string[]): Promise<User> => {
    await delay(800);
    const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("Este e-mail já possui cadastro.");
    }

    // If no specific exercises are passed, assign defaults
    const defaultExercises = initialExercises || ['SQUAT', 'PUSHUP']; 

    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      role: 'user',
      assignedExercises: defaultExercises
    };

    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return newUser;
  },

  updateUserExercises: (userId: string, exercises: string[]) => {
    const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return { ...u, assignedExercises: exercises };
      }
      return u;
    });
    localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
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

  getUserHistory: (userId: string): ExerciseRecord[] => {
    const records: ExerciseRecord[] = JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]');
    return records
      .filter(r => r.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp); // Newest first
  },

  // Novo método para pegar histórico filtrado por exercício (ignorando o registro atual se ele acabou de ser salvo)
  getHistoryByExercise: (userId: string, exercise: string): ExerciseRecord[] => {
    const records: ExerciseRecord[] = JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]');
    return records
      .filter(r => r.userId === userId && r.exercise === exercise)
      .sort((a, b) => b.timestamp - a.timestamp); // Mais recente primeiro
  },

  getAllHistory: (): ExerciseRecord[] => {
    const records: ExerciseRecord[] = JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]');
    return records.sort((a, b) => b.timestamp - a.timestamp);
  },

  // --- ASSETS ---

  getExerciseImages: (): Record<string, string> => {
    try {
      return JSON.parse(localStorage.getItem(IMAGES_KEY) || '{}');
    } catch (e) {
      return {};
    }
  },

  saveExerciseImages: (images: Record<string, string>) => {
    try {
      localStorage.setItem(IMAGES_KEY, JSON.stringify(images));
    } catch (e) {
      console.warn("Storage quota exceeded, images might not persist fully.");
    }
  }
};

// Initialize on load
MockDataService.init();
