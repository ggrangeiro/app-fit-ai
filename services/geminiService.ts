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
export const analyzeVideo = async (files: File | File[], exerciseType: ExerciseType, previousAnalysis?: AnalysisResult | null): Promise<AnalysisResult> => {
  const fileArray = Array.isArray(files) ? files : [files];
  const mediaParts = await Promise.all(fileArray.map(fileToGenerativePart));

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
    specificContext = `
      Análise Postural COMPLETA: Analise TODAS as imagens fornecidas (Frente, Lado, Costas) em conjunto.
      - Identifique desvios posturais visíveis (hiperlordose, cifose, escoliose, desnivelamento de ombros/quadril).
      - Diga se a pessoa está alinhada ou se precisa de correções específicas.
    `;
  } else if (isBodyComp) {
    specificContext = `
      Contexto: Avaliação Visual do Corpo (Body Composition) com múltiplas visualizações.
      Instrução: Analise o físico como um todo considerando todas as fotos.
      - Estime o biotipo e a gordura corporal aproximada com base no conjunto.
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
      ...mediaParts.map(part => ({ inlineData: part.inlineData })),
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
export const generateDietPlan = async (userData: any, documentFile?: File | null, photoFile?: File | null): Promise<string> => {
  const model = genAI.getGenerativeModel({ model: SUPPORT_MODEL });

  const prompt = `
    Atue como um Nutricionista Esportivo. Perfil: ${userData.weight}kg, Objetivo: ${userData.goal}, Sexo: ${userData.gender}.
    ${userData.observations ? `Observações Adicionais: ${userData.observations}` : ''}
    
    INSTRUÇÕES IMPORTANTES:
    - Se você recebeu fotos ou documentos (exames, prescrições) anexos, ANALISE-OS CUIDADOSAMENTE.
    - Considere as condições físicas visíveis na foto e os dados clínicos do documento para personalizar a dieta.
    
    Crie um plano alimentar semanal visualmente incrível.
    REGRAS DE DESIGN:
    1. Use LAYOUT DE CARDS modernos com Tailwind (bg-white, rounded-2xl, shadow-sm). NÃO use tabelas.
    2. CORES: Texto principal OBRIGATORIAMENTE ESCURO (text-slate-900). Títulos em 'text-emerald-800'.
    3. Badge vibrante para cada refeição. Domingo com card 'bg-slate-800' e texto branco.
    4. O output deve ser APENAS o código HTML interno.
  `;

  try {
    const parts: any[] = [{ text: prompt }];

    if (documentFile) {
      const docPart = await fileToGenerativePart(documentFile);
      parts.push(docPart);
    }

    if (photoFile) {
      const photoPart = await fileToGenerativePart(photoFile);
      parts.push(photoPart);
    }

    const result = await model.generateContent(parts);
    return result.response.text().replace(/```html|```/g, "").trim();
  } catch (e) {
    console.error("Erro ao gerar dieta:", e);
    return "<p>Erro ao gerar dieta.</p>";
  }
};

// --- GERAÇÃO DE TREINO (LAYOUT REFINADO) ---
/**
 * Gera um plano de treino personalizado baseado nos dados do usuário.
 * userData espera: { weight, height, gender, goal, level, frequency, observations }
 */
export const generateWorkoutPlan = async (userData: any, documentFile?: File | null, photoFile?: File | null): Promise<string> => {
  const model = genAI.getGenerativeModel({ model: SUPPORT_MODEL });
  const prompt = `
    Atue como um Personal Trainer Especialista e Motivador.
    PERFIL DO ALUNO:
    - Sexo: ${userData.gender}
    - Peso: ${userData.weight}kg
    - Altura: ${userData.height}cm
    - Objetivo: ${userData.goal}
    - Nível de Experiência: ${userData.level}
    - Frequência Semanal: ${userData.frequency}x
    - Observações/Restrições: ${userData.observations || 'Nenhuma'}

    INSTRUÇÕES IMPORTANTES:
    - Se você recebeu fotos ou documentos (avaliações físicas, exames) anexos, ANALISE-OS CUIDADOSAMENTE.
    - Considere as condições físicas visíveis na foto e as restrições ou dados do documento para personalizar o treino.

    Crie um plano de treino semanal em HTML usando um sistema de CARDS modernos com Tailwind CSS.
    
    REGRAS DE LAYOUT E CONTEÚDO:
    1. O estilo deve ser PREMIUM e LIMPO. Use cards brancos com sombra suave.
    2. TEXTO DOS EXERCÍCIOS: OBRIGATORIAMENTE ESCURO (text-slate-900) para máxima legibilidade.
    3. Para cada exercício, inclua OBRIGATORIAMENTE: Nome, Séries x Repetições, Tempo de Descanso (ex: 60s ou 90s) e uma breve dica técnica.
    4. Adicione um BOTÃO YOUTUBE para cada exercício:
       <a href="https://www.youtube.com/results?search_query=como+fazer+${encodeURIComponent(userData.gender)}+${encodeURIComponent(userData.goal)}+${encodeURIComponent('exercicio')}" target="_blank" class="text-red-600 bg-red-50 px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1 hover:bg-red-100 transition-colors mt-2">🎥 Ver técnica no YouTube</a>
    5. Dias de descanso (OFF) devem ter um card com fundo escuro (bg-slate-800) e texto claro.
    6. Personalize o volume e a escolha de exercícios considerando o sexo (${userData.gender}) e o objetivo (${userData.goal}).
    7. Output APENAS o código HTML interno da <div> principal.
  `;

  try {
    const parts: any[] = [{ text: prompt }];

    if (documentFile) {
      const docPart = await fileToGenerativePart(documentFile);
      parts.push(docPart);
    }

    if (photoFile) {
      const photoPart = await fileToGenerativePart(photoFile);
      parts.push(photoPart);
    }

    const result = await model.generateContent(parts);
    return result.response.text().replace(/```html|```/g, "").trim();
  } catch (e) {
    console.error("Erro ao gerar treino:", e);
    return "<p>Erro ao gerar treino.</p>";
  }
};

// --- REGENERAÇÃO DE TREINO COM FEEDBACK ---
/**
 * Regenera um plano de treino existente aplicando o feedback do Personal Trainer.
 * Não altera partes não mencionadas no feedback.
 * @param currentWorkoutHtml - O HTML do treino atual
 * @param feedback - Texto livre com as alterações desejadas
 * @param userData - Dados originais do aluno (peso, altura, objetivo, etc.)
 */
export const regenerateWorkoutPlan = async (
  currentWorkoutHtml: string,
  feedback: string,
  userData: any
): Promise<string> => {
  const model = genAI.getGenerativeModel({ model: SUPPORT_MODEL });

  const prompt = `
    Atue como um Personal Trainer Especialista.
    
    CONTEXTO ORIGINAL DO ALUNO:
    - Sexo: ${userData.gender || 'não informado'}
    - Peso: ${userData.weight || 'não informado'}kg
    - Altura: ${userData.height || 'não informado'}cm
    - Objetivo: ${userData.goal || 'não informado'}
    - Nível de Experiência: ${userData.level || 'não informado'}
    - Frequência Semanal: ${userData.frequency || 'não informado'}x
    - Observações/Restrições: ${userData.observations || 'Nenhuma'}

    TREINO ATUAL (HTML):
    ${currentWorkoutHtml}

    FEEDBACK DO PERSONAL TRAINER:
    "${feedback}"

    INSTRUÇÕES DE REGENERAÇÃO:
    1. LEIA o HTML do treino atual com atenção.
    2. APLIQUE APENAS as alterações solicitadas no feedback acima.
    3. NÃO ALTERE exercícios, dias ou configurações que o Personal NÃO mencionou no feedback.
    4. MANTENHA RIGOROSAMENTE a mesma estrutura visual (classes Tailwind, cards, cores).
    5. MANTENHA os botões de YouTube para cada exercício.
    6. Dias de descanso (OFF) devem continuar com fundo escuro (bg-slate-800).
    7. Output APENAS o código HTML interno atualizado.
  `;

  try {
    const result = await model.generateContent([{ text: prompt }]);
    return result.response.text().replace(/```html|```/g, "").trim();
  } catch (e) {
    console.error("Erro ao regenerar treino:", e);
    return "<p>Erro ao regenerar treino.</p>";
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