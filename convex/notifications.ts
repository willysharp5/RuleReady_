import { internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { resend } from "./alertEmail";

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
      
      // Check if the webhook URL is localhost or a private network
      const isLocalhost = args.webhookUrl.includes('localhost') || 
                         args.webhookUrl.includes('127.0.0.1') ||
                         args.webhookUrl.includes('0.0.0.0') ||
                         args.webhookUrl.includes('192.168.') ||
                         args.webhookUrl.includes('10.') ||
                         args.webhookUrl.includes('172.');

      if (isLocalhost) {
        // Use the webhook proxy for localhost/private network URLs
        const proxyUrl = `${process.env.CONVEX_SITE_URL}/api/webhook-proxy`;
        console.log(`Using webhook proxy for localhost URL: ${proxyUrl}`);
        
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            targetUrl: args.webhookUrl,
            payload: payload,
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error(`Webhook proxy failed: ${response.status} ${errorData}`);
          throw new Error(`Webhook proxy failed with status ${response.status}`);
        }

        const responseData = await response.json();
        console.log(`Webhook sent successfully via proxy:`, responseData);
        
        return { success: responseData.success, status: responseData.status };
      } else {
        // Direct request for public URLs
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
      }
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
    await resend.sendEmail(ctx, {
      from: "Firecrawl Observer <noreply@answer.website>",
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
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" style="background: #ff6600; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Changes</a></p>
      `
    })
  },
});

export const sendCrawlWebhook = internalAction({
  args: {
    webhookUrl: v.string(),
    websiteId: v.id("websites"),
    websiteName: v.string(),
    websiteUrl: v.string(),
    sessionId: v.id("crawlSessions"),
    pagesFound: v.number(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; status: number } | undefined> => {
    // Get crawl session details
    const session = await ctx.runQuery(internal.crawl.getCrawlSession, {
      sessionId: args.sessionId,
    });

    if (!session) return;

    // Get summary of changes
    const crawledPages = await ctx.runQuery(internal.crawl.getCrawledPagesForSession, {
      sessionId: args.sessionId,
    });

    const changedPages = crawledPages.filter((p: any) => p.status === "changed");
    const newPages = crawledPages.filter((p: any) => p.status === "new");
    const removedPages = crawledPages.filter((p: any) => p.status === "removed");

    const payload = {
      event: "crawl_completed",
      timestamp: new Date().toISOString(),
      website: {
        id: args.websiteId,
        name: args.websiteName,
        url: args.websiteUrl,
        type: "full_site",
      },
      crawlSummary: {
        sessionId: args.sessionId,
        startedAt: new Date(session.startedAt).toISOString(),
        completedAt: session.completedAt ? new Date(session.completedAt).toISOString() : null,
        pagesChecked: args.pagesFound,
        pagesChanged: changedPages.length,
        pagesAdded: newPages.length,
        pagesRemoved: removedPages.length,
        duration: session.completedAt ? `${Math.round((session.completedAt - session.startedAt) / 1000)}s` : null,
      },
      changes: [
        ...changedPages.map((p: any) => ({
          url: p.url,
          path: p.path,
          status: "changed",
          title: p.title,
        })),
        ...newPages.map((p: any) => ({
          url: p.url,
          path: p.path,
          status: "added",
          title: p.title,
        })),
        ...removedPages.map((p: any) => ({
          url: p.url,
          path: p.path,
          status: "removed",
          title: p.title,
        })),
      ],
    };

    try {
      console.log(`Sending crawl webhook to ${args.webhookUrl}`);
      
      // Check if the webhook URL is localhost or a private network
      const isLocalhost = args.webhookUrl.includes('localhost') || 
                         args.webhookUrl.includes('127.0.0.1') ||
                         args.webhookUrl.includes('0.0.0.0') ||
                         args.webhookUrl.includes('192.168.') ||
                         args.webhookUrl.includes('10.') ||
                         args.webhookUrl.includes('172.');

      if (isLocalhost) {
        // Use the webhook proxy for localhost/private network URLs
        const proxyUrl = `${process.env.CONVEX_SITE_URL}/api/webhook-proxy`;
        console.log(`Using webhook proxy for localhost URL: ${proxyUrl}`);
        
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            targetUrl: args.webhookUrl,
            payload: payload,
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error(`Crawl webhook proxy failed: ${response.status} ${errorData}`);
          throw new Error(`Webhook proxy failed with status ${response.status}`);
        }

        const responseData = await response.json();
        console.log(`Crawl webhook sent successfully via proxy:`, responseData);
        
        return { success: responseData.success, status: responseData.status };
      } else {
        // Direct request for public URLs
        const response = await fetch(args.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Firecrawl-Observer/1.0',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          console.error(`Crawl webhook failed: ${response.status} ${response.statusText}`);
          throw new Error(`Webhook failed with status ${response.status}`);
        }

        console.log(`Crawl webhook sent successfully`);
        return { success: true, status: response.status };
      }
    } catch (error) {
      console.error("Failed to send crawl webhook:", error);
      throw error;
    }
  },
});