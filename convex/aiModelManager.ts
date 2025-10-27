import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Get all AI models
export const getAllAIModels = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("aiModels").order("desc").collect();
  },
});

// Get AI models by capability
export const getModelsByCapability = query({
  args: { capability: v.string() },
  handler: async (ctx, args) => {
    const models = await ctx.db.query("aiModels")
      .filter(q => q.eq(q.field("isActive"), true))
      .collect();
    
    return models.filter(model => model.capabilities.includes(args.capability));
  },
});

// Get AI model configuration for a specific purpose
export const getModelConfigForPurpose = query({
  args: { purpose: v.string() },
  handler: async (ctx, args) => {
    const config = await ctx.db.query("aiModelConfigs")
      .filter(q => q.eq(q.field("purpose"), args.purpose))
      .filter(q => q.eq(q.field("isActive"), true))
      .first();
    
    if (!config) return null;
    
    const model = await ctx.db.get(config.selectedModelId);
    return { config, model };
  },
});

// Add new AI model
export const addAIModel = mutation({
  args: {
    name: v.string(),
    provider: v.string(),
    modelId: v.string(),
    apiKeyEnvVar: v.string(),
    baseUrl: v.optional(v.string()),
    capabilities: v.array(v.string()),
    maxTokens: v.optional(v.number()),
    costPerToken: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiModels", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Update AI model
export const updateAIModel = mutation({
  args: {
    modelId: v.id("aiModels"),
    name: v.optional(v.string()),
    provider: v.optional(v.string()),
    modelIdentifier: v.optional(v.string()),
    apiKeyEnvVar: v.optional(v.string()),
    baseUrl: v.optional(v.string()),
    capabilities: v.optional(v.array(v.string())),
    maxTokens: v.optional(v.number()),
    costPerToken: v.optional(v.number()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { modelId, modelIdentifier, ...updates } = args;
    const updateData = {
      ...updates,
      ...(modelIdentifier && { modelId: modelIdentifier }),
      updatedAt: Date.now(),
    };
    return await ctx.db.patch(modelId, updateData);
  },
});

// Set model configuration for a purpose
export const setModelConfigForPurpose = mutation({
  args: {
    purpose: v.string(),
    selectedModelId: v.id("aiModels"),
    systemPrompt: v.optional(v.string()),
    temperature: v.optional(v.number()),
    maxTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if config already exists
    const existingConfig = await ctx.db.query("aiModelConfigs")
      .filter(q => q.eq(q.field("purpose"), args.purpose))
      .first();
    
    if (existingConfig) {
      // Update existing config
      return await ctx.db.patch(existingConfig._id, {
        selectedModelId: args.selectedModelId,
        systemPrompt: args.systemPrompt,
        temperature: args.temperature,
        maxTokens: args.maxTokens,
        updatedAt: Date.now(),
      });
    } else {
      // Create new config
      return await ctx.db.insert("aiModelConfigs", {
        purpose: args.purpose,
        selectedModelId: args.selectedModelId,
        systemPrompt: args.systemPrompt,
        temperature: args.temperature,
        maxTokens: args.maxTokens,
        isActive: true,
        updatedAt: Date.now(),
      });
    }
  },
});

// Test AI model connectivity
export const testAIModel = action({
  args: {
    modelId: v.id("aiModels"),
    testPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; response?: string; model?: string; provider?: string; error?: string }> => {
    try {
      const models = await ctx.runQuery(api.aiModelManager.getAllAIModels);
      const model = models.find((m: any) => m._id === args.modelId);
      if (!model) {
        throw new Error("Model not found");
      }
      
      const apiKey = process.env[model.apiKeyEnvVar];
      if (!apiKey) {
        throw new Error(`Environment variable ${model.apiKeyEnvVar} not set`);
      }
      
      const testPrompt = args.testPrompt || "Hello, this is a test. Please respond with 'Test successful'.";
      
      // Route to appropriate AI provider
      let response = "";
      
      switch (model.provider) {
        case "google":
          const genAI = new GoogleGenerativeAI(apiKey);
          const geminiModel = genAI.getGenerativeModel({ model: model.modelId });
          const result = await geminiModel.generateContent(testPrompt);
          response = result.response.text();
          break;
          
        case "openai":
          // OpenAI integration would go here
          const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: model.modelId,
              messages: [{ role: "user", content: testPrompt }],
              max_tokens: 100,
            }),
          });
          
          if (!openaiResponse.ok) {
            throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
          }
          
          const openaiData = await openaiResponse.json();
          response = openaiData.choices[0]?.message?.content || "No response";
          break;
          
        default:
          throw new Error(`Unsupported provider: ${model.provider}`);
      }
      
      return {
        success: true,
        response: response.substring(0, 200), // Truncate for display
        model: model.name,
        provider: model.provider,
      };
      
    } catch (error) {
      console.error("AI model test failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Initialize default AI models (run once)
export const initializeDefaultModels = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if models already exist
    const existingModels = await ctx.db.query("aiModels").collect();
    if (existingModels.length > 0) {
      return { message: "Models already initialized" };
    }
    
    // Add default models
    const geminiId = await ctx.db.insert("aiModels", {
      name: "Google Gemini 2.0 Flash",
      provider: "google",
      modelId: "gemini-2.0-flash-exp",
      apiKeyEnvVar: "GEMINI_API_KEY",
      isActive: true,
      capabilities: ["chat", "analysis", "generation"],
      maxTokens: 8192,
      description: "Google's latest fast model for chat and analysis",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    const geminiEmbedId = await ctx.db.insert("aiModels", {
      name: "Google Text Embedding 004",
      provider: "google",
      modelId: "text-embedding-004",
      apiKeyEnvVar: "GEMINI_API_KEY",
      isActive: true,
      capabilities: ["embeddings"],
      description: "Google's text embedding model",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    const openaiId = await ctx.db.insert("aiModels", {
      name: "OpenAI GPT-4o Mini",
      provider: "openai",
      modelId: "gpt-4o-mini",
      apiKeyEnvVar: "OPENAI_API_KEY",
      isActive: false, // Inactive until API key is provided
      capabilities: ["chat", "analysis", "generation"],
      maxTokens: 16384,
      costPerToken: 0.00015,
      description: "OpenAI's efficient model for general tasks",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    // Set default configurations
    await ctx.db.insert("aiModelConfigs", {
      purpose: "chat",
      selectedModelId: geminiId,
      systemPrompt: "You are a professional compliance assistant specializing in US employment law.",
      temperature: 0.7,
      isActive: true,
      updatedAt: Date.now(),
    });
    
    await ctx.db.insert("aiModelConfigs", {
      purpose: "embeddings",
      selectedModelId: geminiEmbedId,
      isActive: true,
      updatedAt: Date.now(),
    });
    
    await ctx.db.insert("aiModelConfigs", {
      purpose: "rule_generation",
      selectedModelId: geminiId,
      systemPrompt: "You are a professional compliance analyst for employment law.",
      temperature: 0.3,
      isActive: true,
      updatedAt: Date.now(),
    });
    
    return { 
      message: "Default AI models initialized successfully",
      modelsCreated: 3,
      configsCreated: 3
    };
  },
});
