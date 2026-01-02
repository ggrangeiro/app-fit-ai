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
      REGRA DE OURO: VOCÊ É UM FILTRO DE CONTEXTO FITNESS.
      1. Valide se o vídeo contém um humano realizando "${exerciseType}".
      2. Se for inválido (esporte errado, sem pessoa, meme), retorne isValidContent: false.
    `;
  }

  // Construção do contexto histórico
  let historyContext = "";
  if (previousAnalysis) {
    historyContext = `
      CONTEXTO DO USUÁRIO (HISTÓRICO):
      O usuário realizou este exercício anteriormente com nota ${previousAnalysis.score}.
      Erros passados: "${previousAnalysis.improvements?.map(i => i.instruction).join("; ") || "Nenhum"}".
    `;
  }

  // NOVA PERSONA: Amigável e para Iniciantes
  const detailedStyle = `
    VOCÊ É UM PERSONAL TRAINER PARCEIRO, EXTREMAMENTE AMIGÁVEL E DIDÁTICO.
    
    Seu aluno é um INICIANTE completo. 
    Seu objetivo é fazer ele se sentir bem por ter tentado, enquanto corrige a postura com carinho e simplicidade.
    
    DIRETRIZES DE TOM (IMPORTANTE):
    - NÃO use termos técnicos complexos (como "rotação externa", "valgo dinâmico") sem explicar de jeito simples (ex: "joelho para dentro").
    - Use linguagem coloquial e acolhedora.
    - Use EMOJIS para deixar a mensagem leve e divertida. 😃💪✨
    
    IMPORTANTE SOBRE A RESPOSTA 'formCorrection' (Dica de Mestre):
    - Deve parecer um conselho de um amigo experiente.
    - Exemplo de tom desejado: "Olha, você mandou super bem na vontade! Só cuidado para não deixar as costas dobrarem, tá? Isso protege sua coluna. Tente estufar o peito na próxima!"
    - Analise APENAS a execução ATUAL.
    
    ESTRUTURA DA RESPOSTA:
    1. "strengths": Identifique 2 a 3 coisas boas (mesmo que seja a energia ou a tentativa).
    2. "improvements": Correções focadas em SEGURANÇA.
       - "instruction": O que fazer (muito simples).
       - "detail": Por que fazer (ex: "para não doer as costas").
    3. "feedback": Notas 0-100 para partes do corpo.
  `;

  let prompt = '';

  if (exerciseType === SPECIAL_EXERCISES.POSTURE) {
    prompt = `
      ${validationRules}
      ${detailedStyle}
      ${historyContext}
      Contexto: Análise Postural.
      Instrução: Olhe para a postura da pessoa. Diga se ela está curvada, torta ou alinhada.
      Explique como melhorar a postura no dia a dia de trabalho ou estudo.
      Responda EXCLUSIVAMENTE em JSON.
    `;
  } else if (exerciseType === SPECIAL_EXERCISES.BODY_COMPOSITION) {
    prompt = `
      ${validationRules}
      ${detailedStyle}
      ${historyContext}
      Contexto: Avaliação Visual do Corpo.
      Instrução: Estime o biotipo e a gordura corporal.
      IMPORTANTE: Identifique visualmente o sexo biológico (masculino ou feminino) para ajustar a estimativa.
      
      No campo "improvements", dê dicas de saúde e estética leves baseadas no corpo da pessoa.
      
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
      1. Identifique o nome do exercício e preencha OBRIGATORIAMENTE o campo "identifiedExercise".
      2. Analise se ele está fazendo de um jeito seguro.
      Responda EXCLUSIVAMENTE em JSON.
    `;
  } else {
    prompt = `
      ${validationRules}
      ${detailedStyle}
      ${historyContext}
      Contexto: Exercício "${exerciseType}".
      Instrução: Analise a execução focando na segurança do iniciante.
      Responda EXCLUSIVAMENTE em JSON.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Mantido modelo Pro para qualidade da análise visual
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
            
            strengths: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Lista de pontos positivos amigáveis"
            },
            improvements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  instruction: { type: Type.STRING, description: "O que ajustar (simples)" },
                  detail: { type: Type.STRING, description: "Por que ajustar (segurança)" }
                },
                required: ["instruction", "detail"]
              }
            },
            
            feedback: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  message: { type: Type.STRING, description: "Parte do corpo" },
                  score: { type: Type.NUMBER, description: "Nota 0-100" }
                },
                required: ["message", "score"]
              }
            },
            formCorrection: { type: Type.STRING, description: "Dica de Mestre: Resumo amigável, motivador e simples." },
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
  userData: { weight: string; height: string; goal: string; gender: string; observations?: string },
  analysisContext?: AnalysisResult
): Promise<string> => {
  const prompt = `
    Atue como um nutricionista esportivo de elite com foco em UI/UX moderno e flexibilidade.
    
    Crie um plano alimentar semanal visualmente incrível e moderno.
    
    PERFIL DO USUÁRIO:
    - Peso: ${userData.weight}kg | Altura: ${userData.height}cm | Sexo: ${userData.gender}
    - Objetivo: ${userData.goal}
    
    OBSERVAÇÕES ALIMENTARES (CRUCIAL):
    "${userData.observations || 'Nenhuma restrição informada.'}"
    (Se houver alergias, aversões ou preferências como 'vegano' ou 'jejum', VOCÊ DEVE RESPEITAR RIGOROSAMENTE).

    ${analysisContext ? `- Contexto Biomecânico/Visual (IA): ${analysisContext.formCorrection}` : ''}
    
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
    Atue como um Personal Trainer Parceiro e Motivador.
    
    Crie um plano de treino semanal visualmente incrível, moderno e FÁCIL DE ENTENDER.
    
    DADOS DO ALUNO:
    - Peso: ${userData.weight}kg | Altura: ${userData.height}cm | Sexo: ${userData.gender}
    - Objetivo: ${userData.goal}
    - Nível: ${userData.level}
    - Frequência: ${userData.frequency} dias
    
    OBSERVAÇÕES: "${userData.observations || 'Nenhuma.'}"
    ${analysisContext ? `ANÁLISE BIOMECÂNICA (IA): "${technicalAdjustments}"` : ''}
    
    DIRETRIZES DE DESIGN E HTML (LEGIBILIDADE TOTAL):
    1. Estrutura Visual: Padrão "Card/Grid" moderno.
    2. CORES E FONTES:
       - Fundo dos Cards: Branco (bg-white).
       - Texto dos Exercícios: OBRIGATORIAMENTE ESCURO ('text-slate-900').
       - Títulos: Use AZUL ESCURO ou INDIGO ESCURO.
       - Contraste alto é obrigatório.
    3. LINKS DE VÍDEO (OBRIGATÓRIO - BOTÃO YOUTUBE):
       - Para TODO exercício listado na ficha, adicione um botão link ao lado do nome.
       - Texto do link: "🎥 Ver vídeo"
       - URL: "https://www.youtube.com/results?search_query=NOME_DO_EXERCICIO_AQUI"
       - OBRIGATÓRIO: target="_blank" para abrir em nova aba.
       - Estilo (Tailwind): "text-[10px] sm:text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-0.5 rounded-full ml-2 no-underline inline-flex items-center gap-1 transition-colors".
    4. ESTILO DO CARD DE FREQUÊNCIA:
       - Escreva APENAS o número seguido de 'x' (ex: <span class="text-blue-900 font-bold">4x</span>).
    5. Dia de Descanso:
       - Fundo escuro (bg-slate-800). Texto BRANCO.
    
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
    Atue como um Amigo de Treino Motivador.
    
    OBJETIVO: Comparar a execução de HOJE com a ANTERIOR.
    Exercício: ${exerciseType}
    
    HOJE: Score ${currentResult.score}/100.
    ANTERIOR: Score ${previousResult.score}/100.

    INSTRUÇÕES:
    1. Seja muito positivo. Se melhorou, comemore. Se piorou, diga que é normal oscilar e para não desanimar.
    2. Linguagem simples e curta.
    3. Use emojis!
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