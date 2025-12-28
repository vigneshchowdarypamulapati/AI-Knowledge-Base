import { getEmbeddingModel } from '../config/gemini.js';

/**
 * Generate embeddings for text using Gemini
 */

/**
 * Generate embedding for a single text
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Embedding vector
 */
export const generateEmbedding = async (text) => {
  const model = getEmbeddingModel();
  
  const result = await model.embedContent(text);
  return result.embedding.values;
};

/**
 * Generate embeddings for multiple texts in batch
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
export const generateEmbeddings = async (texts) => {
  console.log(`📝 Generating embeddings for ${texts.length} chunks (Gemini)...`);
  
  const model = getEmbeddingModel();
  
  // Process in batches to avoid rate limits
  const BATCH_SIZE = 5; 
  const embeddings = [];
  
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    console.log(`   Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(texts.length/BATCH_SIZE)}...`);
    
    try {
      const batchEmbeddings = await Promise.all(
        batch.map(async (text, idx) => {
          try {
            // Truncate text if too long (Gemini has limits)
            const truncatedText = text.slice(0, 10000);
            const result = await model.embedContent(truncatedText);
            return result.embedding.values;
          } catch (err) {
            console.error(`   ❌ Error embedding chunk ${i + idx}:`, err.message);
            throw err;
          }
        })
      );
      
      embeddings.push(...batchEmbeddings);
    } catch (batchError) {
      console.error(`   ❌ Batch ${Math.floor(i/BATCH_SIZE) + 1} failed:`, batchError.message);
      throw batchError;
    }
    
    // Delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`✅ Successfully generated ${embeddings.length} embeddings`);
  return embeddings;
};

/**
 * Get the dimension of the embedding vector
 * @returns {number} Dimension of embedding vectors
 */
export const getEmbeddingDimension = () => {
  // text-embedding-004 produces 768-dimensional vectors
  return 768;
};

export default { generateEmbedding, generateEmbeddings, getEmbeddingDimension };
