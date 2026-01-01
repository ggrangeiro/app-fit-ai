import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, ExerciseType, SPECIAL_EXERCISES } from "../types";

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

// Agora aceita um terceiro argumento opcional: previousAnalysis
export const analyzeVideo = async (file: File, exerciseType: ExerciseType, previousAnalysis?: AnalysisResult | null): Promise<AnalysisResult> => {
  console.log(`Iniciando análise detalhada para: ${exerciseType}`);
  
  const mediaPart = await fileToGenerativePart(file);

  // Configuração base de validação
  let validationRules = "";
  
  if (exerciseType === SPECIAL_EXERCISES.FREE_MODE) {
    validationRules = `
      1. Identifique QUALQUER exercício de fitness ou musculação que o humano esteja fazendo.
      2. Se for um exercício reconhecível, isValidContent: true.
      3. Se não houver exercício claro (apenas parado, dançando, comendo), isValidContent: false.
    `;
  } else {
    validationRules = `
      REGRA DE OURO: VOCÊ É UM FILTRO DE CONTEXTO FITNESS ULTRA-RIGOROSO.
      1. Valide se o vídeo contém um humano realizando "${exerciseType}".
      2. Se for inválido (esporte errado, sem pessoa, meme), retorne isValidContent: false.
    `;
  }

  // Construção do contexto histórico (Apenas para conhecimento da IA, não para o texto final da Dica de Mestre)
  let historyContext = "";
  if (previousAnalysis) {
    historyContext = `
      CONTEXTO DO USUÁRIO (HISTÓRICO):
      O usuário realizou este exercício anteriormente com nota ${previousAnalysis.score}.
      Erros passados: "${previousAnalysis.improvements?.map(i => i.instruction).join("; ") || "Nenhum"}".
    `;
  }

  // Novas regras de estilo para feedback DETALHADO
  const detailedStyle = `
    VOCÊ É UM TREINADOR DE BIOMECÂNICA DE ELITE (PhD em Cinesiologia).
    
    Seu objetivo não é apenas corrigir, mas EDUCAR. A análise deve ser rica, detalhada e técnica, mas acessível.
    
    IMPORTANTE SOBRE A RESPOSTA 'formCorrection':
    - Analise APENAS a execução ATUAL (deste vídeo).
    - NÃO compare com o histórico anterior neste campo. NÃO diga "você melhorou em relação à vez passada".
    - O feedback deve ser absoluto sobre o vídeo atual.
    
    ESTRUTURA DA RESPOSTA:
    1. "strengths": Identifique 2 a 3 pontos que o usuário executou PERFEITAMENTE. Elogie a técnica (ex: estabilidade, amplitude, ritmo).
    2. "improvements": Liste 3 a 5 correções CRÍTICAS. Para cada correção, forneça:
       - "instruction": A ordem direta do que mudar.
       - "detail": A explicação biomecânica ou o risco de lesão associado (O PORQUÊ).
    3. "feedback": Use este array para dar notas (0-100) para partes específicas do corpo (ex: Cabeça, Tronco, Quadril, Joelhos, Pés).
    
    O tom deve ser encorajador porém rigoroso tecnicamente.
  `;

  let prompt = '';

  if (exerciseType === SPECIAL_EXERCISES.POSTURE) {
    prompt = `
      ${validationRules}
      ${detailedStyle}
      ${historyContext}
      Contexto: Análise Postural Estática ou Dinâmica.
      Instrução: Realize uma varredura completa. Identifique desvios como Hiperlordose, Hipercifose, Escoliose, Valgo Dinâmico, Cabeça protusa.
      Dê detalhes sobre como esses desvios afetam o dia a dia.
      Responda EXCLUSIVAMENTE em JSON.
    `;
  } else if (exerciseType === SPECIAL_EXERCISES.BODY_COMPOSITION) {
    prompt = `
      ${validationRules}
      ${detailedStyle}
      ${historyContext}
      Contexto: Avaliação Antropométrica Visual.
      Instrução: Estime o biotipo e a gordura corporal.
      IMPORTANTE: Identifique visualmente o sexo biológico (masculino ou feminino) para ajustar a estimativa de gordura e sugestões.
      
      No campo "improvements", sugira focos estéticos ou de saúde baseados no biotipo identificado (ex: "Focar em deltoide lateral para equilibrar a silhueta").
      
      IMPORTANTE: Preencha "repetitions" com a % de gordura estimada (apenas número).
      Preencha "gender" com 'masculino' ou 'feminino'.
      Responda EXCLUSIVAMENTE em JSON.
    `;
  } else if (exerciseType === SPECIAL_EXERCISES.FREE_MODE) {
    prompt = `
      ${validationRules}
      ${detailedStyle}
      Contexto: O usuário enviou um vídeo de um exercício DESCONHECIDO.
      Instrução:
      1. Identifique o nome do exercício e preencha OBRIGATORIAMENTE o campo "identifiedExercise" (ex: "Agachamento Livre", "Supino Reto").
      2. Realize a análise biomecânica completa do movimento identificado.
      3. Analise a fase concêntrica e excêntrica. Verifique a estabilidade articular.
      Responda EXCLUSIVAMENTE em JSON.
    `;
  } else {
    prompt = `
      ${validationRules}
      ${detailedStyle}
      ${historyContext}
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
            gender: { type: Type.STRING, description: "Sexo estimado: 'masculino' ou 'feminino'" },
            identifiedExercise: { type: Type.STRING, description: "Nome do exercício identificado (apenas para modo livre)" },
            
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
            formCorrection: { type: Type.STRING, description: "Resumo geral técnico da execução atual. Dica de Mestre." },
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
  userData: { weight: string; height: string; goal: string; gender: string },
  analysisContext: AnalysisResult
): Promise<string> => {
  const prompt = `
    Atue como um nutricionista esportivo de elite com foco em UI/UX moderno.
    
    Crie um plano alimentar semanal visualmente incrível e moderno, baseado nestes dados:
    - Peso: ${userData.weight}kg | Altura: ${userData.height}cm | Sexo: ${userData.gender}
    - Objetivo: ${userData.goal}
    - Contexto IA: ${analysisContext.formCorrection}
    
    INSTRUÇÕES ESPECÍFICAS DE GÊNERO:
    - Ajuste as calorias e macronutrientes considerando o metabolismo basal típico do sexo ${userData.gender}.
    
    DIRETRIZES DE DESIGN E HTML (IMPORTANTE - LEGIBILIDADE MÁXIMA):
    1. NÃO use tabelas HTML padrão (<table>). Use um layout de CARDS (Cartões) modernos usando <div> e classes Tailwind CSS.
    2. Estrutura sugerida:
       - Um "Hero Section" no topo com o resumo dos Macros em destaque.
       - Um GRID responsivo para os dias da semana.
       - Cada dia deve ser um "Card": fundo branco (bg-white), bordas arredondadas (rounded-2xl).
    3. CORES E TIPOGRAFIA (CRUCIAL):
       - O texto principal DEVE SER ESCURO E LEGÍVEL: Use 'text-slate-900' (quase preto).
       - Títulos dentro dos cards devem ser COLORIDOS e ESCUROS (ex: 'text-emerald-800' ou 'text-teal-900').
       - NUNCA use cinza claro (text-gray-400, text-slate-300) dentro dos cards brancos.
       - Use badges vibrantes para as refeições.
    4. Conteúdo:
       - Organize o conteúdo de forma limpa.
       - Para o DOMINGO (Sunday): Card especial com fundo escuro (bg-slate-800). Neste caso, o texto deve ser BRANCO.
    
    O output deve ser APENAS o código HTML do conteúdo interno.
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

export const generateWorkoutPlan = async (
  userData: { weight: string; height: string; goal: string; level: string; frequency: string; observations: string; gender: string },
  analysisContext?: AnalysisResult
): Promise<string> => {
  // Serializar os pontos de melhoria para o prompt SE houver análise prévia
  let technicalAdjustments = "Foco em condicionamento geral e objetivo do aluno.";
  if (analysisContext) {
      technicalAdjustments = analysisContext.improvements 
        ? analysisContext.improvements.map(i => `${i.instruction} (${i.detail})`).join("; ")
        : analysisContext.formCorrection;
  }

  const prompt = `
    Atue como um Personal Trainer de elite e Especialista em Biomecânica e Reabilitação.
    
    Crie um plano de treino semanal visualmente incrível e moderno.
    
    DADOS DO ALUNO:
    - Peso: ${userData.weight}kg | Altura: ${userData.height}cm | Sexo: ${userData.gender}
    - Objetivo: ${userData.goal}
    - Nível: ${userData.level}
    - Frequência: ${userData.frequency} dias
    
    OBSERVAÇÕES: "${userData.observations || 'Nenhuma.'}"
    ${analysisContext ? `ANÁLISE BIOMECÂNICA (IA): "${technicalAdjustments}"` : ''}
    
    INSTRUÇÕES DE INTEGRAÇÃO E GÊNERO:
    1. Considere diferenças fisiológicas para o sexo ${userData.gender} (ex: volume de treino, recuperação, ênfases estéticas comuns se não especificado o contrário).
    2. Se houver dor relatada, adapte.
    3. Use aquecimento para corrigir biomecânica detectada (se houver análise).
    
    DIRETRIZES DE DESIGN E HTML (LEGIBILIDADE TOTAL):
    1. Estrutura Visual: Padrão "Card/Grid" moderno.
    2. CORES E FONTES (MUITO IMPORTANTE):
       - Fundo dos Cards: Branco (bg-white).
       - Texto dos Exercícios: OBRIGATORIAMENTE ESCURO ('text-slate-900').
       - Títulos e Cabeçalhos: Use AZUL ESCURO ou INDIGO ESCURO ('text-blue-800', 'text-indigo-900').
       - PROIBIDO usar texto cinza claro, prata ou cores lavadas dentro dos cards brancos. O contraste deve ser alto.
    3. ESTILO DO CARD DE FREQUÊNCIA:
       - Escreva APENAS o número seguido de 'x' (ex: <span class="text-blue-900 font-bold">4x</span>).
    4. Dia de Descanso (Domingo):
       - Fundo escuro (bg-slate-800). Texto BRANCO (text-white).
    
    O output deve ser APENAS o código HTML do conteúdo interno.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "<p>Erro ao gerar treino.</p>";
  } catch (e) {
    console.error("Erro ao gerar treino", e);
    throw new Error("Não foi possível gerar o plano de treino no momento.");
  }
};

export const generateProgressInsight = async (
  currentResult: AnalysisResult,
  previousResult: AnalysisResult,
  exerciseType: string
): Promise<string> => {
  const isBodyComp = exerciseType === SPECIAL_EXERCISES.BODY_COMPOSITION;
  
  const prompt = `
    Atue como um Coach Esportivo Parceiro e Analítico.
    
    OBJETIVO: Comparar exclusivamente a execução ATUAL (HOJE) com a execução IMEDIATAMENTE ANTERIOR (HISTÓRICO).
    Exercício: ${exerciseType}
    
    DADOS DA SESSÃO ATUAL (HOJE):
    - Score Técnico: ${currentResult.score}/100
    - ${isBodyComp ? '% Gordura' : 'Repetições'}: ${currentResult.repetitions}
    - Feedback da IA: "${currentResult.formCorrection}"

    DADOS DA SESSÃO ANTERIOR (PASSADO):
    - Score Técnico: ${previousResult.score}/100
    - ${isBodyComp ? '% Gordura' : 'Repetições'}: ${previousResult.repetitions}
    - Feedback Passado: "${previousResult.formCorrection}"

    INSTRUÇÕES:
    1. Destaque a diferença de pontuação (ex: "+5 pontos", "-2 pontos").
    2. Identifique se houve correção técnica baseada nos feedbacks.
    3. Seja curto, direto e motivador. Máximo 40 palavras.
    4. Use emojis.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Continue treinando para ver sua evolução!";
  } catch (e) {
    return "Não foi possível gerar o insight de evolução no momento.";
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