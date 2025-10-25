import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Feature flags (environment-overridable)
const FEATURES = {
  complianceMode: (process.env.NEXT_PUBLIC_COMPLIANCE_MODE ?? 'true') === 'true',
};

// LEGACY: Analyze website changes using AI - DISABLED in compliance mode
export const analyzeChange = internalAction({
  args: {
    scrapeResultId: v.string(), // Changed from v.id("scrapeResults") since table is disabled
    websiteName: v.string(),
    websiteUrl: v.string(),
    diff: v.object({
      text: v.string(),
      json: v.any(),
    }),
  },
  handler: async (ctx, args) => {
    // Skip AI analysis in compliance mode - use compliance-specific AI instead
    if (FEATURES.complianceMode) {
      console.log("Legacy AI analysis disabled in compliance mode");
      return;
    }
    // Get user's AI settings (single-user mode)
    const userSettings = await ctx.runQuery(internal.userSettings.getUserSettingsInternal, {});

    if (!userSettings || !userSettings.aiAnalysisEnabled || !userSettings.aiApiKey) {
      console.log("AI analysis not enabled or API key not set");
      return;
    }

    const systemPrompt = userSettings.aiSystemPrompt || `You are an AI assistant specialized in analyzing website changes. Your task is to determine if a detected change is "meaningful" or just noise.

Meaningful changes include:
- Content updates (text, images, prices)
- New features or sections
- Important announcements
- Product availability changes
- Policy updates

NOT meaningful (ignore these):
- Rotating banners/carousels
- Dynamic timestamps
- View counters
- Session IDs
- Random promotional codes
- Cookie consent banners
- Advertising content
- Social media feed updates

Analyze the provided diff and return a JSON response with:
{
  "score": 0-100 (how meaningful the change is),
  "isMeaningful": true/false,
  "reasoning": "Brief explanation of your decision"
}`;

    try {
      // Use custom base URL if provided, otherwise default to OpenAI
      const baseUrl = userSettings.aiBaseUrl || "https://api.openai.com/v1";
      const apiUrl = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
      
      // Call AI API
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${userSettings.aiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: userSettings.aiModel || "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: `Website: ${args.websiteName} (${args.websiteUrl})
              
Changes detected:
${args.diff.text}

Please analyze these changes and determine if they are meaningful.`,
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("AI API error:", error);
        return;
      }

      const data = await response.json();
      const aiResponse = JSON.parse(data.choices[0].message.content);

      // Validate response structure
      if (typeof aiResponse.score !== "number" || 
          typeof aiResponse.isMeaningful !== "boolean" ||
          typeof aiResponse.reasoning !== "string") {
        console.error("Invalid AI response format:", aiResponse);
        return;
      }

      // Apply threshold
      const threshold = userSettings.aiMeaningfulChangeThreshold || 70;
      const isMeaningful = aiResponse.score >= threshold;

      // LEGACY: Update scrape result - disabled in compliance mode
      // await ctx.runMutation(internal.websites.updateScrapeResultAIAnalysis, {
      //   scrapeResultId: args.scrapeResultId,
      //   analysis: {
      //     meaningfulChangeScore: aiResponse.score,
      //     isMeaningfulChange: isMeaningful,
      //     reasoning: aiResponse.reasoning,
      //     analyzedAt: Date.now(),
      //     model: userSettings.aiModel || "gpt-4o-mini",
      //   },
      // });

      console.log(`AI analysis complete for ${args.websiteName}: Score ${aiResponse.score}, Meaningful: ${isMeaningful}`);

      // LEGACY: Trigger notifications - disabled in compliance mode
      // await ctx.scheduler.runAfter(0, internal.aiAnalysis.handleAIBasedNotifications, {
      //   userId: args.userId,
      //   scrapeResultId: args.scrapeResultId,
      //   websiteName: args.websiteName,
      //   websiteUrl: args.websiteUrl,
      //   isMeaningful,
      //   diff: args.diff,
      //   aiAnalysis: {
      //     meaningfulChangeScore: aiResponse.score,
      //     isMeaningfulChange: isMeaningful,
      //     reasoning: aiResponse.reasoning,
      //     analyzedAt: Date.now(),
      //     model: userSettings.aiModel || "gpt-4o-mini",
      //   },
      // });
    } catch (error) {
      console.error("Error in AI analysis:", error);
    }
  },
});

// LEGACY: Handle AI-based notifications - DISABLED in compliance mode
export const handleAIBasedNotifications = internalAction({
  args: {
    userId: v.id("users"),
    scrapeResultId: v.string(), // Changed from v.id("scrapeResults") since table is disabled
    websiteName: v.string(),
    websiteUrl: v.string(),
    isMeaningful: v.boolean(),
    diff: v.object({
      text: v.string(),
      json: v.any(),
    }),
    aiAnalysis: v.object({
      meaningfulChangeScore: v.number(),
      isMeaningfulChange: v.boolean(),
      reasoning: v.string(),
      analyzedAt: v.number(),
      model: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    // Skip legacy notifications in compliance mode - use compliance-specific notifications instead
    if (FEATURES.complianceMode) {
      console.log("Legacy AI notifications disabled in compliance mode");
      return;
    }
    try {
      // Get user settings to check notification filtering preferences
      const userSettings = await ctx.runQuery(internal.userSettings.getUserSettingsInternal, {});

      // LEGACY: Get website details - disabled in compliance mode
      // const scrapeResult = await ctx.runQuery(internal.websites.getScrapeResult, {
      //   scrapeResultId: args.scrapeResultId,
      // });

      // if (!scrapeResult) {
      //   console.error("Scrape result not found for notifications");
      //   return;
      // }

      // const website = await ctx.runQuery(internal.websites.getWebsite, {
      //   websiteId: scrapeResult.websiteId,
      //   userId: args.userId,
      // });
      
      // In compliance mode, notifications are handled by compliance-specific functions
      console.log("Legacy notification handling disabled - use compliance notifications instead");
      return;

      /* LEGACY CODE - UNREACHABLE IN COMPLIANCE MODE
      if (!website || website.notificationPreference === "none") {
        return;
      }

      // Check if we should send webhook notification
      const shouldSendWebhook = (website.notificationPreference === "webhook" || website.notificationPreference === "both") && 
                               website.webhookUrl && 
                               (!userSettings?.webhookOnlyIfMeaningful || args.isMeaningful);

      // Check if we should send email notification
      const shouldSendEmail = (website.notificationPreference === "email" || website.notificationPreference === "both") && 
                             (!userSettings?.emailOnlyIfMeaningful || args.isMeaningful);

      // Send webhook notification if conditions are met
      if (shouldSendWebhook && website.webhookUrl) {
        await ctx.scheduler.runAfter(0, internal.notifications.sendWebhookNotification, {
          webhookUrl: website.webhookUrl,
          websiteId: scrapeResult.websiteId,
          websiteName: website.name,
          websiteUrl: args.websiteUrl,
          scrapeResultId: args.scrapeResultId,
          changeType: "content_changed",
          changeStatus: "changed",
          diff: args.diff,
          title: scrapeResult.title,
          description: scrapeResult.description,
          markdown: scrapeResult.markdown,
          scrapedAt: scrapeResult.scrapedAt,
          aiAnalysis: args.aiAnalysis,
        });
      }

      // Send email notification if conditions are met
      if (shouldSendEmail) {
        // Get user's email configuration
        const emailConfig = await ctx.runQuery(internal.emailManager.getEmailConfigInternal, {
          userId: args.userId,
        });
        
        if (emailConfig?.email && emailConfig.isVerified) {
          await ctx.scheduler.runAfter(0, internal.notifications.sendEmailNotification, {
            email: emailConfig.email,
            websiteName: website.name,
            websiteUrl: args.websiteUrl,
            changeType: "content_changed",
            changeStatus: "changed",
            diff: args.diff,
            title: scrapeResult.title,
            scrapedAt: scrapeResult.scrapedAt,
            userId: args.userId,
            aiAnalysis: args.aiAnalysis,
          });
        }
      }

      console.log(`AI-based notifications processed for ${args.websiteName}. Webhook: ${shouldSendWebhook}, Email: ${shouldSendEmail}`);
      */
    } catch (error) {
      console.error("Error in AI-based notifications:", error);
    }
  },
});