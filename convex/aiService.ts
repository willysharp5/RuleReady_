import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Centralized AI service that routes to appropriate models
export const callAI = action({
  args: {
    purpose: v.string(), // "chat", "rule_generation", "embeddings", "change_analysis"
    prompt: v.string(),
    systemPrompt: v.optional(v.string()),
    temperature: v.optional(v.number()),
    maxTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // Get model configuration for this purpose
      const modelConfig = await ctx.runQuery(api.aiModelManager.getModelConfigForPurpose, {
        purpose: args.purpose
      });
      
      if (!modelConfig || !modelConfig.model) {
        throw new Error(`No AI model configured for purpose: ${args.purpose}`);
      }
      
      const { config, model } = modelConfig;
      
      // Get API key from environment
      const apiKey = process.env[model.apiKeyEnvVar];
      if (!apiKey) {
        throw new Error(`Environment variable ${model.apiKeyEnvVar} not set`);
      }
      
      // Use system prompt from config or override
      const systemPrompt = args.systemPrompt || config.systemPrompt || "";
      const temperature = args.temperature ?? config.temperature ?? 0.7;
      const maxTokens = args.maxTokens ?? config.maxTokens ?? model.maxTokens;
      
      let response = "";
      
      // Route to appropriate AI provider
      switch (model.provider) {
        case "google":
          response = await callGoogleAI(model, apiKey, args.prompt, systemPrompt, temperature, maxTokens);
          break;
          
        case "openai":
          response = await callOpenAI(model, apiKey, args.prompt, systemPrompt, temperature, maxTokens);
          break;
          
        case "anthropic":
          response = await callAnthropic(model, apiKey, args.prompt, systemPrompt, temperature, maxTokens);
          break;
          
        default:
          throw new Error(`Unsupported AI provider: ${model.provider}`);
      }
      
      return {
        success: true,
        response,
        model: model.name,
        provider: model.provider,
        tokensUsed: response.length, // Rough estimate
      };
      
    } catch (error) {
      console.error(`AI service error for ${args.purpose}:`, error);
      throw new Error(`AI service failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Google AI implementation
async function callGoogleAI(
  model: any, 
  apiKey: string, 
  prompt: string, 
  systemPrompt: string, 
  temperature: number, 
  maxTokens?: number
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ 
    model: model.modelId,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  });
  
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
  const result = await geminiModel.generateContent(fullPrompt);
  return result.response.text();
}

// OpenAI implementation
async function callOpenAI(
  model: any, 
  apiKey: string, 
  prompt: string, 
  systemPrompt: string, 
  temperature: number, 
  maxTokens?: number
): Promise<string> {
  const messages: any[] = [];
  
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });
  
  const response = await fetch(model.baseUrl || "https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model.modelId,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.choices[0]?.message?.content || "No response";
}

// Anthropic implementation
async function callAnthropic(
  model: any, 
  apiKey: string, 
  prompt: string, 
  systemPrompt: string, 
  temperature: number, 
  maxTokens?: number
): Promise<string> {
  const response = await fetch(model.baseUrl || "https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model.modelId,
      max_tokens: maxTokens || 4096,
      temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.content[0]?.text || "No response";
}

// Generate embeddings using configured embedding model
export const generateEmbeddings = action({
  args: {
    content: v.string(),
    purpose: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const purpose = args.purpose || "embeddings";
      
      // Get embedding model configuration
      const modelConfig = await ctx.runQuery(api.aiModelManager.getModelConfigForPurpose, {
        purpose
      });
      
      if (!modelConfig || !modelConfig.model) {
        throw new Error(`No embedding model configured for purpose: ${purpose}`);
      }
      
      const { model } = modelConfig;
      
      if (!model.capabilities.includes("embeddings")) {
        throw new Error(`Model ${model.name} does not support embeddings`);
      }
      
      const apiKey = process.env[model.apiKeyEnvVar];
      if (!apiKey) {
        throw new Error(`Environment variable ${model.apiKeyEnvVar} not set`);
      }
      
      let embedding: number[] = [];
      
      switch (model.provider) {
        case "google":
          const genAI = new GoogleGenerativeAI(apiKey);
          const embeddingModel = genAI.getGenerativeModel({ model: model.modelId });
          const result = await embeddingModel.embedContent(args.content);
          embedding = result.embedding.values;
          break;
          
        case "openai":
          const response = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: model.modelId,
              input: args.content,
            }),
          });
          
          if (!response.ok) {
            throw new Error(`OpenAI embeddings error: ${response.statusText}`);
          }
          
          const data = await response.json();
          embedding = data.data[0]?.embedding || [];
          break;
          
        default:
          throw new Error(`Embeddings not supported for provider: ${model.provider}`);
      }
      
      return {
        success: true,
        embedding,
        model: model.name,
        dimensions: embedding.length,
      };
      
    } catch (error) {
      console.error("Embedding generation error:", error);
      throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});
