
import { ExerciseType, ExerciseRecord, User, UserRole, AnalysisResult } from "../types";

// Keys for LocalStorage
const USERS_KEY = 'fitai_users';
const RECORDS_KEY = 'fitai_records';
const CURRENT_USER_KEY = 'fitai_current_session';
const IMAGES_KEY = 'fitai_exercise_images';

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
  assignedExercises: Object.values(ExerciseType) // Todos habilitados
};

// Helper to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const MockDataService = {
  
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
    
    // Na versão mock, a senha não é validada estritamente, permitindo acesso simplificado
    // O usuário 'teste@teste.com' funcionará com a senha 'teste' (ou qualquer outra).
    
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

  createUser: async (name: string, email: string, initialExercises?: ExerciseType[]): Promise<User> => {
    await delay(800);
    const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("Este e-mail já possui cadastro.");
    }

    // If no specific exercises are passed (self-registration), assign ALL exercises by default
    // so the user has content to interact with immediately.
    const defaultExercises = initialExercises || Object.values(ExerciseType);

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

  updateUserExercises: (userId: string, exercises: ExerciseType[]) => {
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

  saveResult: (userId: string, userName: string, exercise: ExerciseType, result: AnalysisResult) => {
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
