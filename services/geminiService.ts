import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, ExerciseType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      const base64Content = base64data.split(',')[1];
      resolve({
        inlineData: {
          data: base64Content,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeVideo = async (file: File, exerciseType: ExerciseType): Promise<AnalysisResult> => {
  
  const videoPart = await fileToGenerativePart(file);

  const prompt = `
    Atue como um treinador profissional de educação física (Personal Trainer) de elite.
    Analise este vídeo de uma pessoa realizando o exercício: ${exerciseType}.
    
    Seu trabalho é:
    1. Contar as repetições válidas.
    2. Avaliar a técnica e a forma (postura, amplitude de movimento, cadência).
    3. Atribuir uma nota GERAL de 0 a 100.
    4. Identificar pontos específicos de feedback (ex: "Coluna alinhada", "Joelho valgo", "Amplitude insuficiente") e dar uma nota de 0 a 100 para CADA ponto específico.
    5. Fornecer uma correção principal detalhada.
    6. Listar grupos musculares.

    Responda EXCLUSIVAMENTE em formato JSON seguindo o schema fornecido.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [videoPart, { text: prompt }],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER, description: "Nota GERAL de 0 a 100 para a execução." },
          repetitions: { type: Type.NUMBER, description: "Número de repetições completas e válidas." },
          feedback: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                message: { type: Type.STRING, description: "Descrição do aspecto observado (positivo ou negativo)." },
                score: { type: Type.NUMBER, description: "Nota de 0 a 100 específica para este aspecto." }
              },
              required: ["message", "score"]
            },
            description: "Lista de pontos observados com suas respectivas notas de qualidade." 
          },
          formCorrection: { type: Type.STRING, description: "Um parágrafo detalhado sobre como corrigir a postura." },
          muscleGroups: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Lista dos músculos ativados." 
          }
        },
        required: ["score", "repetitions", "feedback", "formCorrection", "muscleGroups"]
      }
    }
  });

  if (response.text) {
    return JSON.parse(response.text) as AnalysisResult;
  }

  throw new Error("Falha ao analisar o vídeo. Nenhuma resposta recebida.");
};