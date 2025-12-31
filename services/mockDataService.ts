
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

// --- HELPER: MAP BACKEND NAMES TO INTERNAL IDS ---
// Isso garante que "Agachamento (Squat)" vire "SQUAT" para carregar a imagem e as regras corretas.
const mapBackendToInternalId = (backendName: string): string => {
  const lower = backendName.toLowerCase();
  
  if (lower.includes('squat') || lower.includes('agachamento')) return 'SQUAT';
  if (lower.includes('push-up') || lower.includes('flexão')) return 'PUSHUP';
  if (lower.includes('lunge') || lower.includes('afundo')) return 'LUNGE';
  if (lower.includes('burpee')) return 'BURPEE';
  if (lower.includes('plank') || lower.includes('prancha')) return 'PLANK';
  if (lower.includes('jumping') || lower.includes('polichinelo')) return 'JUMPING_JACK';
  if (lower.includes('mountain') || lower.includes('escalador')) return 'MOUNTAIN_CLIMBER';
  if (lower.includes('crunch') || lower.includes('abdominal')) return 'CRUNCH';
  if (lower.includes('pull-up') || lower.includes('barra')) return 'PULLUP';
  if (lower.includes('bridge') || lower.includes('pélvica')) return 'BRIDGE';
  if (lower.includes('búlgaro') || lower.includes('bulgarian')) return 'BULGARIAN_SQUAT';
  if (lower.includes('deadlift') || lower.includes('terra')) return 'DEADLIFT';
  if (lower.includes('dips') || lower.includes('tríceps')) return 'TRICEP_DIP';
  if (lower.includes('bicep') || lower.includes('rosca')) return 'BICEP_CURL';
  if (lower.includes('cross over') || lower.includes('crucifixo')) return 'CABLE_CROSSOVER';
  if (lower.includes('postura') || lower.includes('biofeedback')) return 'POSTURE_ANALYSIS';
  if (lower.includes('biotipo') || lower.includes('gordura') || lower.includes('corporal')) return 'BODY_COMPOSITION';
  
  // Fallback: Retorna o próprio nome limpo como ID se não reconhecer
  return backendName.toUpperCase().replace(/\s+/g, '_');
};

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
                   // Aplica o mesmo mapeamento caso o admin use essa rota
                   return data.map((item: any) => {
                      const internalId = mapBackendToInternalId(item.exercicio || item.name);
                      return {
                          id: internalId,
                          name: item.exercicio || item.name,
                          category: (internalId === 'POSTURE_ANALYSIS' || internalId === 'BODY_COMPOSITION') ? 'SPECIAL' : 'STANDARD'
                      };
                  });
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
        
        if (Array.isArray(data)) {
            console.log("Exercícios RAW do backend:", data);
            
            // MAP TRANSFORM: Backend Format -> Frontend ExerciseDTO
            const mappedExercises: ExerciseDTO[] = data.map((item: any) => {
                // Backend retorna: { id: 4, exercicio: "Agachamento (Squat)" }
                // Frontend precisa: { id: "SQUAT", name: "Agachamento (Squat)" }
                
                const internalId = mapBackendToInternalId(item.exercicio);
                
                return {
                    id: internalId, // Usamos o ID interno para mapear as imagens
                    name: item.exercicio, // Exibimos o nome que vem do banco
                    category: (internalId === 'POSTURE_ANALYSIS' || internalId === 'BODY_COMPOSITION') ? 'SPECIAL' : 'STANDARD'
                };
            });
            
            return mappedExercises;
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

  deleteRecord: async (userId: string, recordId: string): Promise<boolean> => {
    const URL = `https://testeai-732767853162.us-west1.run.app/api/historico/${userId}/${recordId}`;
    
    try {
        console.log("Removendo registro:", URL);
        const response = await fetch(URL, { method: 'DELETE' });
        
        // Verifica se a requisição HTTP foi bem sucedida
        if (response.ok) {
            try {
                const data = await response.json();
                
                // Validação solicitada: verifica o campo success
                if (data.success || data.message) {
                    // Remover do LocalStorage (Cache local para atualização imediata)
                    const records: ExerciseRecord[] = JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]');
                    const updatedRecords = records.filter(r => r.id !== recordId);
                    localStorage.setItem(RECORDS_KEY, JSON.stringify(updatedRecords));
                    return true;
                }
            } catch (jsonError) {
                // Fallback: se não retornar JSON mas foi 200 OK (algumas APIs retornam 204 No Content)
                // Assumimos sucesso e limpamos localmente
                console.warn("Resposta sem JSON, assumindo sucesso pelo status 200/204");
                const records: ExerciseRecord[] = JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]');
                const updatedRecords = records.filter(r => r.id !== recordId);
                localStorage.setItem(RECORDS_KEY, JSON.stringify(updatedRecords));
                return true;
            }
        }
        return false;
    } catch (e) {
        console.error("Erro ao deletar registro:", e);
        return false;
    }
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
