import { getGroqClient } from '../config/groq.js';
import { findSimilarChunks } from './vectorService.js';

/**
 * RAG (Retrieval-Augmented Generation) Pipeline
 * Retrieves relevant context and generates grounded answers
 */

const SYSTEM_PROMPT = `You are a helpful AI assistant that answers questions based on the provided context from the user's documents. 

Instructions:
1. ONLY use information from the provided context to answer questions
2. If the context doesn't contain relevant information, say "I couldn't find relevant information in your documents"
3. Answer the user's question DIRECTLY. Do NOT start with "Based on the provided context..." or "According to the documents...".
4. Do NOT mention specific source filenames, 'Source 1', or 'Source IDs' in your final answer.
5. When the user asks for specific information like lists, skills, or structured data, QUOTE the exact content from the documents word-for-word, preserving the original bullet points, line breaks, and formatting.
6. Format your response using markdown: use bullet points (- or •), numbered lists, and line breaks to make the information clear and readable.`;

/**
 * Generate a RAG response
 * @param {string} query - User's question
 * @param {string} userId - User ID
 * @param {string[]} documentIds - Optional document IDs to search in
 * @param {number} topK - Number of context chunks to retrieve
 * @returns {Promise<Object>} Answer with sources
 */
export const generateRAGResponse = async (query, userId, documentIds = null, topK = 5) => {
  // Retrieve relevant chunks
  let relevantChunks = [];
  try {
    relevantChunks = await findSimilarChunks(query, userId, documentIds, topK);
  } catch (error) {
    console.error('Retrieval/Embedding Error:', error);
    return {
      answer: `I encountered an error searching your documents: ${error.message}.\n\nThis usually means there is an issue with the Embedding Service (Gemini).`,
      sources: [],
      hasContext: false
    };
  }
  
  if (relevantChunks.length === 0) {
    return {
      answer: "I couldn't find any relevant information in your documents. Please make sure you've uploaded documents and they've been processed.",
      sources: [],
      hasContext: false
    };
  }
  
  // Build context from chunks
  const context = relevantChunks.map(chunk => 
    `--- Document Context from: ${chunk.documentName} ---\n${chunk.text}`
  ).join('\n\n');
  
  // Build the prompt
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Context from user's documents:\n${context}\n\n---\n\nUser's Question: ${query}\n\nPlease provide a helpful answer based on the context above:` }
  ];

  // Generate response with Groq
  const groq = getGroqClient();
  let answer = '';
  
  try {
    const completion = await groq.chat.completions.create({
      messages: messages,
      model: "llama-3.3-70b-versatile", // Using Llama 3.3 70B (Versatile)
    });
    
    answer = completion.choices[0].message.content;
  } catch (error) {
    console.error('Groq Generation Error:', error);
    answer = `I encountered an error connecting to the AI model: ${error.message}. \n\nPlease check your GROQ_API_KEY environment variable.`;
  }
  
  // Prepare sources for citation
  const sources = relevantChunks.map(chunk => ({
    documentId: chunk.documentId,
    documentName: chunk.documentName,
    chunkText: chunk.text.substring(0, 200) + (chunk.text.length > 200 ? '...' : ''),
    similarity: Math.round(chunk.similarity * 100) / 100
  }));
  
  return {
    answer,
    sources,
    hasContext: true
  };
};

/**
 * Generate a streaming RAG response
 * @param {string} query - User's question
 * @param {string} userId - User ID
 * @param {string[]} documentIds - Optional document IDs
 * @param {Array} conversationHistory - Previous messages in the chat
 * @returns {AsyncGenerator} Streaming response
 */
export async function* generateStreamingRAGResponse(query, userId, documentIds = null, conversationHistory = []) {
  const relevantChunks = await findSimilarChunks(query, userId, documentIds, 5);
  
  if (relevantChunks.length === 0) {
    yield {
      type: 'answer',
      content: "I couldn't find any relevant information in your documents."
    };
    return;
  }
  
  // Yield sources first
  yield {
    type: 'sources',
    content: relevantChunks.map(chunk => ({
      documentId: chunk.documentId,
      documentName: chunk.documentName,
      chunkText: chunk.text.substring(0, 200) + '...',
      similarity: chunk.similarity
    }))
  };
  
  const context = relevantChunks.map(chunk => 
    `--- Document Context from: ${chunk.documentName} ---\n${chunk.text}`
  ).join('\n\n');
  
  // Build messages with conversation history
  const messages = [
    { role: "system", content: SYSTEM_PROMPT }
  ];
  
  // Add conversation history (limit to last 10 messages to avoid token overflow)
  const recentHistory = conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }
  
  // Add current context and question
  messages.push({ role: "user", content: `Context from documents:\n${context}\n\nQuestion: ${query}` });

  const groq = getGroqClient();
  
  try {
    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: messages,
      stream: true,
    });
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield {
          type: 'answer',
          content: content
        };
      }
    }
  } catch (error) {
    console.error('Groq Streaming Error:', error);
    yield {
      type: 'answer',
      content: `Error: ${error.message}`
    };
  }
}

export default { generateRAGResponse, generateStreamingRAGResponse };
