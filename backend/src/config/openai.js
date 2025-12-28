import OpenAI from 'openai';

let openai = null;

const initializeOpenAI = () => {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  OPENAI_API_KEY not set. AI features will not work.');
    return;
  }

  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  console.log('✅ OpenAI initialized');
};

export const getOpenAIClient = () => {
  if (!openai) {
    throw new Error('OpenAI not initialized. Call initializeOpenAI() first.');
  }
  return openai;
};

export default initializeOpenAI;
