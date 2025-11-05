import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DEFAULT_CHAT_SYSTEM_PROMPT = `You are RuleReady Compliance Evaluation AI. Answer questions using ONLY the saved research provided.

CRITICAL RULES:
1. ONLY use SAVED RESEARCH for legal info - NO AI knowledge
2. Use ADDITIONAL CONTEXT for company details (company name, location, employee count)
3. Cite saved research as [1], [2], [3]

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

# [Clear Title Based on Question]

## Overview

Answer the question directly in 2-3 sentences. Mention **company name** if provided. Cite sources [1], [2].

## Why This Applies

Based on [1] and [2], explain applicability:

- **Company location**: [from additional context]
- **Number of employees**: [from additional context]
- **Legal requirement**: [from saved research] [1]
- **Threshold**: [cite number] employees [1]

## Key Requirements

List the main requirements with citations:

- **Requirement 1**: Details from saved research [1]
- **Training duration**: **X hours** for supervisors, **Y hours** for employees [2]
- **Deadline**: Within **X months/days** [1]
- **Frequency**: Every **X years** [2]

## What You Need To Do

Actionable steps:

1. First action step
2. Second action step
3. Third action step

## Penalties for Non-Compliance

- **Fines**: $X to $Y per violation [1]
- **Other consequences**: [from research] [2]

(Or state: "Penalties not specified in provided research")

FORMATTING:
- Use ## for all section headers
- Use **bold** for company names, numbers, deadlines, dollar amounts
- Use [1], [2], [3] to cite saved research inline
- Use bullet points for lists
- Add blank line after each paragraph
- Keep it scannable and professional

DO NOT include meta-commentary like "Answer Structure:" or "Start with direct answer:". Just write the formatted response.

IF NO SAVED RESEARCH:
"I don't have any saved research selected. Please select saved research from the knowledge base to provide legal compliance information."

IF MISSING INFO:
Be specific about what's missing and guide user to add it.`;

// Update chat settings (single-user mode)
export const updateChatSettings = mutation({
  args: {
    chatSystemPrompt: v.optional(v.string()),
    chatModel: v.optional(v.string()),
    chatTemperature: v.optional(v.number()),
    chatMaxTokens: v.optional(v.number()),
    chatAdditionalContext: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Single-user mode: get the first (and only) settings record
    const existingSettings = await ctx.db.query("appSettings").first();

    const now = Date.now();

    if (existingSettings) {
      // Only update fields that are provided (not undefined)
      const updates: any = { updatedAt: now };
      if (args.chatSystemPrompt !== undefined) updates.chatSystemPrompt = args.chatSystemPrompt;
      if (args.chatModel !== undefined) updates.chatModel = args.chatModel;
      if (args.chatTemperature !== undefined) updates.chatTemperature = args.chatTemperature;
      if (args.chatMaxTokens !== undefined) updates.chatMaxTokens = args.chatMaxTokens;
      if (args.chatAdditionalContext !== undefined) updates.chatAdditionalContext = args.chatAdditionalContext;
      
      await ctx.db.patch(existingSettings._id, updates);
    } else {
      // Create new settings
      await ctx.db.insert("appSettings", {
        chatSystemPrompt: args.chatSystemPrompt,
        chatModel: args.chatModel,
        chatTemperature: args.chatTemperature,
        chatMaxTokens: args.chatMaxTokens,
        chatAdditionalContext: args.chatAdditionalContext,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Get chat settings (single-user mode)
export const getChatSettings = query({
  handler: async (ctx) => {
    // Single-user mode: get the first settings record
    const settings = await ctx.db.query("appSettings").first();

    if (!settings) {
      // Return sensible defaults if no settings exist
      return {
        chatSystemPrompt: DEFAULT_CHAT_SYSTEM_PROMPT,
        chatModel: "gemini-2.0-flash-exp",
        chatTemperature: 0.7,
        chatMaxTokens: 8192,
      };
    }

    // Return database values with defaults for any missing fields
    return {
      chatSystemPrompt: settings.chatSystemPrompt ?? DEFAULT_CHAT_SYSTEM_PROMPT,
      chatModel: settings.chatModel ?? "gemini-2.0-flash-exp",
      chatTemperature: settings.chatTemperature ?? 0.7,
      chatMaxTokens: settings.chatMaxTokens ?? 8192,
      chatAdditionalContext: settings.chatAdditionalContext ?? "",
    };
  },
});

