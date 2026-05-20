import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;
let embeddingModel = null;

const initializeGemini = () => {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY not set. Embedding features will not work.');
    return;
  }

  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
  
  console.log('✅ Gemini (Embeddings) initialized');
};

export const getEmbeddingModel = () => {
  if (!embeddingModel) {
    initializeGemini();
    if (!embeddingModel) throw new Error('Gemini embedding model not initialized. Check GEMINI_API_KEY.');
  }
  return embeddingModel;
};

export default initializeGemini;
