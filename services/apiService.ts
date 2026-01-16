import { CapacitorHttp, HttpResponse } from '@capacitor/core';
import { DietGoalEntity, User, UserRole, AnalysisResult } from "../types";
import { secureStorage } from "../utils/secureStorage";


const API_BASE_URL = "https://app-back-ia-732767853162.southamerica-east1.run.app";

// --- HELPERS PARA CREDENCIAIS E AUTH ---

const getRequesterCredentials = () => {
    const user = secureStorage.getItem<any>('fitai_current_session');
    if (!user) return null;

    return {
        id: user.id,
        role: user.role ? String(user.role).toUpperCase() : 'USER'
    };
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
            credits: data.usage?.credits ?? data.credits ?? 0,
            avatar: data.avatar,
            assignedExercises: data.assignedExercises || [],
            phone: data.telefone || undefined,
            plan: data.plan,
            usage: data.usage
        };
    },

    getMe: async (userId: string | number): Promise<User> => {
        const data = await nativeFetch({
            method: 'GET',
            url: `${API_BASE_URL}/api/me`,
            params: { userId: String(userId) }
        });

        const id = data.id ? String(data.id) : String(userId);
        let role: UserRole = 'user';
        if (data.role) {
            const r = String(data.role).toLowerCase();
            if (r === 'admin') role = 'admin';
            else if (r === 'personal') role = 'personal';
        }

        return {
            id,
            name: data.name || data.nome || "Usuário",
            email: data.email,
            role: role,
            credits: data.usage?.credits ?? data.credits ?? 0,
            avatar: data.avatar,
            assignedExercises: data.assignedExercises || [],
            phone: data.telefone || undefined,
            plan: data.plan,
            usage: data.usage
        };
    },

    signup: async (name: string, email: string, password: string, phone: string, _creatorId?: string, role: string = 'user') => {
        return await nativeFetch({
            method: 'POST',
            url: `${API_BASE_URL}/api/usuarios/`,
            params: getAuthQueryParams(),
            data: { nome: name, name, email, senha: password, telefone: phone, role }
        });
    },

    // --- CRÉDITOS ---
    // --- CRÉDITOS ---
    consumeCredit: async (targetUserId: string | number, reason: 'ANALISE' | 'TREINO' | 'DIETA', analysisType?: string) => {
        const params: any = getAuthQueryParams();
        params.reason = reason;
        if (analysisType) params.analysisType = analysisType;

        const response = await nativeFetch({
            method: 'POST',
            url: `${API_BASE_URL}/api/usuarios/consume-credit/${targetUserId}`,
            params: params
        });
        return response; // Espera-se { success: true, novoSaldo: number, message: string }
    },

    getCreditHistory: async (userId: string | number) => {
        const response = await nativeFetch({
            method: 'GET',
            url: `${API_BASE_URL}/api/usuarios/credit-history/${userId}`,
            params: getAuthQueryParams()
        });
        return Array.isArray(response) ? response : [];
    },

    addCredits: async (targetUserId: string | number, amount: number) => {
        return await nativeFetch({
            method: 'POST',
            url: `${API_BASE_URL}/api/usuarios/admin/add-credits/${targetUserId}`,
            params: getAuthQueryParams(),
            data: { amount }
        });
    },

    purchaseCredits: async (userId: string | number, amount: number) => {
        return await nativeFetch({
            method: 'POST',
            url: `${API_BASE_URL}/api/credits/purchase`,
            params: { userId: String(userId) },
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
        } catch (e) {
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

    createTrainingV2: async (userId: string | number, daysData: string, goal: string) => {
        return await nativeFetch({
            method: 'POST',
            url: `${API_BASE_URL}/api/treinos/v2`,
            params: getAuthQueryParams(),
            data: {
                userId: String(userId),
                goal: goal,
                data: new Date().toISOString().split('T')[0],
                daysData: daysData // JSON string containing adherence to contract
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

    createDietV2: async (userId: string | number, daysData: string, goal: string) => {
        const goalMap: Record<string, DietGoalEntity> = {
            'emagrecer': DietGoalEntity.WEIGHT_LOSS,
            'ganhar_massa': DietGoalEntity.HYPERTROPHY,
            'manutencao': DietGoalEntity.MAINTENANCE,
            'definicao': DietGoalEntity.DEFINITION
        };

        return await nativeFetch({
            method: 'POST',
            url: `${API_BASE_URL}/api/dietas/v2`,
            params: getAuthQueryParams(),
            data: {
                userId: String(userId),
                goal: goalMap[goal] || DietGoalEntity.WEIGHT_LOSS,
                data: new Date().toISOString().split('T')[0],
                daysData: daysData // JSON string
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
        if (requesterId) params.requesterId = requesterId;
        if (requesterRole) params.requesterRole = requesterRole;

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
    },

    // --- CHECK-INS ---
    createCheckIn: async (userId: string | number, trainingId: number, data: string, comment?: string) => {
        return await nativeFetch({
            method: 'POST',
            url: `${API_BASE_URL}/api/checkins/`,
            params: getAuthQueryParams(),
            data: {
                userId: String(userId),
                trainingId,
                data,
                comment
            }
        });
    },

    getCheckIns: async (userId: string | number) => {
        return await nativeFetch({
            method: 'GET',
            url: `${API_BASE_URL}/api/checkins/${userId}`,
            params: getAuthQueryParams()
        });
    },

    // --- PASSWORD MANAGEMENT ---
    changePassword: async (userId: string | number, senhaAtual: string, novaSenha: string) => {
        return await nativeFetch({
            method: 'POST',
            url: `${API_BASE_URL}/api/usuarios/change-password`,
            params: getAuthQueryParams(),
            data: { userId, senhaAtual, novaSenha }
        });
    },

    forgotPassword: async (email: string) => {
        return await nativeFetch({
            method: 'POST',
            url: `${API_BASE_URL}/api/usuarios/forgot-password`,
            data: { email }
        });
    },

    resetPassword: async (token: string, novaSenha: string) => {
        return await nativeFetch({
            method: 'POST',
            url: `${API_BASE_URL}/api/usuarios/reset-password`,
            data: { token, novaSenha }
        });
    },

    adminResetPassword: async (targetUserId: string | number, novaSenha: string) => {
        return await nativeFetch({
            method: 'POST',
            url: `${API_BASE_URL}/api/usuarios/admin/reset-password/${targetUserId}`,
            params: getAuthQueryParams(),
            data: { novaSenha }
        });
    },

    deleteUser: async (userId: string | number) => {
        return await nativeFetch({
            method: 'DELETE',
            url: `${API_BASE_URL}/api/usuarios/${userId}`,
            params: getAuthQueryParams()
        });
    },

    // --- Integração Mercado Pago (Web Checkout) ---
    checkoutCredits: async (userId: string | number, creditsAmount: number) => {
        const response = await nativeFetch({
            method: 'POST',
            url: `${API_BASE_URL}/api/checkout/create-preference/credits`,
            params: { userId: String(userId) },
            data: { amount: creditsAmount }
        });

        // Retorna a URL de pagamento (initPoint ou sandboxInitPoint)
        const initPoint = response.initPoint || response.sandboxInitPoint;
        if (!initPoint) throw new Error("URL de pagamento não recebida do servidor.");

        return initPoint;
    },

    checkoutSubscription: async (userId: string | number, planId: 'STARTER' | 'PRO' | 'STUDIO') => {
        const response = await nativeFetch({
            method: 'POST',
            url: `${API_BASE_URL}/api/checkout/create-preference`,
            params: { userId: String(userId) },
            data: { planId }
        });

        const initPoint = response.initPoint || response.sandboxInitPoint;
        if (!initPoint) throw new Error("URL de pagamento não recebida do servidor.");

        return initPoint;
    },

    getPlans: async () => {
        return await nativeFetch({
            method: 'GET',
            url: `${API_BASE_URL}/api/plans`
        });
    },

    subscribe: async (userId: string | number, planId: string) => {
        return await nativeFetch({
            method: 'POST',
            url: `${API_BASE_URL}/api/subscriptions/subscribe`,
            params: { userId: String(userId) },
            data: { planId }
        });
    },

    cancelSubscription: async (userId: string | number) => {
        return await nativeFetch({
            method: 'POST',
            url: `${API_BASE_URL}/api/subscriptions/cancel`,
            params: { userId: String(userId) }
        });
    }
};