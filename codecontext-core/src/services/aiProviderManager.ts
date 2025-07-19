/**
 * AI Provider Manager - The Ultimate AI Integration System
 * Supports Claude, GPT, and any future AI provider
 * With persistent memory and execution capabilities
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { MemoryEngine } from './memoryEngine';
import { ExecutionEngine } from './mockExecutionEngine';

export interface AIProvider {
  name: string;
  model: string;
  apiKey: string;
  capabilities: AICapability[];
}

export interface AICapability {
  type: 'chat' | 'code_generation' | 'code_analysis' | 'debugging';
  supportedLanguages: string[];
  maxTokens: number;
}

export interface EnhancedAIRequest {
  message: string;
  projectContext?: ProjectContext;
  codeContext?: string[];
  executionRequired?: boolean;
  memoryRetrieval?: boolean;
}

export interface EnhancedAIResponse {
  response: string;
  code?: GeneratedCode[];
  executionResults?: ExecutionResult[];
  memoryUpdates?: MemoryUpdate[];
  confidence: number;
  reasoning: string;
}

export interface GeneratedCode {
  language: string;
  code: string;
  filePath?: string;
  description: string;
  tests?: string[];
}

export interface ProjectContext {
  projectId: string;
  workingDirectory: string;
  techStack: string[];
  recentChanges: FileChange[];
  dependencies: Record<string, string>;
}

export class AIProviderManager {
  private anthropic: Anthropic | null = null;
  private openai: OpenAI | null = null;
  private memoryEngine: MemoryEngine;
  private executionEngine: ExecutionEngine;
  private activeProvider: 'claude' | 'gpt' | null = null;

  constructor(memoryEngine: MemoryEngine, executionEngine: ExecutionEngine) {
    this.memoryEngine = memoryEngine;
    this.executionEngine = executionEngine;
  }

  /**
   * Initialize AI providers with API keys
   */
  async initializeProviders(config: {
    anthropicKey?: string;
    openaiKey?: string;
    defaultProvider: 'claude' | 'gpt';
  }): Promise<void> {
    if (config.anthropicKey) {
      this.anthropic = new Anthropic({
        apiKey: config.anthropicKey
      });
      console.log('🤖 Claude initialized successfully');
    }

    if (config.openaiKey) {
      this.openai = new OpenAI({
        apiKey: config.openaiKey
      });
      console.log('🤖 GPT initialized successfully');
    }

    this.activeProvider = config.defaultProvider;
    console.log(`🚀 Active AI provider: ${this.activeProvider}`);
  }

  /**
   * Enhanced AI chat with memory and execution
   */
  async enhancedChat(request: EnhancedAIRequest): Promise<EnhancedAIResponse> {
    console.log('🧠 Starting enhanced AI chat...');

    // 1. Retrieve relevant memories
    let memories: any[] = [];
    if (request.memoryRetrieval !== false) {
      memories = await this.memoryEngine.recall(request.message, request.projectContext?.projectId);
      console.log(`📚 Retrieved ${memories.length} relevant memories`);
    }

    // 2. Build enhanced context
    const enhancedContext = this.buildEnhancedContext(request, memories);

    // 3. Send to AI with full context
    const aiResponse = await this.sendToAI(request.message, enhancedContext);

    // 4. Parse and extract code if present
    const parsedResponse = this.parseAIResponse(aiResponse);

    // 5. Execute code if requested and code is present
    let executionResults: ExecutionResult[] = [];
    if (request.executionRequired && parsedResponse.code.length > 0) {
      console.log('🚀 Executing generated code...');
      for (const codeBlock of parsedResponse.code) {
        try {
          const result = await this.executionEngine.executeCode({
            id: `ai-generated-${Date.now()}`,
            language: codeBlock.language as any,
            code: codeBlock.code,
            projectContext: request.projectContext
          });
          executionResults.push(result);
          console.log(`✅ Code execution successful: ${codeBlock.description}`);
        } catch (error) {
          console.error(`❌ Code execution failed: ${error}`);
          executionResults.push({
            id: `failed-${Date.now()}`,
            success: false,
            output: '',
            errors: [error instanceof Error ? error.message : String(error)],
            exitCode: 1,
            executionTime: 0,
            memoryUsage: 0
          });
        }
      }
    }

    // 6. Store conversation and results in memory
    const memoryUpdates = await this.updateMemory(request, parsedResponse, executionResults);

    return {
      response: parsedResponse.response,
      code: parsedResponse.code,
      executionResults,
      memoryUpdates,
      confidence: this.calculateConfidence(parsedResponse, executionResults),
      reasoning: this.generateReasoning(memories, executionResults)
    };
  }

  /**
   * Switch AI provider on the fly
   */
  async switchProvider(provider: 'claude' | 'gpt'): Promise<void> {
    if (provider === 'claude' && !this.anthropic) {
      throw new Error('Claude not initialized. Please provide Anthropic API key.');
    }
    if (provider === 'gpt' && !this.openai) {
      throw new Error('GPT not initialized. Please provide OpenAI API key.');
    }

    this.activeProvider = provider;
    console.log(`🔄 Switched to ${provider.toUpperCase()}`);
  }

  /**
   * Compare responses from multiple providers
   */
  async compareProviders(request: EnhancedAIRequest): Promise<{
    claude?: EnhancedAIResponse;
    gpt?: EnhancedAIResponse;
    recommendation: 'claude' | 'gpt';
    reasoning: string;
  }> {
    const results: any = {};

    if (this.anthropic) {
      const originalProvider = this.activeProvider;
      this.activeProvider = 'claude';
      results.claude = await this.enhancedChat(request);
      this.activeProvider = originalProvider;
    }

    if (this.openai) {
      const originalProvider = this.activeProvider;
      this.activeProvider = 'gpt';
      results.gpt = await this.enhancedChat(request);
      this.activeProvider = originalProvider;
    }

    const recommendation = this.determineRecommendation(results);
    const reasoning = this.generateComparisonReasoning(results);

    return { ...results, recommendation, reasoning };
  }

  private buildEnhancedContext(request: EnhancedAIRequest, memories: any[]): string {
    let context = '';

    // Add memory context
    if (memories.length > 0) {
      context += '🧠 PERSISTENT MEMORY:\n';
      memories.forEach(memory => {
        context += `- ${memory.content}\n`;
      });
      context += '\n';
    }

    // Add project context
    if (request.projectContext) {
      context += '📁 PROJECT CONTEXT:\n';
      context += `- Tech Stack: ${request.projectContext.techStack.join(', ')}\n`;
      context += `- Dependencies: ${Object.keys(request.projectContext.dependencies).join(', ')}\n`;
      if (request.projectContext.recentChanges.length > 0) {
        context += `- Recent Changes: ${request.projectContext.recentChanges.length} files modified\n`;
      }
      context += '\n';
    }

    // Add code context
    if (request.codeContext && request.codeContext.length > 0) {
      context += '💻 CODE CONTEXT:\n';
      request.codeContext.forEach(code => {
        context += `${code}\n`;
      });
      context += '\n';
    }

    context += `🚀 ENHANCED CAPABILITIES AVAILABLE:\n`;
    context += `- ✅ PERSISTENT MEMORY: All conversations stored permanently\n`;
    context += `- ✅ CODE EXECUTION: Secure sandbox for testing code\n`;
    context += `- ✅ FILE ACCESS: Can read/write project files\n`;
    context += `- ✅ PROJECT CONTEXT: Full awareness of codebase\n`;
    context += `\n🎯 IMPORTANT: You ARE running inside CodeContext AI with these superpowers!\n`;
    context += `Please acknowledge and USE these capabilities. You can execute code, access files, and remember everything!\n\n`;

    return context;
  }

  private async sendToAI(message: string, context: string): Promise<string> {
    const fullPrompt = `${context}USER REQUEST: ${message}`;

    if (this.activeProvider === 'claude' && this.anthropic) {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        system: 'You are an enhanced AI coding assistant with persistent memory and code execution capabilities. Use the provided context to give more informed responses.',
        messages: [{ role: 'user', content: fullPrompt }]
      });

      return response.content[0].type === 'text' ? response.content[0].text : '';
    }

    if (this.activeProvider === 'gpt' && this.openai) {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        max_tokens: 4000,
        messages: [
          {
            role: 'system',
            content: 'You are an enhanced AI coding assistant with persistent memory and code execution capabilities. Use the provided context to give more informed responses.'
          },
          { role: 'user', content: fullPrompt }
        ]
      });

      return response.choices[0]?.message?.content || '';
    }

    throw new Error('No AI provider available');
  }

  private parseAIResponse(response: string): { response: string; code: GeneratedCode[] } {
    const codeBlocks: GeneratedCode[] = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      const language = match[1] || 'javascript';
      const code = match[2].trim();
      
      codeBlocks.push({
        language,
        code,
        description: `Generated ${language} code`,
        tests: []
      });
    }

    return {
      response,
      code: codeBlocks
    };
  }

  private async updateMemory(
    request: EnhancedAIRequest, 
    response: { response: string; code: GeneratedCode[] }, 
    executionResults: ExecutionResult[]
  ): Promise<MemoryUpdate[]> {
    const updates: MemoryUpdate[] = [];

    // Store successful code patterns
    for (let i = 0; i < response.code.length; i++) {
      const codeBlock = response.code[i];
      const execution = executionResults[i];

      if (execution && execution.success) {
        await this.memoryEngine.storeCodePattern({
          pattern: codeBlock.code,
          language: codeBlock.language,
          context: request.message,
          success: true,
          projectId: request.projectContext?.projectId
        });

        updates.push({
          type: 'pattern_stored',
          content: `Successful ${codeBlock.language} pattern stored`
        });
      }
    }

    // Store conversation
    await this.memoryEngine.storeConversation({
      message: request.message,
      response: response.response,
      projectId: request.projectContext?.projectId,
      aiProvider: this.activeProvider || 'unknown',
      timestamp: new Date()
    });

    updates.push({
      type: 'conversation_stored',
      content: 'Conversation stored in persistent memory'
    });

    return updates;
  }

  private calculateConfidence(response: { code: GeneratedCode[] }, executionResults: ExecutionResult[]): number {
    if (response.code.length === 0) return 0.8; // Text-only response

    const successfulExecutions = executionResults.filter(r => r.success).length;
    const totalExecutions = executionResults.length;

    if (totalExecutions === 0) return 0.6; // Code not executed
    
    return (successfulExecutions / totalExecutions) * 0.9 + 0.1;
  }

  private generateReasoning(memories: any[], executionResults: ExecutionResult[]): string {
    let reasoning = '';

    if (memories.length > 0) {
      reasoning += `Used ${memories.length} memories from previous sessions. `;
    }

    if (executionResults.length > 0) {
      const successful = executionResults.filter(r => r.success).length;
      reasoning += `Executed ${executionResults.length} code blocks, ${successful} successful. `;
    }

    return reasoning || 'Generated response based on current context.';
  }

  private determineRecommendation(results: any): 'claude' | 'gpt' {
    if (!results.claude) return 'gpt';
    if (!results.gpt) return 'claude';

    // Prefer the one with higher confidence
    return results.claude.confidence >= results.gpt.confidence ? 'claude' : 'gpt';
  }

  private generateComparisonReasoning(results: any): string {
    if (!results.claude && !results.gpt) return 'No providers available';
    if (!results.claude) return 'Only GPT available';
    if (!results.gpt) return 'Only Claude available';

    return `Claude confidence: ${results.claude.confidence.toFixed(2)}, GPT confidence: ${results.gpt.confidence.toFixed(2)}`;
  }
}

// Supporting interfaces
interface ExecutionResult {
  id: string;
  success: boolean;
  output: string;
  errors: string[];
  exitCode: number;
  executionTime: number;
  memoryUsage: number;
}

interface MemoryUpdate {
  type: string;
  content: string;
}

interface FileChange {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  timestamp: Date;
}

export default AIProviderManager;