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
    3. Atribuir uma nota de 0 a 100 baseada na qualidade da execução.
    4. Identificar os principais grupos musculares trabalhados.
    5. Fornecer feedback construtivo e dicas de correção específicas.

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
          score: { type: Type.NUMBER, description: "Nota de 0 a 100 para a execução." },
          repetitions: { type: Type.NUMBER, description: "Número de repetições completas e válidas." },
          feedback: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Lista de pontos positivos e negativos sobre a execução." 
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