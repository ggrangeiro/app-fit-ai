import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

const API_BASE_URL = "https://app-back-ia-732767853162.southamerica-east1.run.app";

export const shareAsPdf = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error('Elemento não encontrado');
    }

    try {
        // Encontra o conteúdo HTML específico que queremos (sem os botões de controle)
        const contentElement = element.querySelector('#generated-plan-content') || element;
        const htmlContent = contentElement.innerHTML;

        // Recupera dados do objetivo do DOM se possível, ou usa genérico
        const goal = element.querySelector('.font-bold.text-slate-900.capitalize')?.textContent || 'Plano';

        // 1. Chama a API do Backend para gerar o PDF
        const response = await CapacitorHttp.request({
            method: 'POST',
            url: `${API_BASE_URL}/api/pdf/generate`,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/pdf'
            },
            data: {
                html: htmlContent,
                fileName: fileName,
                metadata: {
                    goal: goal,
                    timestamp: new Date().toISOString()
                }
            },
            // IMPORTANTE: Para receber binário corretamente no CapacitorHttp
            responseType: 'arraybuffer'
        });

        if (response.status >= 400) {
            throw new Error(`Erro no servidor ao gerar PDF: ${response.status}`);
        }

        // 2. Converte ArrayBuffer para Base64
        const uint8Array = new Uint8Array(response.data);
        let binary = '';
        const len = uint8Array.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        const pdfBase64 = window.btoa(binary);

        if (Capacitor.isNativePlatform()) {
            // 3. Salva no sistema de arquivos para compartilhar (Mobile)
            const fileNameWithExt = `${fileName.replace(/\s+/g, '_')}.pdf`;
            const savedFile = await Filesystem.writeFile({
                path: fileNameWithExt,
                data: pdfBase64,
                directory: Directory.Cache
            });

            // 4. Abre o diálogo de compartilhamento
            await Share.share({
                title: fileName,
                text: `Confira seu ${fileName} gerado pelo FitAI!`,
                url: savedFile.uri,
                dialogTitle: 'Compartilhar PDF'
            });
        } else {
            // Fallback para Web (Download direto)
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${fileName}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        }
    } catch (error) {
        console.error('Erro ao gerar/compartilhar PDF:', error);
        throw error;
    }
};
