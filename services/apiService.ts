import { DietGoalEntity, TrainingGoalEntity, User, UserRole, ExerciseDTO, AnalysisResult } from "../types";

// --- CONFIGURATION SWITCH ---
const USE_V2_BACKEND = true; // Set to true to use the new backend, false for the old one.

const API_V1_URL = "https://testeai-732767853162.us-west1.run.app/api";
const API_V2_URL = "https://us-west1-gen-lang-client-0004040174.cloudfunctions.net/fit-ai-back";

// Helper para headers com token (Apenas V2 usa token Bearer)
const getHeaders = () => {
  const userStr = localStorage.getItem('fitai_current_session');
  let token = '';
  if (userStr) {
    const user = JSON.parse(userStr);
    token = user.token || '';
  }
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
};

export const apiService = {
  // --- AUTH ---
  login: async (email: string, password: string): Promise<User> => {
    if (!USE_V2_BACKEND) {
        // --- V1 LOGIN ---
        const response = await fetch(`${API_V1_URL}/usuarios/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, senha: password })
        });

        if (response.status === 401 || response.status === 403) throw new Error("Credenciais inválidas.");
        if (!response.ok) throw new Error("Erro de conexão ao tentar realizar login (V1).");

        const userData = await response.json();
        
        // Mocking Personal Role logic based on specific email if backend doesn't support yet
        let role: UserRole = userData.role || 'user';
        if (userData.email.includes('personal')) role = 'personal';

        return {
            id: userData.id ? String(userData.id) : "0",
            name: userData.nome || userData.name || "Usuário",
            email: userData.email,
            role: role,
            avatar: userData.avatar,
            assignedExercises: userData.assignedExercises || []
        };
    } else {
        // --- V2 LOGIN ---
        const response = await fetch(`${API_V2_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: email,
            password: password
          })
        });

        if (!response.ok) {
            if(response.status === 403 || response.status === 401) throw new Error("Credenciais inválidas.");
            throw new Error("Erro no servidor de login.");
        }

        const data = await response.json();
        
        let userId = "0";
        try {
            if(data.access_token) {
                const base64Url = data.access_token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                const decoded = JSON.parse(jsonPayload);
                if (!isNaN(Number(data.username))) {
                    userId = String(data.username);
                } else if (decoded.sub && !isNaN(Number(decoded.sub))) {
                     userId = decoded.sub; 
                }
            }
        } catch(e) {
            console.error("Erro ao decodificar token", e);
        }
        
        if (userId === "0" || isNaN(Number(userId))) userId = "1"; 

        // Role mapping logic
        let role: UserRole = 'user';
        if (data.roles) {
            if (data.roles.includes("ADMIN")) role = 'admin';
            else if (data.roles.includes("PERSONAL")) role = 'personal';
        }

        return {
          id: userId,
          name: email.split('@')[0], 
          email: data.username || email,
          role: role,
          token: data.access_token,
          refreshToken: data.refresh_token,
          assignedExercises: [] 
        };
    }
  },

  // Atualizado para usar Query Params no V2 conforme documentação
  signup: async (name: string, email: string, password: string, creatorId?: string) => {
    if (!USE_V2_BACKEND) {
        // --- V1 SIGNUP ---
        const payload: any = { nome: name, email, senha: password };
        if (creatorId) payload.personalId = creatorId;

        const response = await fetch(`${API_V1_URL}/usuarios`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            if (response.status === 409) throw new Error("Este e-mail já está em uso.");
            try { const err = await response.json(); if(err.message) throw new Error(err.message); } catch(e){}
            throw new Error("Erro ao criar conta (V1).");
        }
        return await response.json();
    } else {
        // --- V2 SIGNUP ---
        // Documentação: POST /api/usuarios?requesterId=10&requesterRole=PERSONAL
        // Body: { name, email, password } (Sem personalId no body)
        
        let url = `${API_V2_URL}/api/usuarios`;
        if (creatorId) {
            url += `?requesterId=${creatorId}&requesterRole=PERSONAL`;
        }

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password })
        });

        if (!response.ok) {
            if (response.status === 409) throw new Error("Este e-mail já está em uso.");
            // Tenta pegar mensagem de erro do backend
            try {
                const errData = await response.json();
                if (errData.message) throw new Error(errData.message);
            } catch(e) {}
            throw new Error("Erro ao criar conta.");
        }
        return await response.json();
    }
  },

  // --- HISTÓRICO / AVALIAÇÕES ---
  saveHistory: async (
    payload: { userId: string | number; userName: string; exercise: string; timestamp: number; result: AnalysisResult },
    requesterId?: string | number,
    requesterRole?: string
  ) => {
      if (!USE_V2_BACKEND) {
          // --- V1 SAVE HISTORY ---
          const response = await fetch(`${API_V1_URL}/historico`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
          });
          if (!response.ok) throw new Error("Erro ao salvar histórico (V1).");
          return await response.json();
      } else {
          // --- V2 SAVE HISTORY ---
          // Documentação: POST /api/historico?requesterId=12&requesterRole=PERSONAL
          // Necessário para validar permissão de salvar para terceiros
          let url = `${API_V2_URL}/api/historico`;
          
          if (requesterId && requesterRole === 'personal') {
              url += `?requesterId=${requesterId}&requesterRole=PERSONAL`;
          }

          const response = await fetch(url, {
              method: "POST",
              headers: getHeaders(),
              body: JSON.stringify(payload)
          });

          if (!response.ok) {
              if (response.status === 403) throw new Error("Você não tem permissão para salvar avaliação para este aluno.");
              throw new Error("Erro ao salvar avaliação.");
          }
          return await response.json();
      }
  },

  // --- DIETAS ---
  createDiet: async (userId: string | number, content: string, goal: string) => {
    if (!USE_V2_BACKEND) {
        // --- V1 CREATE DIET ---
        const response = await fetch(`${API_V1_URL}/dietas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, content, goal })
        });
        if (!response.ok) throw new Error("Erro ao salvar dieta V1");
        return await response.json();
    } else {
        // --- V2 CREATE DIET ---
        const goalMap: Record<string, DietGoalEntity> = {
            'emagrecer': DietGoalEntity.WEIGHT_LOSS,
            'ganhar_massa': DietGoalEntity.HYPERTROPHY,
            'manutencao': DietGoalEntity.MAINTENANCE,
            'definicao': DietGoalEntity.DEFINITION
        };
        const backendGoal = goalMap[goal] || DietGoalEntity.WEIGHT_LOSS;

        const response = await fetch(`${API_V2_URL}/diet`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                userId: Number(userId),
                content,
                goal: backendGoal
            })
        });
        if (!response.ok) throw new Error("Erro ao salvar dieta V2");
        return await response.json();
    }
  },

  getDiets: async (userId: string | number) => {
      if (!USE_V2_BACKEND) {
          // --- V1 GET DIETS ---
          const response = await fetch(`${API_V1_URL}/dietas/${userId}`);
          if (!response.ok) return [];
          return await response.json();
      } else {
          // --- V2 GET DIETS ---
          const response = await fetch(`${API_V2_URL}/diet/${userId}`, {
              method: "GET",
              headers: getHeaders()
          });
          if (!response.ok) return [];
          const data = await response.json();
          return data.diets || [];
      }
  },

  deleteDiet: async (userId: string | number, dietId: number) => {
      if (!USE_V2_BACKEND) {
          // --- V1 DELETE DIET ---
          const response = await fetch(`${API_V1_URL}/dietas/${dietId}`, { method: "DELETE" });
          return response.ok;
      } else {
          // --- V2 DELETE DIET ---
          const response = await fetch(`${API_V2_URL}/diet`, {
              method: "DELETE",
              headers: getHeaders(),
              body: JSON.stringify({ userId: Number(userId), id: dietId })
          });
          return response.ok;
      }
  },

  // --- TREINOS ---
  createTraining: async (userId: string | number, content: string, goal: string) => {
    if (!USE_V2_BACKEND) {
        // --- V1 CREATE TRAINING ---
        const response = await fetch(`${API_V1_URL}/treinos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, content, goal })
        });
        if (!response.ok) throw new Error("Erro ao salvar treino V1");
        return await response.json();
    } else {
        // --- V2 CREATE TRAINING ---
        const goalMap: Record<string, TrainingGoalEntity> = {
            'emagrecimento': TrainingGoalEntity.WEIGHT_LOSS,
            'hipertrofia': TrainingGoalEntity.HYPERTROPHY,
            'forca': TrainingGoalEntity.PURE_STRENGTH,
            'definicao': TrainingGoalEntity.DEFINITION
        };
        const backendGoal = goalMap[goal] || TrainingGoalEntity.HYPERTROPHY;

        const response = await fetch(`${API_V2_URL}/training`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                userId: Number(userId),
                content,
                goal: backendGoal
            })
        });
        if (!response.ok) throw new Error("Erro ao salvar treino V2");
        return await response.json();
    }
  },

  getTrainings: async (userId: string | number) => {
      if (!USE_V2_BACKEND) {
          // --- V1 GET TRAININGS ---
          const response = await fetch(`${API_V1_URL}/treinos/${userId}`);
          if (!response.ok) return [];
          return await response.json();
      } else {
          // --- V2 GET TRAININGS ---
          const response = await fetch(`${API_V2_URL}/training/${userId}`, {
              method: "GET",
              headers: getHeaders()
          });
          if (!response.ok) return [];
          const data = await response.json();
          return data.trainings || [];
      }
  },

  deleteTraining: async (userId: string | number, trainingId: number) => {
      if (!USE_V2_BACKEND) {
          // --- V1 DELETE TRAINING ---
          const response = await fetch(`${API_V1_URL}/treinos/${trainingId}`, { method: "DELETE" });
          return response.ok;
      } else {
          // --- V2 DELETE TRAINING ---
          const response = await fetch(`${API_V2_URL}/training`, {
              method: "DELETE",
              headers: getHeaders(),
              body: JSON.stringify({ userId: Number(userId), id: trainingId })
          });
          return response.ok;
      }
  },

  // --- EXERCÍCIOS ---
  getAllExercises: async () => {
      if (!USE_V2_BACKEND) {
          // --- V1 GET ALL EXERCISES ---
          const response = await fetch(`${API_V1_URL}/usuarios/exercises`);
          if (!response.ok) return [];
          const data = await response.json();
          return data.map((e:any) => ({ id: e.id, name: e.exercicio || e.name }));
      } else {
          // --- V2 GET ALL EXERCISES ---
          const response = await fetch(`${API_V2_URL}/exercises`, {
              method: "GET",
              headers: getHeaders()
          });
          if (!response.ok) return [];
          const data = await response.json();
          return data.exercises || [];
      }
  },

  getUserExercises: async (userId: string | number) => {
      if (!USE_V2_BACKEND) {
          // --- V1 GET USER EXERCISES ---
          const response = await fetch(`${API_V1_URL}/usuarios/${userId}/exercicios`);
          if (!response.ok) return [];
          const data = await response.json();
          return data.map((e:any) => ({ id: e.id, name: e.exercicio || e.name }));
      } else {
          // --- V2 GET USER EXERCISES ---
          const response = await fetch(`${API_V2_URL}/exercises/${userId}`, {
              method: "GET",
              headers: getHeaders()
          });
          if (!response.ok) return [];
          const data = await response.json();
          return data.exercises || []; 
      }
  },

  assignExercise: async (userId: string | number, exerciseId: number) => {
      if (!USE_V2_BACKEND) {
          // --- V1 ASSIGN ---
          throw new Error("V1 Backend requer update completo do usuário.");
      } else {
          // --- V2 ASSIGN ---
          const response = await fetch(`${API_V2_URL}/exercises/assign`, {
              method: "POST",
              headers: getHeaders(),
              body: JSON.stringify({
                  userId: Number(userId),
                  exerciseId: exerciseId
              })
          });
          if (!response.ok) throw new Error("Erro ao atribuir exercício");
          return await response.json();
      }
  },
  
  // --- USUÁRIOS (Unified with Query Params) ---
  // Substitui o antigo getStudents para ser genérico e atender Admin e Personal
  getUsers: async (requesterId?: string | number, requesterRole?: string) => {
      if (!USE_V2_BACKEND) {
          // --- V1 GET USERS ---
          const response = await fetch(`${API_V1_URL}/usuarios`);
          if (!response.ok) return [];
          return await response.json();
      } else {
          // --- V2 GET USERS ---
          // Documentação: GET /api/usuarios?requesterId=10&requesterRole=PERSONAL
          let url = `${API_V2_URL}/api/usuarios`;
          
          if (requesterId && requesterRole === 'personal') {
              url += `?requesterId=${requesterId}&requesterRole=PERSONAL`;
          }

          const response = await fetch(url, {
              method: "GET",
              headers: getHeaders()
          });
          
          if (!response.ok) {
              if (response.status === 403) throw new Error("Acesso negado.");
              return [];
          }
          
          // O retorno deve ser uma lista direta de usuários
          const data = await response.json();
          return Array.isArray(data) ? data : (data.students || []);
      }
  }
};
