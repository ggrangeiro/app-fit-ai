
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
  console.log(`Iniciando validação de contexto rigorosa para: ${exerciseType}`);
  
  const mediaPart = await fileToGenerativePart(file);

  const validationRules = `
    REGRA DE OURO: VOCÊ É UM FILTRO DE CONTEXTO FITNESS ULTRA-RIGOROSO.
    
    Sua primeira missão é validar se o arquivo é VÁLIDO para análise de saúde/fitness.
    
    CRITÉRIOS DE REJEIÇÃO IMEDIATA (isValidContent = false):
    1. CONTEXTO ERRADO: Vídeos de esportes coletivos (futebol, basquete, etc), partidas profissionais, desenhos animados, filmes, memes ou paisagens sem pessoas treinando.
    2. AUSÊNCIA DE FOCO: Se houver muitas pessoas e não ficar claro quem é o aluno treinando.
    3. INCOMPATIBILIDADE: Se o usuário escolheu "${exerciseType}" mas está fazendo algo totalmente diferente (ex: dançando, jogando bola, ou apenas caminhando).
    4. QUALIDADE: Vídeo muito escuro, borrado ou onde o corpo não pode ser distinguido do fundo.
    
    SE FOR REJEITADO:
    - isValidContent: false
    - validationError: Explique o motivo específico (ex: "O vídeo enviado parece ser de uma partida de futebol. Por favor, envie um vídeo focado na execução do exercício selecionado.")
    - Zere todos os scores e repetições.
    
    SE FOR VÁLIDO (Passou no filtro de contexto e o exercício "${exerciseType}" foi identificado):
    - isValidContent: true
    - Prossiga com a análise biomecânica normal.
  `;

  let prompt = '';

  if (exerciseType === ExerciseType.POSTURE_ANALYSIS) {
    prompt = `
      ${validationRules}
      Contexto: Análise Postural Estática ou Dinâmica.
      Instrução: Analise o alinhamento de ombros, coluna e quadril. Identifique escolioses aparentes ou inclinações pélvicas.
      Responda EXCLUSIVAMENTE em JSON.
    `;
  } else if (exerciseType === ExerciseType.BODY_COMPOSITION) {
    prompt = `
      ${validationRules}
      Contexto: Avaliação Antropométrica Visual.
      Instrução: Estime o biotipo (ectomorfo, mesomorfo, endomorfo) e a gordura corporal aproximada baseada na definição muscular visível.
      Responda EXCLUSIVAMENTE em JSON.
    `;
  } else {
    prompt = `
      ${validationRules}
      Contexto: Treinamento Resistido / Cardio (${exerciseType}).
      Instrução: Conte apenas repetições completas. Avalie a cadência e amplitude do movimento.
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
    throw new Error("Falha na interpretação da IA.");
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
