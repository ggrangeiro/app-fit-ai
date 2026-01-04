import { DietGoalEntity, TrainingGoalEntity, User, UserRole, AnalysisResult } from "../types";

const API_BASE_URL = "https://testeai-732767853162.us-west1.run.app";

// Helper interno para obter credenciais do solicitante atual
// Retorna objeto com id e role formatado ou lança erro se não logado
const getRequesterCredentials = () => {
    const userStr = localStorage.getItem('fitai_current_session');
    if (!userStr) return null;
    
    try {
        const user = JSON.parse(userStr);
        return {
            id: user.id,
            // Backend espera Role em Uppercase (USER, PERSONAL, ADMIN)
            role: user.role ? String(user.role).toUpperCase() : 'USER'
        };
    } catch (e) {
        return null;
    }
};

// Helper para montar Query Params de Permissão para chamadas genéricas
const getAuthQuery = () => {
  const creds = getRequesterCredentials();
  if (creds) {
      return `?requesterId=${creds.id}&requesterRole=${creds.role}`;
  }
  return '';
};

const getHeaders = () => {
  return {
    "Content-Type": "application/json"
  };
};

export const apiService = {
  // --- AUTH ---
  
  // 1. Login
  // Rota: POST /api/usuarios/login
  // Body: { email, senha }
  login: async (email: string, password: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/api/usuarios/login`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        email: email,
        senha: password
      })
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new Error("Credenciais inválidas.");
      throw new Error("Erro de conexão ao realizar login.");
    }

    const data = await response.json();
    
    // Mapeamento robusto do retorno
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
      avatar: data.avatar,
      assignedExercises: data.assignedExercises || []
    };
  },

  // 2. Cadastrar Novo Usuário/Aluno
  // Rota: POST /api/usuarios/?requesterId=...
  signup: async (name: string, email: string, password: string, creatorId?: string, role: string = 'user') => {
    const query = getAuthQuery();
    const url = `${API_BASE_URL}/api/usuarios/${query}`; 

    const response = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        nome: name,
        name: name,
        email: email,
        senha: password,
        role: role
      })
    });

    if (!response.ok) {
      if (response.status === 409) throw new Error("E-mail já cadastrado.");
      try {
        const err = await response.json();
        if (err.message) throw new Error(err.message);
      } catch(e) {}
      throw new Error("Erro ao criar usuário.");
    }

    return await response.json();
  },

  // --- TREINOS ---
  
  // Salvar Treino
  // Rota: POST /api/treinos/?requesterId=...
  createTraining: async (userId: string | number, content: string, goal: string) => {
    const query = getAuthQuery();
    const url = `${API_BASE_URL}/api/treinos/${query}`;

    const response = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        userId: String(userId),
        goal: goal,
        data: new Date().toISOString().split('T')[0],
        content: content
      })
    });

    if (!response.ok) throw new Error("Erro ao salvar treino.");
    return await response.json();
  },

  // Listar Treinos
  // Rota: GET /api/treinos/{userId}?requesterId=...
  getTrainings: async (userId: string | number) => {
    const query = getAuthQuery();
    const url = `${API_BASE_URL}/api/treinos/${userId}${query}`;

    const response = await fetch(url, { method: "GET", headers: getHeaders() });

    if (!response.ok) return [];
    
    const data = await response.json();
    return Array.isArray(data) ? data : (data.trainings || []);
  },

  deleteTraining: async (userId: string | number, trainingId: number) => {
     const query = getAuthQuery();
     await fetch(`${API_BASE_URL}/api/treinos/${trainingId}${query}`, { method: 'DELETE' });
     return true;
  },

  // --- DIETAS ---

  // Salvar Dieta
  // Rota: POST /api/dietas/?requesterId=...
  createDiet: async (userId: string | number, content: string, goal: string) => {
    const query = getAuthQuery();
    const url = `${API_BASE_URL}/api/dietas/${query}`;

    const goalMap: Record<string, DietGoalEntity> = {
        'emagrecer': DietGoalEntity.WEIGHT_LOSS,
        'ganhar_massa': DietGoalEntity.HYPERTROPHY,
        'manutencao': DietGoalEntity.MAINTENANCE,
        'definicao': DietGoalEntity.DEFINITION
    };
    const backendGoal = goalMap[goal] || DietGoalEntity.WEIGHT_LOSS;

    const response = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        userId: String(userId),
        goal: backendGoal,
        content: content,
        data: new Date().toISOString().split('T')[0]
      })
    });

    if (!response.ok) throw new Error("Erro ao salvar dieta.");
    return await response.json();
  },

  // Buscar Dieta
  // Rota: GET /api/dietas/{userId}?requesterId=...
  getDiets: async (userId: string | number) => {
    const query = getAuthQuery();
    const url = `${API_BASE_URL}/api/dietas/${userId}${query}`;

    const response = await fetch(url, { method: "GET", headers: getHeaders() });
    
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : (data.diets || []);
  },

  deleteDiet: async (userId: string | number, dietId: number) => {
     const query = getAuthQuery();
     await fetch(`${API_BASE_URL}/api/dietas/${dietId}${query}`, { method: 'DELETE' });
     return true;
  },

  // --- HISTÓRICO ---

  // Salvar Histórico (Evolução)
  // Rota: POST /api/historico/?requesterId=...
  saveHistory: async (
    payload: { userId: string | number; userName: string; exercise: string; timestamp: number; result: AnalysisResult },
    requesterId?: string | number,
    requesterRole?: string
  ) => {
    const query = getAuthQuery();
    const url = `${API_BASE_URL}/api/historico/${query}`;

    const backendPayload = {
        userId: String(payload.userId),
        exercise: payload.exercise,
        weight: 0,
        reps: payload.result.repetitions || 0,
        timestamp: payload.timestamp,
        result: payload.result 
    };

    const response = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(backendPayload)
    });

    if (!response.ok) throw new Error("Erro ao salvar histórico.");
    return await response.json();
  },

  // Listar Histórico
  // Rota: GET /api/historico/{userId}?requesterId=...
  getUserHistory: async (userId: string | number, exercise?: string) => {
    let query = getAuthQuery();
    if (exercise) {
        const encodedEx = encodeURIComponent(exercise);
        query += query ? `&exercise=${encodedEx}` : `?exercise=${encodedEx}`;
    }
    
    const url = `${API_BASE_URL}/api/historico/${userId}${query}`;
    const response = await fetch(url, { method: "GET", headers: getHeaders() });
    
    if (!response.ok) return [];
    return await response.json();
  },

  // --- EXERCÍCIOS (CORREÇÃO DE MULTI-TENANCY) ---

  // Função unificada e robusta para buscar exercícios
  // Aplica a regra: /api/usuarios/exercises/{targetId}?requesterId={meuId}&requesterRole={meuRole}
  getAllExercises: async (targetUserId?: string | number) => {
    const requester = getRequesterCredentials();
    if (!requester) return []; // Não logado

    // Define quem é o ALVO da busca.
    // Se targetUserId for passado, usa ele. Se não, usa o ID do próprio solicitante.
    let targetId = targetUserId || requester.id;

    // Constrói a Query String OBRIGATÓRIA
    const queryParams = `?requesterId=${requester.id}&requesterRole=${requester.role}`;

    try {
        // TENTATIVA 1: Buscar exercícios do Alvo Específico
        // Ex: Aluno (27) buscando Aluno (27) -> Sucesso
        // Ex: Personal (25) buscando Aluno (27) -> Sucesso
        // Ex: Personal (25) buscando Personal (25) -> Pode dar 404/400 se ele não tiver exercícios próprios
        const url = `${API_BASE_URL}/api/usuarios/exercises/${targetId}${queryParams}`;
        const response = await fetch(url, { method: "GET", headers: getHeaders() });

        if (response.ok) return await response.json();

        // TENTATIVA 2 (FALLBACK): Se deu erro (400/404) E o solicitante é ADMIN ou PERSONAL
        // Significa que eles estão tentando ver o "Catálogo Geral" mas tentaram usar o próprio ID.
        // O backend provavelmente guarda o catálogo no ID 1 ou exige uma rota específica.
        // Vamos tentar buscar do ID 1 mantendo as credenciais do solicitante.
        if ((response.status === 400 || response.status === 404) && String(targetId) !== "1") {
             if (requester.role === 'ADMIN' || requester.role === 'PERSONAL') {
                 const fallbackUrl = `${API_BASE_URL}/api/usuarios/exercises/1${queryParams}`;
                 const fallbackResponse = await fetch(fallbackUrl, { method: "GET", headers: getHeaders() });
                 if(fallbackResponse.ok) return await fallbackResponse.json();
             }
        }
    } catch(e) {
        console.error("Erro ao buscar exercícios:", e);
    }
    return [];
  },
  
  // Rota específica para garantir que ao ver um aluno, passamos os dados corretamente
  getUserExercises: async (targetUserId: string | number) => {
    const requester = getRequesterCredentials();
    if (!requester) return [];

    const queryParams = `?requesterId=${requester.id}&requesterRole=${requester.role}`;
    const url = `${API_BASE_URL}/api/usuarios/exercises/${targetUserId}${queryParams}`;

    try {
        const response = await fetch(url, { method: "GET", headers: getHeaders() });
        if(response.ok) return await response.json();
    } catch(e) {}
    return [];
  },

  assignExercise: async (userId: string | number, exerciseId: number) => {
    const query = getAuthQuery();
    const response = await fetch(`${API_BASE_URL}/api/exercises/assign${query}`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ userId, exerciseId })
    });
    if(!response.ok) throw new Error("Falha ao atribuir");
    return await response.json();
  },

  // Listar Usuários (Para Admin/Personal Dashboard)
  getUsers: async (requesterId?: string | number, requesterRole?: string) => {
    const query = getAuthQuery();
    const url = `${API_BASE_URL}/api/usuarios/${query}`;
    
    const response = await fetch(url, { method: "GET", headers: getHeaders() });
    
    if (!response.ok) return [];
    const data = await response.json();
    
    if (Array.isArray(data)) return data;
    if (data.students) return data.students;
    return [];
  }
};