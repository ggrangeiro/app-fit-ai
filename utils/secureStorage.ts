import CryptoJS from 'crypto-js';

/**
 * Gera uma chave derivada baseada em fatores do ambiente.
 * Em produção, isso é mais seguro que uma chave hardcoded pois
 * a chave final varia por instalação/dispositivo.
 */
const deriveSecretKey = (): string => {
    // Combina múltiplos fatores para criar uma chave única por instalação
    const factors = [
        navigator.userAgent,
        window.location.origin,
        'fitai_v2_salt_2024'
    ].join('|');

    // Gera hash SHA256 dos fatores para criar a chave
    return CryptoJS.SHA256(factors).toString();
};

// Chave derivada é gerada uma vez e cacheada
let _cachedKey: string | null = null;
const getSecretKey = (): string => {
    if (!_cachedKey) {
        _cachedKey = deriveSecretKey();
    }
    return _cachedKey;
};

export const secureStorage = {
    setItem: (key: string, value: any) => {
        try {
            const stringValue = JSON.stringify(value);
            const encrypted = CryptoJS.AES.encrypt(stringValue, getSecretKey()).toString();
            localStorage.setItem(key, encrypted);
        } catch (e) {
            console.error("Error encrypting data", e);
            // Fallback seguro: não salvar ou salvar sem encriptar? 
            // Para compliance estrito, melhor falhar ou tentar salvar.
            // Aqui vamos salvar como string normal se falhar a criptografia para não quebrar o app, mas logar erro.
            localStorage.setItem(key, JSON.stringify(value));
        }
    },

    getItem: <T>(key: string): T | null => {
        try {
            const encrypted = localStorage.getItem(key);
            if (!encrypted) return null;

            // Tenta desencriptar
            try {
                const bytes = CryptoJS.AES.decrypt(encrypted, getSecretKey());
                const decrypted = bytes.toString(CryptoJS.enc.Utf8);

                if (!decrypted) {
                    // Se falhar (string vazia), pode ser que o dado antigo não estava encriptado (migração)
                    // Tenta parsear direto o valor original
                    return JSON.parse(encrypted);
                }

                return JSON.parse(decrypted);
            } catch (decryptError) {
                // Se der erro no decrypt, assume que é dado legado (texto plano)
                return JSON.parse(encrypted);
            }

        } catch (e) {
            console.error("Error decrypting data", e);
            return null;
        }
    },

    removeItem: (key: string) => {
        localStorage.removeItem(key);
    },

    clear: () => {
        localStorage.clear();
    }
};
