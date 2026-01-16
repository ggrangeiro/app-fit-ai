import CryptoJS from 'crypto-js';

const SECRET_KEY = "fitai_secret_key_v1"; // Em produção, idealmente viria de uma variável de ambiente, mas para criptografia local simples funciona.

export const secureStorage = {
    setItem: (key: string, value: any) => {
        try {
            const stringValue = JSON.stringify(value);
            const encrypted = CryptoJS.AES.encrypt(stringValue, SECRET_KEY).toString();
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
                const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
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
