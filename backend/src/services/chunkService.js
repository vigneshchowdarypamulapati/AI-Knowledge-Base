/**
 * Chunk text into smaller segments for embedding
 * Uses sliding window approach with overlap for context preservation
 */

const DEFAULT_CHUNK_SIZE = 800;  // characters
const DEFAULT_OVERLAP = 200;     // characters overlap between chunks

/**
 * Split text into semantic chunks
 * @param {string} text - The full document text
 * @param {number} chunkSize - Maximum characters per chunk
 * @param {number} overlap - Overlap between consecutive chunks
 * @returns {Array} Array of chunk objects
 */
export const chunkText = (text, chunkSize = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_OVERLAP) => {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Clean the text
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const chunks = [];
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < cleanedText.length) {
    let endIndex = startIndex + chunkSize;
    
    // If we're not at the end, try to break at a sentence or paragraph boundary
    if (endIndex < cleanedText.length) {
      // Look for natural break points (sentence end, paragraph)
      const searchStart = Math.max(startIndex + chunkSize - 100, startIndex);
      const searchText = cleanedText.slice(searchStart, endIndex + 50);
      
      // Priority: paragraph > sentence > word boundary
      const paragraphBreak = searchText.lastIndexOf('\n\n');
      const sentenceBreak = Math.max(
        searchText.lastIndexOf('. '),
        searchText.lastIndexOf('! '),
        searchText.lastIndexOf('? ')
      );
      const wordBreak = searchText.lastIndexOf(' ');
      
      if (paragraphBreak > 50) {
        endIndex = searchStart + paragraphBreak + 2;
      } else if (sentenceBreak > 0) {
        endIndex = searchStart + sentenceBreak + 2;
      } else if (wordBreak > 0) {
        endIndex = searchStart + wordBreak + 1;
      }
    } else {
      endIndex = cleanedText.length;
    }

    const chunkText = cleanedText.slice(startIndex, endIndex).trim();
    
    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        chunkIndex,
        startChar: startIndex,
        endChar: endIndex,
        metadata: {
          wordCount: chunkText.split(/\s+/).filter(Boolean).length,
          charCount: chunkText.length
        }
      });
      chunkIndex++;
    }

    // Move start position, accounting for overlap
    // If we reached the end of the text, stop
    if (endIndex >= cleanedText.length) {
      break;
    }

    startIndex = endIndex - overlap;
    
    // Prevent infinite loop - ensure we always move forward
    if (startIndex <= chunks[chunks.length - 1].startChar) {
       startIndex = chunks[chunks.length - 1].startChar + 1;
    }
  }

  return chunks;
};

/**
 * Estimate the number of chunks for a given text
 */
export const estimateChunkCount = (text, chunkSize = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_OVERLAP) => {
  if (!text) return 0;
  const effectiveChunkSize = chunkSize - overlap;
  return Math.ceil(text.length / effectiveChunkSize);
};

export default { chunkText, estimateChunkCount };
