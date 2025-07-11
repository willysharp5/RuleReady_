import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const sendWebhookNotification = internalAction({
  args: {
    webhookUrl: v.string(),
    websiteId: v.id("websites"),
    websiteName: v.string(),
    websiteUrl: v.string(),
    scrapeResultId: v.id("scrapeResults"),
    changeType: v.string(),
    changeStatus: v.string(),
    diff: v.optional(v.object({
      text: v.string(),
      json: v.any(),
    })),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    markdown: v.string(),
    scrapedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const payload = {
      event: "website_changed",
      timestamp: new Date().toISOString(),
      website: {
        id: args.websiteId,
        name: args.websiteName,
        url: args.websiteUrl,
      },
      change: {
        detectedAt: new Date(args.scrapedAt).toISOString(),
        changeType: args.changeType,
        changeStatus: args.changeStatus,
        summary: args.diff?.text ? 
          args.diff.text.substring(0, 200) + (args.diff.text.length > 200 ? "..." : "") :
          "Website content has changed",
        diff: args.diff ? {
          added: args.diff.text.split('\n')
            .filter(line => line.startsWith('+') && !line.startsWith('+++'))
            .map(line => line.substring(1)),
          removed: args.diff.text.split('\n')
            .filter(line => line.startsWith('-') && !line.startsWith('---'))
            .map(line => line.substring(1)),
        } : undefined,
      },
      scrapeResult: {
        id: args.scrapeResultId,
        title: args.title,
        description: args.description,
        markdown: args.markdown.substring(0, 1000) + (args.markdown.length > 1000 ? "..." : ""),
      },
    };

    try {
      console.log(`Sending webhook to ${args.webhookUrl}`);
      
      const response = await fetch(args.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Firecrawl-Observer/1.0',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`Webhook failed: ${response.status} ${response.statusText}`);
        throw new Error(`Webhook failed with status ${response.status}`);
      }

      const responseData = await response.text();
      console.log(`Webhook sent successfully: ${responseData}`);
      
      return { success: true, status: response.status };
    } catch (error) {
      console.error("Failed to send webhook:", error);
      throw error;
    }
  },
});

export const sendEmailNotification = internalAction({
  args: {
    email: v.string(),
    websiteName: v.string(),
    websiteUrl: v.string(),
    changeType: v.string(),
    changeStatus: v.string(),
    diff: v.optional(v.object({
      text: v.string(),
      json: v.any(),
    })),
    title: v.optional(v.string()),
    scrapedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // TODO: Implement email sending using Resend
    console.log(`Would send email to ${args.email} about changes on ${args.websiteName}`);
    
    // For now, just log the email that would be sent
    const emailContent = {
      to: args.email,
      subject: `Changes detected on ${args.websiteName}`,
      html: `
        <h2>Website Change Alert</h2>
        <p>We've detected changes on the website you're monitoring:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3>${args.websiteName}</h3>
          <p><a href="${args.websiteUrl}">${args.websiteUrl}</a></p>
          <p><strong>Changed at:</strong> ${new Date(args.scrapedAt).toLocaleString()}</p>
          ${args.title ? `<p><strong>Page Title:</strong> ${args.title}</p>` : ''}
        </div>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}" style="background: #ff6600; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Changes</a></p>
      `
    };
    
    console.log("Email content:", emailContent);
    return { success: true };
  },
});