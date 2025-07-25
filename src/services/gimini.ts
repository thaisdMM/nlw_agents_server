import { GoogleGenAI } from '@google/genai'
import { env } from '../env.ts'

const gemini = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
})

const model = 'gemini-2.5-flash'

// se fosse áudios grandes como de uma live:gemini.files.upload ... conferir documentação
export async function transcribeAudio(audioAsBase64: string, mimeType: string) {
  const response = await gemini.models.generateContent({
    model,
    contents: [
      {
        //prompt
        text: 'Transcreva o áudio para português do Brasil. Seja preciso e natural na transcrição. Mantenha a pontuação adequada e divida o texto em parágrafos quando for apropriado. ',
      },
      {
        inlineData: {
          mimeType,
          data: audioAsBase64,
        },
      },
    ],
  })

  if (!response.text) {
    throw new Error('Não foi possível converter o áudio.')
  }

  return response.text
}

export async function generateEmbeddings(text: string) {
  const response = await gemini.models.embedContent({
    model: 'text-embedding-004',
    contents: [{ text }],
    config: {
      taskType: 'RETRIEVAL_DOCUMENT',
    },
  })
  if (!response.embeddings?.[0].values) {
    throw new Error('Não foi possível gerar os embeddings.')
  }
  return response.embeddings[0].values
}

export async function generateAnswer(
  question: string,
  transcriptions: string[]
) {
  const context = transcriptions.join('\n\n')

  const prompt = `
  Com base no texto fornecido abaixo como contexto, responda a pergunta de forma clara e precisa em português do Brasil.
  
  CONTEXTO: 
  ${context}

  PERGUNTA:
  ${question}

  INSTRUÇÕES:
  - Use apenas informações contidas no contexto enviado;
  - Se a pergunta usar as palavras: "gravação", "arquivo", "conteúdo", "conteúdo da sala","sala", "banco de dados" ou palavras similares entenda que o usário está se referindo ao contexto e responda utilizando o contexto, há não ser que exista no contexto essas palavras chaves. Se elas existirem responda com base nelas primeiro e depois se pergunte ao usuário: "Você está se referindo ao contexto das informações do banco dessa sala? Se sim, por favor, reformule a questão utilizando a palavra chave 'contesto'."
  - Se a resposta não for encontrada no contexto, não invente. Apenas responda que não possui informações suficientes para responder;
  - Seja objetivo;
  - Mantenha um tom educativo e profissional;
  - Cite trechos relevantes do contexto se apropriado;
  - Se for citar o contexto, utilize o termo "conteúdo explicito da gravação:";
  `.trim()

  const response = await gemini.models.generateContent({
    model,
    contents: [
      {
        text: prompt,
      },
    ],
  })
  if (!response.text) {
    throw new Error('Falha ao gerar resposta pelo Gemini.')
  }
  return response.text
}
