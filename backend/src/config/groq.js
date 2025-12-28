import Groq from 'groq-sdk';

let groq = null;

const initializeGroq = () => {
  if (!process.env.GROQ_API_KEY) {
    console.warn('⚠️  GROQ_API_KEY not set. Chat features will not work.');
    return;
  }

  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
  
  console.log('✅ Groq (Llama 3) initialized');
};

export const getGroqClient = () => {
  if (!groq) {
    // Auto-initialize if not done yet
    initializeGroq();
    if (!groq) throw new Error('Groq not initialized. Check GROQ_API_KEY.');
  }
  return groq;
};

export default initializeGroq;
