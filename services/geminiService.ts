
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
    reader.onerror = (e) => reject(new Error("Falha ao ler arquivo: " + e));
    reader.readAsDataURL(file);
  });
};

export const analyzeVideo = async (file: File, exerciseType: ExerciseType): Promise<AnalysisResult> => {
  console.log(`Starting rigorous validation for: ${exerciseType}`);
  
  const mediaPart = await fileToGenerativePart(file);

  const validationRules = `
    INSTRUÇÕES CRÍTICAS DE SEGURANÇA E CONTEXTO:
    Sua primeira e mais importante tarefa é validar o conteúdo. Seja cético.
    
    1. PRESENÇA HUMANA: Existe pelo menos um ser humano claramente visível realizando uma atividade? Se for um objeto, animal, paisagem ou ambiente vazio, REJEITE.
    2. COERÊNCIA DE CATEGORIA: O conteúdo condiz com o que foi selecionado: "${exerciseType}"?
       - Se o usuário selecionou um exercício específico (ex: Agachamento), ele deve estar tentando realizar ESSE exercício.
       - Se selecionou "Análise de Postura", deve ser uma foto/vídeo de um humano em pé ou sentado para avaliação.
       - Se selecionou "Análise Corporal", deve ser um humano em trajes que permitam ver a composição física.
    
    SE QUALQUER REGRA FALHAR:
    - Defina "isValidContent" como false.
    - No campo "validationError", explique educadamente mas com firmeza por que o conteúdo foi rejeitado (ex: "Não detectamos um humano no vídeo" ou "O vídeo enviado parece ser de um exercício diferente do selecionado").
    - Zere os outros campos (score: 0, repetitions: 0, etc).
  `;

  let prompt = '';

  if (exerciseType === ExerciseType.POSTURE_ANALYSIS) {
    prompt = `
      ${validationRules}
      Se o conteúdo for VÁLIDO:
      Atue como Especialista em Fisioterapia e Biomecânica. Analise a POSTURA.
      Identifique desvios laterais ou frontais, simetria de ombros/quadril e dê nota 0-100.
      Responda EXCLUSIVAMENTE em JSON.
    `;
  } else if (exerciseType === ExerciseType.BODY_COMPOSITION) {
    prompt = `
      ${validationRules}
      Se o conteúdo for VÁLIDO:
      Atue como Nutricionista Esportivo. Analise a COMPOSIÇÃO CORPORAL.
      Estime % de gordura (coloque no campo 'repetitions'), identifique o biotipo e dê nota de condicionamento.
      Responda EXCLUSIVAMENTE em JSON.
    `;
  } else {
    prompt = `
      ${validationRules}
      Se o conteúdo for VÁLIDO:
      Atue como Personal Trainer. Analise o exercício ${exerciseType}.
      Conte APENAS repetições com técnica aceitável. Atribua nota 0-100 baseada na amplitude e controle.
      Dê feedbacks curtos com emojis.
      Responda EXCLUSIVAMENTE em JSON.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [mediaPart, { text: prompt }],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValidContent: { type: Type.BOOLEAN },
            validationError: { type: Type.STRING },
            score: { type: Type.NUMBER },
            repetitions: { type: Type.NUMBER },
            feedback: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  message: { type: Type.STRING },
                  score: { type: Type.NUMBER }
                },
                required: ["message", "score"]
              }
            },
            formCorrection: { type: Type.STRING },
            muscleGroups: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["isValidContent", "score", "repetitions", "feedback", "formCorrection", "muscleGroups"]
        }
      }
    });

    if (response && response.text) {
      return JSON.parse(response.text.trim()) as AnalysisResult;
    }
    throw new Error("Erro na comunicação com a IA.");
  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

export const generateExerciseThumbnail = async (exerciseName: string): Promise<string> => {
  const prompt = `Professional fitness photography of a person performing ${exerciseName}. High resolution, gym environment, cinematic lighting.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "4:3" } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("No image data.");
  } catch (e) {
    console.error("Image generation failed", e);
    throw e;
  }
};
