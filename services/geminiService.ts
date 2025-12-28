
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
  console.log(`Iniciando análise detalhada para: ${exerciseType}`);
  
  const mediaPart = await fileToGenerativePart(file);

  const validationRules = `
    REGRA DE OURO: VOCÊ É UM FILTRO DE CONTEXTO FITNESS ULTRA-RIGOROSO.
    
    1. Valide se o vídeo contém um humano realizando "${exerciseType}".
    2. Se for inválido (esporte errado, sem pessoa, meme), retorne isValidContent: false.
  `;

  // Novas regras de estilo para feedback DETALHADO
  const detailedStyle = `
    VOCÊ É UM TREINADOR DE BIOMECÂNICA DE ELITE (PhD em Cinesiologia).
    
    Seu objetivo não é apenas corrigir, mas EDUCAR. A análise deve ser rica, detalhada e técnica, mas acessível.
    
    ESTRUTURA DA RESPOSTA:
    1. "strengths": Identifique 2 a 3 pontos que o usuário executou PERFEITAMENTE. Elogie a técnica (ex: estabilidade, amplitude, ritmo).
    2. "improvements": Liste 3 a 5 correções CRÍTICAS. Para cada correção, forneça:
       - "instruction": A ordem direta do que mudar.
       - "detail": A explicação biomecânica ou o risco de lesão associado (O PORQUÊ).
    3. "feedback": Use este array para dar notas (0-100) para partes específicas do corpo (ex: Cabeça, Tronco, Quadril, Joelhos, Pés).
    
    O tom deve ser encorajador porém rigoroso tecnicamente.
  `;

  let prompt = '';

  if (exerciseType === ExerciseType.POSTURE_ANALYSIS) {
    prompt = `
      ${validationRules}
      ${detailedStyle}
      Contexto: Análise Postural Estática ou Dinâmica.
      Instrução: Realize uma varredura completa. Identifique desvios como Hiperlordose, Hipercifose, Escoliose, Valgo Dinâmico, Cabeça protusa.
      Dê detalhes sobre como esses desvios afetam o dia a dia.
      Responda EXCLUSIVAMENTE em JSON.
    `;
  } else if (exerciseType === ExerciseType.BODY_COMPOSITION) {
    prompt = `
      ${validationRules}
      ${detailedStyle}
      Contexto: Avaliação Antropométrica Visual.
      Instrução: Estime o biotipo e a gordura corporal.
      No campo "improvements", sugira focos estéticos ou de saúde (ex: "Focar em deltoide lateral para equilibrar a silhueta").
      
      IMPORTANTE: Preencha "repetitions" com a % de gordura estimada (apenas número).
      Responda EXCLUSIVAMENTE em JSON.
    `;
  } else {
    prompt = `
      ${validationRules}
      ${detailedStyle}
      Contexto: Treinamento Resistido / Cardio (${exerciseType}).
      Instrução: Analise a fase concêntrica e excêntrica. Verifique a estabilidade articular.
      Identifique compensações musculares.
      Responda EXCLUSIVAMENTE em JSON.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Upgrade para modelo Pro para melhor raciocínio biomecânico
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
            
            // Novos campos detalhados
            strengths: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Lista de pontos positivos da execução"
            },
            improvements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  instruction: { type: Type.STRING, description: "Ação corretiva direta" },
                  detail: { type: Type.STRING, description: "Explicação técnica/biomecânica do erro" }
                },
                required: ["instruction", "detail"]
              }
            },
            
            // Feedback segmentado por parte do corpo
            feedback: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  message: { type: Type.STRING, description: "Nome da parte do corpo avaliada (ex: Joelhos)" },
                  score: { type: Type.NUMBER, description: "Nota de 0 a 100 para essa parte" }
                },
                required: ["message", "score"]
              }
            },
            formCorrection: { type: Type.STRING, description: "Resumo geral ou 'Dica de Ouro'" },
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
    Atue como um nutricionista esportivo de elite com foco em UI/UX moderno.
    
    Crie um plano alimentar semanal visualmente incrível e moderno, baseado nestes dados:
    - Peso: ${userData.weight}kg | Altura: ${userData.height}cm | Objetivo: ${userData.goal}
    - Contexto IA: ${analysisContext.formCorrection}
    
    DIRETRIZES DE DESIGN E HTML (IMPORTANTE):
    1. NÃO use tabelas HTML padrão (<table>). Use um layout de CARDS (Cartões) modernos usando <div> e classes Tailwind CSS.
    2. Estrutura sugerida:
       - Um "Hero Section" no topo com o resumo dos Macros em destaque (Cards coloridos grandes).
       - Um GRID responsivo (grid-cols-1 md:grid-cols-2 gap-6) para os dias da semana.
       - Cada dia deve ser um "Card" bonito: fundo branco (bg-white), sombra suave (shadow-md), bordas arredondadas (rounded-2xl) e borda sutil (border border-slate-200).
    3. Tipografia e Cores (ALTA LEGIBILIDADE):
       - Use 'text-slate-800' ou 'text-slate-900' para todo o texto principal nos dias comuns.
       - Use cores de destaque suaves para títulos (ex: text-emerald-700, text-blue-700).
       - Use badges (etiquetas) para as refeições.
    4. Conteúdo:
       - Organize o conteúdo de forma limpa dentro dos cards. Use listas (<ul>) sem marcadores padrão, mas com espaçamento.
       - Para o DOMINGO (Sunday): Crie um card especial com fundo escuro (ex: bg-slate-800) para diferenciar (Dia de Descanso ou Livre). IMPORTANTE: Neste card de Domingo, TODO o texto deve ser BRANCO (text-white ou text-slate-100) para garantir leitura perfeita.
    
    O output deve ser APENAS o código HTML do conteúdo interno (sem tags <html> ou <body>).
    Faça parecer um dashboard de aplicativo de nutrição premium.
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
