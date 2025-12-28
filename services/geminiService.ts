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

  let prompt = '';

  if (exerciseType === ExerciseType.POSTURE_ANALYSIS) {
    prompt = `
      Atue como um especialista em biomecânica, ergonomia e fisioterapia.
      Analise a POSTURA ESTÁTICA desta pessoa (pode estar de frente, lado ou costas).
      
      Seu trabalho é:
      1. Identificar desvios posturais visíveis (ex: cabeça projetada à frente, ombros caídos, hiperlordose, cifose, pelve desnivelada, etc.).
      2. Avaliar a simetria corporal.
      3. Atribuir uma nota GERAL (0-100) baseada no alinhamento.
      4. Fornecer feedback amigável e construtivo.
      5. Indicar correção: Um hábito simples para o dia a dia.
      6. Músculos: Liste os músculos que precisam ser alongados ou fortalecidos.

      REGRAS:
      - Repetições: Defina SEMPRE como 1.
      - Correção: Use EMOJIS, seja amigável e breve.
      - Exemplo de feedback: "Seu ombro direito parece levemente mais alto que o esquerdo."
      
      Responda EXCLUSIVAMENTE em formato JSON seguindo o schema fornecido.
    `;
  } else if (exerciseType === ExerciseType.BODY_COMPOSITION) {
    prompt = `
      Atue como um nutricionista esportivo e avaliador físico experiente.
      Analise a COMPOSIÇÃO CORPORAL visual desta pessoa.
      
      Seu trabalho é:
      1. Estimar a PORCENTAGEM DE GORDURA (Body Fat %) aproximada visualmente. Coloque este número no campo 'repetitions'.
      2. Identificar o BIOTIPO predominante (Ectomorfo, Mesomorfo, Endomorfo).
      3. Atribuir uma nota de "Estética/Condicionamento Atual" (0-100).
      4. Analisar visualmente onde há maior acúmulo de gordura ou boa definição muscular.
      5. Dar dicas: Onde focar para perder gordura ou ganhar massa (Nutrição + Treino).
      
      REGRAS IMPORTANTES:
      - Campo 'repetitions': Deve conter APENAS o número estimado de % de gordura (ex: 18).
      - Campo 'feedback': Liste: 
          1) O Biotipo Identificado.
          2) Pontos fortes (ex: ombros largos, pernas definidas).
          3) Pontos de atenção (ex: acúmulo abdominal).
      - Campo 'formCorrection': Dica de OURO para o objetivo (ex: "Foque em déficit calórico e cardio HIIT 3x na semana!").
      - Campo 'muscleGroups': Liste as regiões que parecem ter maior definição muscular atualmente.
      
      Seja respeitoso, profissional e motivador. Deixe claro que é uma estimativa visual.
      
      Responda EXCLUSIVAMENTE em formato JSON seguindo o schema fornecido.
    `;
  } else {
    // Standard Exercise Prompt
    prompt = `
      Atue como um treinador profissional de educação física (Personal Trainer) gente boa e motivador.
      Analise este vídeo de uma pessoa realizando o exercício: ${exerciseType}.
      
      Seu trabalho é:
      1. Contar as repetições válidas.
      2. Avaliar a técnica.
      3. Atribuir uma nota GERAL (0-100).
      4. Identificar pontos de feedback.
      5. Fornecer uma correção principal.
      6. Listar grupos musculares.

      IMPORTANTE SOBRE A CORREÇÃO:
      - Deve ser CURTA, DIRETA e AMIGÁVEL (máximo 20 palavras).
      - Use linguagem simples, evite termos técnicos complexos.
      - Use EMOJIS para deixar leve.
      - Exemplo bom: "Tente descer mais o quadril! 📉 Força nas pernas! 🔥"
      - Exemplo ruim: "O indivíduo apresenta flexão insuficiente da articulação do joelho..."

      Responda EXCLUSIVAMENTE em formato JSON seguindo o schema fornecido.
    `;
  }

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
          score: { type: Type.NUMBER, description: "Nota GERAL de 0 a 100 para a execução, postura ou estética." },
          repetitions: { type: Type.NUMBER, description: "Número de repetições (ou 1 para postura, ou % de gordura para corporal)." },
          feedback: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                message: { type: Type.STRING, description: "Descrição curta do aspecto observado." },
                score: { type: Type.NUMBER, description: "Nota de 0 a 100 específica para este aspecto." }
              },
              required: ["message", "score"]
            },
            description: "Lista de pontos observados." 
          },
          formCorrection: { type: Type.STRING, description: "Dica curta, motivadora e com emojis sobre como melhorar." },
          muscleGroups: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Lista dos músculos ativados ou que precisam de atenção." 
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

export const generateExerciseThumbnail = async (exerciseName: string): Promise<string> => {
  const prompt = `
    Professional fitness photography of a fit person performing the ${exerciseName} exercise correctly.
    Modern gym environment with cinematic blue and purple neon lighting.
    High resolution, 4k, dramatic angle, highly detailed, motivational sports photography.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: "4:3",
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("Não foi possível gerar a imagem.");
};