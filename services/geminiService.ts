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
  console.log(`Starting analysis for: ${exerciseType}, file size: ${Math.round(file.size / 1024)}KB`);
  
  const videoPart = await fileToGenerativePart(file);

  let prompt = '';

  if (exerciseType === ExerciseType.POSTURE_ANALYSIS) {
    prompt = `
      Atue como um especialista em biomecânica e fisioterapia.
      Analise a POSTURA ESTÁTICA desta pessoa.
      1. Identifique desvios posturais visíveis.
      2. Avalie a simetria corporal.
      3. Atribua nota GERAL (0-100).
      4. Indique uma correção simples.
      5. Liste músculos envolvidos.
      Responda EXCLUSIVAMENTE em formato JSON. Repetições = 1.
    `;
  } else if (exerciseType === ExerciseType.BODY_COMPOSITION) {
    prompt = `
      Atue como um nutricionista esportivo. Analise a COMPOSIÇÃO CORPORAL visual.
      1. Estime % GORDURA (coloque no campo 'repetitions').
      2. Identifique o BIOTIPO.
      3. Atribua nota de condicionamento (0-100).
      4. Dê dicas de foco nutricional e treino.
      Responda EXCLUSIVAMENTE em formato JSON.
    `;
  } else {
    prompt = `
      Atue como um Personal Trainer. Analise este vídeo de ${exerciseType}.
      1. Conte repetições válidas.
      2. Avalie a técnica e atribua nota GERAL (0-100).
      3. Dê feedbacks curtos e uma correção principal com emojis.
      4. Liste músculos ativados.
      Responda EXCLUSIVAMENTE em formato JSON.
    `;
  }

  try {
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
          required: ["score", "repetitions", "feedback", "formCorrection", "muscleGroups"]
        }
      }
    });

    if (response && response.text) {
      const cleanedText = response.text.trim();
      console.log("Gemini Response received.");
      return JSON.parse(cleanedText) as AnalysisResult;
    }
    
    throw new Error("Resposta vazia ou inválida do servidor de IA.");

  } catch (error: any) {
    console.error("Gemini API Error Detail:", error);
    // Propagate the actual error message
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
    throw new Error("No image data in response.");
  } catch (e) {
    console.error("Image generation failed", e);
    throw e;
  }
};