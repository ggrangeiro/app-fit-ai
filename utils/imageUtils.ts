
// Wrapper para imagens que vêm do Backend (Proxy reverso)
export const API_BASE_URL = "https://app-back-ia-732767853162.southamerica-east1.run.app";

export function getFullImageUrl(relativePath: string | undefined | null): string | undefined {
    if (!relativePath) return undefined;

    if (relativePath.startsWith('http')) {
        return relativePath;
    }

    // Remove leading slash if needed to avoid double slashes if API_BASE ends with slash (though it doesn't here)
    const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

    return `${API_BASE_URL}${cleanPath}`;
}
