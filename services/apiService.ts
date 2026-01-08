import { DietGoalEntity, User, UserRole, AnalysisResult } from "../types";
import { CapacitorHttp, HttpResponse } from '@capacitor/core';

const API_BASE_URL = "https://testeai-732767853162.us-west1.run.app";

// --- HELPERS PARA CREDENCIAIS E AUTH ---

const getRequesterCredentials = () => {
    const userStr = localStorage.getItem('fitai_current_session');
    if (!userStr) return null;

    try {
        const user = JSON.parse(userStr);
        return {
            id: user.id,
            role: user.role ? String(user.role).toUpperCase() : 'USER'
        };
    } catch (e) {
        return null;
    }
};

const getAuthQueryParams = () => {
  const creds = getRequesterCredentials();
  if (creds) {
      return { requesterId: String(creds.id), requesterRole: creds.role };
  }
  return {};
};

// --- MOTOR DE REQUISIÇÃO NATIVO (BYPASS CORS) ---

const nativeFetch = async (options: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: any,
    params?: any
}) => {
    const response: HttpResponse = await CapacitorHttp.request({
        method: options.method,
        url: options.url,
        headers: { "Content-Type": "application/json" },
        data: options.data,
        params: { ...options.params }
    });

    if (response.status >= 400) {
        if (response.status === 402) throw new Error("CREDITS_EXHAUSTED");
        if (response.status === 401 || response.status === 403) throw new Error("Acesso negado.");
        if (response.status === 409) throw new Error("E-mail já cadastrado.");
        throw new Error(response.data?.message || `Erro no servidor (${response.status})`);
    }

    return response.data;
};

// --- SERVIÇO EXPORTADO ---

export const apiService = {

  // --- AUTH ---
  login: async (email: string, password: string): Promise<User> => {
    const data = await nativeFetch({
        method: 'POST',
        url: `${API_BASE_URL}/api/usuarios/login`,
        data: { email: email, senha: password }
    });

    const userId = data.id ? String(data.id) : "0";
    let role: UserRole = 'user';
    if (data.role) {
        const r = String(data.role).toLowerCase();
        if (r === 'admin') role = 'admin';
        else if (r === 'personal') role = 'personal';
    }

    return {
      id: userId,
      name: data.name || data.nome || "Usuário",
      email: data.email,
      role: role,
      credits: data.credits || 0,
      avatar: data.avatar,
      assignedExercises: data.assignedExercises || []
    };
  },

  signup: async (name: string, email: string, password: string, _creatorId?: string, role: string = 'user') => {
    return await nativeFetch({
        method: 'POST',
        url: `${API_BASE_URL}/api/usuarios/`,
        params: getAuthQueryParams(),
        data: { nome: name, name, email, senha: password, role }
    });
  },

  // --- CRÉDITOS ---
  consumeCredit: async (targetUserId: string | number) => {
      const response = await nativeFetch({
          method: 'POST',
          url: `${API_BASE_URL}/api/usuarios/consume-credit/${targetUserId}`,
          params: getAuthQueryParams()
      });
      return response; // Espera-se { success: true, novoSaldo: number, message: string }
  },

  addCredits: async (targetUserId: string | number, amount: number) => {
      return await nativeFetch({
          method: 'POST',
          url: `${API_BASE_URL}/api/usuarios/admin/add-credits/${targetUserId}`,
          params: getAuthQueryParams(),
          data: { amount }
      });
  },

  // --- EXERCÍCIOS (CORRIGIDO) ---

  // Função essencial para o MockDataService e Listagem de Alunos
  getUserExercises: async (targetUserId: string | number) => {
    const data = await nativeFetch({
        method: 'GET',
        url: `${API_BASE_URL}/api/usuarios/exercises/${targetUserId}`,
        params: getAuthQueryParams()
    });
    
    // Tratamento robusto de resposta (Array ou Wrapper)
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.exercises)) return data.exercises;
    return [];
  },

  getAllExercises: async (targetUserId?: string | number) => {
    const requester = getRequesterCredentials();
    if (!requester) return [];

    const targetId = targetUserId || requester.id;
    const params = getAuthQueryParams();

    try {
        const data = await nativeFetch({
            method: 'GET',
            url: `${API_BASE_URL}/api/usuarios/exercises/${targetId}`,
            params
        });
        
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.exercises)) return data.exercises;
        return [];
    } catch(e) {
        if (String(targetId) !== "1" && (requester.role === 'ADMIN' || requester.role === 'PERSONAL')) {
            const data = await nativeFetch({
                method: 'GET',
                url: `${API_BASE_URL}/api/usuarios/exercises/1`,
                params
            });
            if (Array.isArray(data)) return data;
            return [];
        }
    }
    return [];
  },

  assignExercise: async (userId: string | number, exerciseId: number) => {
    return await nativeFetch({
        method: 'POST',
        url: `${API_BASE_URL}/api/exercises/assign`,
        params: getAuthQueryParams(),
        data: { userId, exerciseId }
    });
  },

  // --- TREINOS ---
  createTraining: async (userId: string | number, content: string, goal: string) => {
    return await nativeFetch({
        method: 'POST',
        url: `${API_BASE_URL}/api/treinos/`,
        params: getAuthQueryParams(),
        data: {
            userId: String(userId),
            goal: goal,
            data: new Date().toISOString().split('T')[0],
            content: content
        }
    });
  },

  getTrainings: async (userId: string | number) => {
    const data = await nativeFetch({
        method: 'GET',
        url: `${API_BASE_URL}/api/treinos/${userId}`,
        params: getAuthQueryParams()
    });
    return Array.isArray(data) ? data : (data.trainings || []);
  },

  deleteTraining: async (_userId: string | number, trainingId: number) => {
     await nativeFetch({
         method: 'DELETE',
         url: `${API_BASE_URL}/api/treinos/${trainingId}`,
         params: getAuthQueryParams()
     });
     return true;
  },

  // --- DIETAS ---
  createDiet: async (userId: string | number, content: string, goal: string) => {
    const goalMap: Record<string, DietGoalEntity> = {
        'emagrecer': DietGoalEntity.WEIGHT_LOSS,
        'ganhar_massa': DietGoalEntity.HYPERTROPHY,
        'manutencao': DietGoalEntity.MAINTENANCE,
        'definicao': DietGoalEntity.DEFINITION
    };

    return await nativeFetch({
        method: 'POST',
        url: `${API_BASE_URL}/api/dietas/`,
        params: getAuthQueryParams(),
        data: {
            userId: String(userId),
            goal: goalMap[goal] || DietGoalEntity.WEIGHT_LOSS,
            content: content,
            data: new Date().toISOString().split('T')[0]
        }
    });
  },

  getDiets: async (userId: string | number) => {
    const data = await nativeFetch({
        method: 'GET',
        url: `${API_BASE_URL}/api/dietas/${userId}`,
        params: getAuthQueryParams()
    });
    return Array.isArray(data) ? data : (data.diets || []);
  },

  deleteDiet: async (_userId: string | number, dietId: number) => {
     await nativeFetch({
         method: 'DELETE',
         url: `${API_BASE_URL}/api/dietas/${dietId}`,
         params: getAuthQueryParams()
     });
     return true;
  },

  // --- HISTÓRICO ---
  saveHistory: async (payload: { userId: string | number; exercise: string; timestamp: number; result: AnalysisResult }, requesterId?: string | number, requesterRole?: string) => {
    const params: any = getAuthQueryParams();
    // Se o requesterId for passado explicitamente (caso do Personal salvando pro aluno), usa ele
    if(requesterId) params.requesterId = requesterId;
    if(requesterRole) params.requesterRole = requesterRole;

    return await nativeFetch({
        method: 'POST',
        url: `${API_BASE_URL}/api/historico/`,
        params: params,
        data: {
            userId: String(payload.userId),
            exercise: payload.exercise,
            weight: 0,
            reps: payload.result.repetitions || 0,
            timestamp: payload.timestamp,
            result: payload.result
        }
    });
  },

  getUserHistory: async (userId: string | number, exercise?: string) => {
    const params: any = getAuthQueryParams();
    if (exercise) params.exercise = exercise;

    return await nativeFetch({
        method: 'GET',
        url: `${API_BASE_URL}/api/historico/${userId}`,
        params
    });
  },

  // --- ADMIN / DASHBOARD ---
  getUsers: async (requesterId: string, requesterRole: string) => {
    const params = { requesterId, requesterRole };
    const data = await nativeFetch({
        method: 'GET',
        url: `${API_BASE_URL}/api/usuarios/`,
        params
    });

    if (Array.isArray(data)) return data;
    return data.students || [];
  }
};