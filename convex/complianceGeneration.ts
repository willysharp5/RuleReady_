import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";

// Generate compliance rule from selected sources using LLM
export const generateComplianceRule = action({
  args: {
    selectedSourceIds: v.array(v.string()),
    templateId: v.string(),
    outputRuleName: v.string(),
    synthesisPrompt: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      console.log(`🤖 Generating compliance rule from ${args.selectedSourceIds.length} sources`);
      
      // Get the selected sources content
      const sourceContents: string[] = [];
      const sourceCitations: string[] = [];
      
      for (const sourceId of args.selectedSourceIds) {
        // Try to get from compliance reports first
        const report = await ctx.runQuery(api.importComplianceReports.getAIReports, { limit: 1000 })
          .then(reports => reports.find((r: any) => r._id === sourceId));
        
        if (report) {
          sourceContents.push(report.rawContent || JSON.stringify(report.structuredData, null, 2));
          const ruleIdParts = report.ruleId?.split('_') || [];
          const jurisdiction = ruleIdParts[0] ? ruleIdParts[0].charAt(0).toUpperCase() + ruleIdParts[0].slice(1) : 'Unknown';
          const topic = ruleIdParts.slice(1).join(' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown';
          sourceCitations.push(`${jurisdiction} - ${topic} (${report.sourceUrl})`);
          continue;
        }
        
        // Try to get from websites
        const websites = await ctx.runQuery(api.websites.getUserWebsites);
        const website = websites.find((w: any) => w._id === sourceId);
        
        if (website && website.complianceMetadata) {
          sourceContents.push(`Website: ${website.url}\nJurisdiction: ${website.complianceMetadata.jurisdiction}\nTopic: ${website.complianceMetadata.topicKey}\nPriority: ${website.complianceMetadata.priority}`);
          sourceCitations.push(`${website.complianceMetadata.jurisdiction} - ${website.complianceMetadata.topicKey} (${website.url})`);
        }
      }
      
      if (sourceContents.length === 0) {
        throw new Error("No valid source content found");
      }
      
      // Get the template
      const templates = await ctx.runQuery(api.complianceTemplates.getAllTemplates);
      const template = templates?.find((t: any) => t.templateId === args.templateId);
      
      if (!template) {
        throw new Error("Template not found");
      }
      
      // Prepare the LLM prompt
      const combinedSources = sourceContents.map((content, index) => 
        `## Source ${index + 1}: ${sourceCitations[index]}\n\n${content}`
      ).join('\n\n---\n\n');
      
      const fullPrompt = `${args.synthesisPrompt}

TEMPLATE STRUCTURE:
${template.markdownContent}

SOURCES TO SYNTHESIZE:
${combinedSources}

Please generate a compliance rule following the template structure above, incorporating information from all provided sources. Include [1], [2], [3] etc. citations where appropriate.`;

      // Here you would call your actual LLM API (Gemini, OpenAI, etc.)
      // For now, using a structured mock response
      const generatedRule = `# ${args.outputRuleName}

## Overview
This compliance rule has been synthesized from ${args.selectedSourceIds.length} selected sources using AI analysis and the specified template structure.

## Requirements
Based on the analysis of the selected sources, the following requirements have been identified:

1. **Primary Compliance Obligation**: [Generated from source analysis] [1]
2. **Implementation Timeline**: [Derived from regulatory sources] [2]
3. **Reporting Requirements**: [Compiled from multiple jurisdictions] [3]

## Source References
${sourceCitations.map((citation, index) => `[${index + 1}] ${citation}`).join('\n')}

## Implementation Notes
[AI-generated implementation guidance based on source analysis]

---
*This rule was generated using LLM synthesis on ${new Date().toLocaleDateString()}*
*Template: ${template.title}*
*Sources: ${args.selectedSourceIds.length} compliance sources*`;

      // Save the generated rule to the database
      const ruleId = await ctx.runMutation(internal.complianceGeneration.saveGeneratedRule, {
        title: args.outputRuleName,
        content: generatedRule,
        templateId: args.templateId,
        sourceIds: args.selectedSourceIds,
        sourceCitations: sourceCitations,
        synthesisPrompt: args.synthesisPrompt,
      });
      
      return {
        success: true,
        ruleId,
        generatedRule,
        sourceCitations,
        sourceCount: args.selectedSourceIds.length
      };
      
    } catch (error) {
      console.error("Error generating compliance rule:", error);
      throw new Error(`Failed to generate compliance rule: ${error}`);
    }
  },
});

// Internal mutation to save generated rule
export const saveGeneratedRule = internalMutation({
  args: {
    title: v.string(),
    content: v.string(),
    templateId: v.string(),
    sourceIds: v.array(v.string()),
    sourceCitations: v.array(v.string()),
    synthesisPrompt: v.string(),
  },
  handler: async (ctx, args) => {
    // Save to complianceReports table
    const reportId = await ctx.db.insert("complianceReports", {
      ruleId: `synthesized_${Date.now()}`,
      contentHash: `hash_${Date.now()}`,
      reportId: `report_${Date.now()}`,
      reportContent: args.content,
      contentLength: args.content.length,
      extractedSections: {
        overview: "Generated rule overview",
        employerResponsibilities: "Generated requirements",
        penalties: "Generated implementation notes"
      },
      processingMethod: "llm_synthesis",
      generatedAt: Date.now(),
    });
    
    // Save source mappings
    for (let i = 0; i < args.sourceIds.length; i++) {
      await ctx.db.insert("reportSources", {
        reportId: `report_${Date.now()}`,
        sourceId: args.sourceIds[i],
        section: `citation_${i + 1}`,
        citation: args.sourceCitations[i],
      });
    }
    
    return reportId;
  },
});

// Generate embeddings for a compliance rule
export const generateRuleEmbeddings = action({
  args: {
    ruleContent: v.string(),
    ruleTitle: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      console.log(`🔍 Generating embeddings for rule: ${args.ruleTitle}`);
      
      // Chunk the content into optimal sizes (roughly 500 characters per chunk)
      const chunks: string[] = [];
      const chunkSize = 500;
      const content = args.ruleContent;
      
      for (let i = 0; i < content.length; i += chunkSize) {
        chunks.push(content.substring(i, i + chunkSize));
      }
      
      const embeddings = [];
      
      // Generate embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Here you would call your actual embedding API (Gemini, OpenAI, etc.)
        // For now, using mock vectors
        const mockVector = Array.from({length: 768}, () => Math.random() * 2 - 1); // Typical embedding dimension
        
        const embeddingId = await ctx.runMutation(internal.complianceGeneration.saveEmbedding, {
          content: chunk,
          vector: mockVector,
          ruleTitle: args.ruleTitle,
          chunkIndex: i,
          totalChunks: chunks.length,
          section: i === 0 ? 'Overview' : i === chunks.length - 1 ? 'Implementation' : 'Requirements',
        });
        
        embeddings.push({
          id: embeddingId,
          chunk,
          vector: mockVector.slice(0, 10), // Show only first 10 dimensions for preview
          metadata: {
            ruleTitle: args.ruleTitle,
            chunkIndex: i,
            totalChunks: chunks.length,
            section: i === 0 ? 'Overview' : i === chunks.length - 1 ? 'Implementation' : 'Requirements',
          },
        });
      }
      
      return {
        success: true,
        embeddingCount: embeddings.length,
        embeddings: embeddings,
        totalChunks: chunks.length,
      };
      
    } catch (error) {
      console.error("Error generating embeddings:", error);
      throw new Error(`Failed to generate embeddings: ${error}`);
    }
  },
});

// Internal mutation to save embedding
export const saveEmbedding = internalMutation({
  args: {
    content: v.string(),
    vector: v.array(v.number()),
    ruleTitle: v.string(),
    chunkIndex: v.number(),
    totalChunks: v.number(),
    section: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("complianceEmbeddings", {
      entityId: `rule_${Date.now()}`,
      entityType: "rule" as const,
      contentHash: `hash_${Date.now()}`,
      content: args.content,
      chunkIndex: args.chunkIndex,
      totalChunks: args.totalChunks,
      embedding: args.vector,
      embeddingModel: "gemini-embedding-004",
      embeddingDimensions: args.vector.length,
      metadata: {
        jurisdiction: "Multi-Jurisdiction",
        topicKey: "synthesized_rule",
        contentLength: args.content.length,
        processingMethod: "llm_synthesis",
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Get generated rules
export const getGeneratedRules = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("complianceReports")
      .filter(q => q.eq(q.field("processingMethod"), "llm_synthesis"))
      .order("desc")
      .take(50);
  },
});
