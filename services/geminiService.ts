import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { AnalysisResult, ExerciseType, SPECIAL_EXERCISES } from "../types";

// --- CONFIGURAÇÃO ---
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

// Configuração dos modelos: Pro para tarefas complexas (vídeo) e Flash para suporte
const ANALYSIS_MODEL = "gemini-3-pro-preview";
const SUPPORT_MODEL = "gemini-3-flash-preview";

// --- UTILITÁRIOS ---
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      const base64Content = base64data.split(',')[1];
      resolve({ inlineData: { data: base64Content, mimeType: file.type } });
    };
    reader.onerror = (e) => reject(new Error("Falha ao ler arquivo: " + e));
    reader.readAsDataURL(file);
  });
};

// --- ANÁLISE DE VÍDEO (PROMPTS REFINADOS) ---
export const analyzeVideo = async (file: File, exerciseType: ExerciseType, previousAnalysis?: AnalysisResult | null): Promise<AnalysisResult> => {
  const mediaPart = await fileToGenerativePart(file);

  // 1. Definição de Persona e Estilo (Detailed Style)
  const detailedStyle = `
    VOCÊ É UM PERSONAL TRAINER PARCEIRO, EXTREMAMENTE AMIGÁVEL E DIDÁTICO.
    Seu aluno é um INICIANTE completo. Seu objetivo é motivá-lo enquanto corrige a postura com carinho.
    - NÃO use termos técnicos complexos sem explicar (ex: diga "joelho para dentro" em vez de "valgo").
    - Use EMOJIS (😃💪✨) e linguagem acolhedora.
    - Na 'formCorrection', pareça um amigo experiente: "Olha, você mandou bem! Só cuidado com a coluna..."
  `;

  // 2. Regras de Validação
  let validationRules = exerciseType === SPECIAL_EXERCISES.FREE_MODE
    ? "Identifique qualquer exercício fitness. Se não houver exercício claro, isValidContent: false."
    : `Valide se o vídeo contém um humano realizando "${exerciseType}". Se for outro esporte ou inválido, isValidContent: false.`;

  // 3. Contexto Histórico
  let historyContext = previousAnalysis
    ? `CONTEXTO: O usuário tirou nota ${previousAnalysis.score} anteriormente. Erros passados: ${previousAnalysis.improvements?.map(i => i.instruction).join("; ")}.`
    : "";

  // 4. Prompt Específico por Tipo (Lógica Inteligente)
  const lowerType = exerciseType.toLowerCase();

  const isBodyComp =
    exerciseType === SPECIAL_EXERCISES.BODY_COMPOSITION ||
    lowerType.includes('gordura') ||
    lowerType.includes('corporal') ||
    lowerType.includes('biotipo') ||
    lowerType.includes('composição');

  const isPosture =
    exerciseType === SPECIAL_EXERCISES.POSTURE ||
    lowerType.includes('postura') ||
    lowerType.includes('posture');

  let specificContext = "";

  if (isPosture) {
    specificContext = "Análise Postural: Diga se a pessoa está curvada ou alinhada no dia a dia.";
  } else if (isBodyComp) {
    specificContext = `
      Contexto: Avaliação Visual do Corpo (Body Composition).
      Instrução: Estime o biotipo e a gordura corporal aproximada.
      IMPORTANTE: Preencha "repetitions" com a % de gordura estimada (ex: 18).
    `;
  } else {
    specificContext = `Analise a execução do exercício "${exerciseType}" focando na segurança do iniciante.`;
  }

  const prompt = `
    ${detailedStyle}
    ${validationRules}
    ${historyContext}
    ${specificContext}

    Responda EXCLUSIVAMENTE em formato JSON seguindo rigorosamente esta estrutura:
    {
      "isValidContent": boolean,
      "validationError": string (se inválido),
      "score": number (0-100),
      "repetitions": number,
      "gender": "masculino" | "feminino",
      "identifiedExercise": string,
      "strengths": string[],
      "improvements": [{"instruction": string, "detail": string}],
      "feedback": [{"message": string, "score": number}],
      "formCorrection": string (Texto amigável e motivador),
      "muscleGroups": string[]
    }
  `;

  try {
    const model = genAI.getGenerativeModel({
      model: ANALYSIS_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent([
      { inlineData: mediaPart.inlineData },
      { text: prompt }
    ]);

    const text = result.response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error("Erro na análise Gemini:", error);
    throw new Error("Não consegui analisar o vídeo agora. Tente novamente!");
  }
};

// --- GERAÇÃO DE DIETA (LAYOUT REFINADO) ---
export const generateDietPlan = async (userData: any): Promise<string> => {
  const model = genAI.getGenerativeModel({ model: SUPPORT_MODEL });
  const prompt = `
    Atue como um Nutricionista Esportivo. Perfil: ${userData.weight}kg, Objetivo: ${userData.goal}, Sexo: ${userData.gender}.
    Crie um plano alimentar semanal visualmente incrível.
    REGRAS DE DESIGN:
    1. Use LAYOUT DE CARDS modernos com Tailwind (bg-white, rounded-2xl, shadow-sm). NÃO use tabelas.
    2. CORES: Texto principal OBRIGATORIAMENTE ESCURO (text-slate-900). Títulos em 'text-emerald-800'.
    3. Badge vibrante para cada refeição. Domingo com card 'bg-slate-800' e texto branco.
    4. O output deve ser APENAS o código HTML interno.
  `;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().replace(/```html|```/g, "").trim();
  } catch (e) {
    return "<p>Erro ao gerar dieta.</p>";
  }
};

// --- GERAÇÃO DE TREINO (LAYOUT REFINADO) ---
export const generateWorkoutPlan = async (userData: any): Promise<string> => {
  const model = genAI.getGenerativeModel({ model: SUPPORT_MODEL });
  const prompt = `
    Atue como um Personal Trainer Motivador. Objetivo: ${userData.goal}, Nível: ${userData.level}.
    Crie um plano de treino em HTML usando sistema de CARDS.
    REGRAS:
    1. Texto dos exercícios OBRIGATORIAMENTE ESCURO (text-slate-900) em cards brancos.
    2. Adicione um BOTÃO YOUTUBE para cada exercício:
       <a href="https://www.youtube.com/results?search_query=NOME_DO_EXERCICIO" target="_blank" class="text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-bold">🎥 Ver vídeo</a>
    3. Dia de descanso em card escuro (bg-slate-800).
    4. Output apenas o código HTML interno.
  `;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().replace(/```html|```/g, "").trim();
  } catch (e) {
    return "<p>Erro ao gerar treino.</p>";
  }
};

// --- INSIGHT DE PROGRESSO ---
export const generateProgressInsight = async (current: any, previous: any, type: string): Promise<string> => {
  const model = genAI.getGenerativeModel({ model: SUPPORT_MODEL });
  const prompt = `
    Atue como um Amigo de Treino. Compare hoje (Nota ${current.score}) com a anterior (Nota ${previous.score}) no exercício ${type}.
    Seja muito positivo, use emojis e seja curto (máximo 3 frases).
  `;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    return "Continue assim! Cada treino conta para sua evolução. 💪";
  }
};

// --- THUMBNAIL (FALLBACK ELEGANTE) ---
export const generateExerciseThumbnail = async (exerciseName: string): Promise<string> => {
  // Como o Gemini texto não gera binário direto aqui, usamos um Unsplash dinâmico baseado no nome
  const query = encodeURIComponent(exerciseName + " exercise gym");
  return `https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1000&auto=format&fit=crop&exercise=${query}`;
};