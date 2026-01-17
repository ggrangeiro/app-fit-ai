import { CapacitorHttp, HttpResponse } from '@capacitor/core';
import { DietGoalEntity, User, UserRole, AnalysisResult } from "../types";
import { secureStorage } from "../utils/secureStorage";


export const API_BASE_URL = "https://app-back-ia-732767853162.southamerica-east1.run.app";

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
            usage: data.usage,
            accessLevel: (data.accessLevel || data.access_level || 'FULL').toUpperCase() as 'FULL' | 'READONLY',
            anamnesis: data.anamnesis || data.anamnese || undefined,
            methodology: data.methodology || undefined,
            communicationStyle: data.communicationStyle || undefined
        };
    },

    getMe: async (userId: string | number): Promise<User> => {
        // --- MIGRATION: Using /api/usuarios/{id} instead of /api/me to get full accessLevel field ---

        // Try to get auth params from storage
        let authParams = getAuthQueryParams();

        // If empty (e.g. during first login), try to use the userId itself as requester
        // This is a fallback assumption that the user is requesting themselves
        if (!authParams.requesterId) {
            authParams = { requesterId: String(userId), requesterRole: 'USER' };
        }

        const data = await nativeFetch({
            method: 'GET',
            url: `${API_BASE_URL}/api/usuarios/${userId}`,
            params: authParams
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
            usage: data.usage,
            accessLevel: (data.accessLevel || data.access_level || 'FULL').toUpperCase() as 'FULL' | 'READONLY',
            anamnesis: data.anamnesis || data.anamnese || undefined,
            methodology: data.methodology || undefined,
            communicationStyle: data.communicationStyle || undefined
        };
    },

    signup: async (name: string, email: string, password: string, phone: string, _creatorId?: string, role: string = 'user', accessLevel: 'FULL' | 'READONLY' = 'FULL') => {
        return await nativeFetch({
            method: 'POST',
            url: `${API_BASE_URL}/api/usuarios/`,
            params: getAuthQueryParams(),
            data: {
                nome: name,
                name,
                email,
                senha: password,
                telefone: phone,
                role,
                accessLevel,
                access_level: accessLevel
            }
        });
    },

    updateUser: async (userId: string | number, data: Partial<User>) => {
        return await nativeFetch({
            method: 'PUT',
            url: `${API_BASE_URL}/api/usuarios/${userId}`,
            params: getAuthQueryParams(),
            data: { ...data, access_level: data.accessLevel }
        });
    },

    uploadAsset: async (userId: string | number, file: { uri: string, name: string, type: string } | File, type: 'avatar' | 'logo', requesterId: string, requesterRole: string) => {
        // Implementação híbrida para funcionar no Web (File object) e Mobile (URI object)
        const formData = new FormData();

        if (file instanceof File) {
            formData.append('file', file);
        } else {
            // Capacitor/Mobile way if needed, but usually we handle Blob/File. 
            // If passing a simple object, we might need to convert or assume the native layer handles it.
            // For this codebase, assuming standard FormData usage or specific adaptation.
            // Given the context of "Mobile", usually we need to read the file into a Blob or transmit as base64 if NativeFetch doesn't support FormData directly.
            // BUT, the prompt example says: formData.append('file', { uri: ..., name: ..., type: ... });
            // This suggests React Native style FormData.
            formData.append('file', file as any);
        }

        formData.append('type', type);

        const url = `${API_BASE_URL}/api/usuarios/${userId}/upload-asset?requesterId=${requesterId}&requesterRole=${requesterRole}`;

        // Native Fetch do Capacitor suporta FormData? 
        // CapacitorHttp request supports 'data' with FormData? It says "data: options.data".
        // Let's rely on axios style or standard fetch if available. 
        // The codebase uses `nativeFetch` wrapper. Let's look at `nativeFetch`.
        // It sets 'Content-Type': 'application/json'. This is bad for FormData.

        // We need a specific fetch for upload or modify nativeFetch to handle FormData.
        // Or just use direct fetch() since Capacitor intercepts it?
        // Let's try to use standard fetch for this specific call to allow properly set Content-Type (multipart/form-data boundary is auto-set by browser/engine).

        const response = await fetch(url, {
            method: 'POST',
            body: formData,
            // headers: {} // Let browser set Content-Type with boundary
        });

        if (!response.ok) {
            throw new Error(`Erro ao enviar imagem: ${response.statusText}`);
        }

        return await response.json();
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

        let mappedUsers: any[] = [];
        if (Array.isArray(data)) {
            mappedUsers = data.map((u: any) => {
                const rawLevel = u.accessLevel || u.access_level || 'FULL';
                return {
                    ...u,
                    accessLevel: String(rawLevel).toUpperCase().trim(),
                    anamnesis: u.anamnesis || u.anamnese || undefined
                };
            });
        } else {
            mappedUsers = (data.students || []).map((u: any) => {
                const rawLevel = u.accessLevel || u.access_level || 'FULL';
                return {
                    ...u,
                    accessLevel: String(rawLevel).toUpperCase().trim(),
                    anamnesis: u.anamnesis || u.anamnese || undefined
                };
            });
        }

        return mappedUsers;
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
    },

    // --- ANAMNESE ---
    updateAnamnesis: async (userId: string | number, data: any) => {
        return await nativeFetch({
            method: 'PUT',
            url: `${API_BASE_URL}/api/usuarios/${userId}/anamnese`,
            params: getAuthQueryParams(),
            data: data
        });
    }
};