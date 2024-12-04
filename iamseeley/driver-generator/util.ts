import { state, nodes } from "membrane";
import { VectorEntry } from "./types";
import { LLM } from "./llm";



// Query vectors and return top N matches
export function query(
  topN: number,
  queryVector: number[],
  namespace: string
): Array<{ id: string; score: number; vectorEntry: VectorEntry }> {
  const namespaceVectors = state.context[namespace] as Record<string, VectorEntry>;
  if (!namespaceVectors || Object.keys(namespaceVectors).length === 0) {
    console.error(`No vectors found for namespace: ${namespace}`);
    return [];
  }

  const scores = Object.entries(namespaceVectors).map(([id, vectorEntry]) => {
    const score = cosineSimilarity(queryVector, vectorEntry.vector);
    return { id, score, vectorEntry: vectorEntry as VectorEntry };
  });

  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, topN);
}

// Calculate cosine similarity between two vectors
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error("Vectors must have the same length");
  }
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }
  const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

// Chunk content based on token limit
export function chunkContent(content: string, maxTokensPerChunk: number = 8000): string[] {
  const paragraphs = content.split('\n\n').filter(chunk => chunk.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = "";
  let currentChunkTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokenCount(paragraph);
    
    if (currentChunkTokens + paragraphTokens > maxTokensPerChunk) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
        currentChunkTokens = 0;
      }
      
      // If a single paragraph exceeds the limit, split it
      if (paragraphTokens > maxTokensPerChunk) {
        const words = paragraph.split(/\s+/);
        let tempChunk = "";
        let tempChunkTokens = 0;
        
        for (const word of words) {
          const wordTokens = estimateTokenCount(word);
          if (tempChunkTokens + wordTokens > maxTokensPerChunk) {
            chunks.push(tempChunk.trim());
            tempChunk = "";
            tempChunkTokens = 0;
          }
          tempChunk += word + " ";
          tempChunkTokens += wordTokens;
        }
        
        if (tempChunk) {
          chunks.push(tempChunk.trim());
        }
      } else {
        chunks.push(paragraph);
      }
    } else {
      currentChunk += paragraph + "\n\n";
      currentChunkTokens += paragraphTokens;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Sanitize input text
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  // Trim leading and trailing whitespace
  let sanitized = input.trim();

  return sanitized;
}

export function sanitizeCodeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Trim leading and trailing whitespace
  let sanitized = input.trim();

  // const maxLength = 100000; // Adjust as needed
  // sanitized = sanitized.slice(0, maxLength);

  return sanitized;
}

// Simple token count estimation
export function estimateTokenCount(text: string): number {
  return text.split(/\s+/).length;
}
