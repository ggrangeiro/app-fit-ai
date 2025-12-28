
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
      Instrução: Estime o biotipo (ectomorfo, mesomorfo, endomorfo) e a porcentagem de gordura corporal aproximada baseada na definição muscular visível.
      
      IMPORTANTE: Você DEVE preencher o campo "repetitions" no JSON com o valor numérico estimado da gordura corporal (Ex: se for 15%, retorne 15). Não retorne 0 a menos que não seja possível estimar.
      
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

export const generateDietPlan = async (
  userData: { weight: string; height: string; goal: string },
  analysisContext: AnalysisResult
): Promise<string> => {
  const prompt = `
    Atue como um nutricionista esportivo de elite.
    
    Crie um plano alimentar semanal (Segunda a Domingo) personalizado com base nos seguintes dados:
    - Peso atual: ${userData.weight}kg
    - Altura: ${userData.height}cm
    - Objetivo: ${userData.goal}
    - Biotipo/Contexto observado pela IA: A análise visual indicou ${analysisContext.formCorrection} (considere isso para ajustar macros).
    
    REQUISITOS DE FORMATAÇÃO:
    - Retorne APENAS código HTML limpo (sem tags markdown ou blocos de código).
    - Use classes do Tailwind CSS para estilização direta no HTML.
    - O container principal deve ter fundo branco (bg-white) e texto escuro (text-slate-800).
    - Crie uma tabela para cada dia ou uma lista organizada visualmente agradável.
    - Inclua um cabeçalho com o resumo dos macronutrientes sugeridos (Proteínas, Carboidratos, Gorduras) e Calorias totais estimadas.
    - Adicione uma nota de rodapé dizendo "Consulte sempre um médico ou nutricionista presencial."
    - O design deve ser limpo, profissional e pronto para impressão.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "<p>Erro ao gerar dieta.</p>";
  } catch (e) {
    console.error("Erro ao gerar dieta", e);
    throw new Error("Não foi possível gerar o plano alimentar no momento.");
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
