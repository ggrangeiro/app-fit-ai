/**
 * Config Service - Busca configurações do backend
 * Gerencia cache em memória da API Key do Gemini
 */

import { CapacitorHttp } from '@capacitor/core';

const API_BASE_URL = "https://app-back-ia-732767853162.southamerica-east1.run.app";

// Cache em memória (RAM only - NUNCA persistir em storage)
let cachedApiKey: string | null = null;

interface ConfigResponse {
    key: string;
    value: string;
}

/**
 * Busca a API Key do Gemini do backend.
 * Usa cache em memória para evitar chamadas repetidas.
 * 
 * @param userId ID do usuário logado
 * @param userRole Role do usuário (user, personal, admin)
 * @returns A API Key ou null em caso de erro
 */
export const getGeminiApiKey = async (userId: string | number, userRole: string): Promise<string | null> => {
    // Retorna do cache se já tiver
    if (cachedApiKey) {
        return cachedApiKey;
    }

    try {
        // Normaliza role para uppercase conforme esperado pelo backend
        const normalizedRole = userRole.toUpperCase();

        const url = `${API_BASE_URL}/api/config/GEMINI_API_KEY?requesterId=${userId}&requesterRole=${normalizedRole}`;

        const response = await CapacitorHttp.get({ url });

        if (response.status === 200 && response.data) {
            const config: ConfigResponse = response.data;
            cachedApiKey = config.value;
            console.log("✅ API Key do Gemini carregada do backend");
            return config.value;
        } else {
            console.error("❌ Falha ao buscar API Key:", response.status);
            return null;
        }
    } catch (error) {
        console.error("❌ Erro ao buscar API Key do Gemini:", error);
        return null;
    }
};

/**
 * Limpa o cache da API Key.
 * Chamar quando: logout, erro 401/403 do Gemini, ou ao trocar de usuário.
 */
export const clearApiKeyCache = (): void => {
    cachedApiKey = null;
    console.log("🔄 Cache de API Key do Gemini limpo");
};

/**
 * Verifica se há uma API Key em cache
 */
export const hasApiKeyCache = (): boolean => {
    return cachedApiKey !== null;
};
