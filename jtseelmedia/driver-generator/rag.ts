import { state, nodes } from "membrane";
import { chunkContent, query as VectorQuery, sanitizeInput } from "./util";
import { EmbeddingData, VectorEntry } from "./types";



export class RAG {

  // Add context to the index
  async addToIndex(namespace: string, identifier: string, data: { title: string, content: string, relatedContent?: string }) {
    if (!state.context[namespace]) {
      state.context[namespace] = {};
    }
  
    const sanitizedContent = sanitizeInput(data.content);
    const chunks = chunkContent(sanitizedContent);
    const newEntries: Record<string, VectorEntry> = {};
    
    for (const [index, chunk] of chunks.entries()) {
      const embedding = await this.createEmbedding(chunk);
      if (embedding && embedding.length > 0) {
        const id = `${identifier}_${Date.now()}_${index}`;
        const vectorMag = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        newEntries[id] = {
          id,
          vector: embedding,
          vectorMag,
          metadata: { 
            content: chunk,
            title: data.title,
            identifier: identifier,
            relatedContent: data.relatedContent
          }
        };
      }
    }

    if (Object.keys(newEntries).length > 0) {
      this.upsert(newEntries, namespace);
      console.log(`Added ${Object.keys(newEntries).length} entries to ${namespace} for ${identifier}`);
    } else {
      console.error(`No valid entries created for ${identifier} in ${namespace}`);
    }
  }



  // Retrieve relevant context baed on a query and a task
  async getRelevantContext(query: string, task: string): Promise<string> {
    const sanitizedQuery = sanitizeInput(query);
    const queryEmbedding = await this.createEmbedding(sanitizedQuery);
    if (!queryEmbedding) return "";
  
    const taskSpecificNamespaces = this.getTaskSpecificNamespaces(task);
    const contextParts: string[] = [];
  
    for (const [namespace, weight] of Object.entries(taskSpecificNamespaces)) {
      const results = await this.searchInNamespaceWithWeight(namespace, queryEmbedding, weight);
      if (results.length > 0) {
        const formattedResults = results.map(result => 
          `ID: ${result.id}\nScore: ${result.score.toFixed(4)}\nContent: ${result.content}`
        ).join('\n\n');
        contextParts.push(`${namespace.charAt(0).toUpperCase() + namespace.slice(1)}:\n${formattedResults}`);
      }
    }
  
    return contextParts.join('\n\n');
  }

  // Determine task-specific namespaces and weights
  private getTaskSpecificNamespaces(task: string): Record<string, number> {
    switch(task) {
      case "api_analysis":
        return { "membrane_docs": 0.3, "driver_code": 0.3, "schema_examples": 0.4 };
      case "schema_design":
        return { "membrane_docs": 0.3, "schema_examples": 0.4, "driver_code": 0.3 };
      case "code_generation":
        return { "membrane_docs": 0.2, "driver_code": 0.5, "schema_examples": 0.3 };
      default:
        return { "membrane_docs": 0.4, "driver_code": 0.6 };
    }
  }

  // Search within a namespace and apply weight to results
  private async searchInNamespaceWithWeight(namespace: string, queryEmbedding: number[], weight: number): Promise<Array<{ id: string; score: number; content: string }>> {
    // Went from returning the top 5 results to a single top result because of rate limits
    
    const results = VectorQuery(2, queryEmbedding, namespace);
    return results.map(result => {
      if (!result || !result.vectorEntry || !result.vectorEntry.metadata) {
        console.error(`Invalid result structure:`, result);
        return { id: '', score: 0, content: '' };
      }

      const { content, relatedContent } = result.vectorEntry.metadata;
      const weightedScore = result.score * weight;  // Adjust the score by the weight
      return { 
        id: result.id, 
        score: weightedScore,  // Apply the weight to the score
        content: `${content || ''}${relatedContent ? `\n\nRelated Content:\n${relatedContent}` : ''}` 
      };
    }).filter(result => result.content !== '');  // Filter out empty content results
  }



  // Create embeddings using OpenAI's API
  private async createEmbedding(text: string): Promise<number[] | null> {
    try {
      const modelId = "text-embedding-3-large";
      const dataArray = await nodes.openai.models
        .one({ id: modelId })
        .createEmbeddings({ input: text }) as unknown as EmbeddingData[];

      return dataArray[0].embedding;
    } catch (error) {
      console.error(`Error creating embedding: ${error}`);
      return null;
    }
  }

  // Upsert entries into the state context
  private upsert(entries: Record<string, VectorEntry>, namespace: string) {
    if (!state.context[namespace]) {
      state.context[namespace] = {};
    }
    
    for (const [id, entry] of Object.entries(entries)) {
      state.context[namespace][id] = entry;
    }
  }
}