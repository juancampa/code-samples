/**
* Base Agent Class for Driver Generation
* Abstract class that provides common functionality for all generation agents. Manages access 
* to LLM and RAG services, requires implementing execute() method, and provides context
* retrieval utilities for informed generation/validation.
*/

import { LLM } from "./llm";
import { RAG } from "./rag";

export abstract class BaseAgent {
  protected llm: LLM;
  protected rag: RAG;

  constructor(llm: LLM, rag: RAG) {
    this.llm = llm;
    this.rag = rag;
  }

  abstract execute(input: any): Promise<any>;

  protected async getContext(query: string, task: string): Promise<string> {
    return await this.rag.getRelevantContext(query, task);
  }
}