/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiAnalysis from "../aiAnalysis.js";
import type * as alertEmail from "../alertEmail.js";
import type * as autoSetup from "../autoSetup.js";
import type * as chatSettings from "../chatSettings.js";
import type * as complianceAI from "../complianceAI.js";
import type * as complianceChanges from "../complianceChanges.js";
import type * as complianceCrawler from "../complianceCrawler.js";
import type * as complianceDeadlines from "../complianceDeadlines.js";
import type * as complianceImport from "../complianceImport.js";
import type * as complianceParser from "../complianceParser.js";
import type * as compliancePriority from "../compliancePriority.js";
import type * as complianceQueries from "../complianceQueries.js";
import type * as complianceRAG from "../complianceRAG.js";
import type * as complianceTemplates from "../complianceTemplates.js";
import type * as complianceWebsiteIntegration from "../complianceWebsiteIntegration.js";
import type * as crawl from "../crawl.js";
import type * as crons from "../crons.js";
import type * as csvImport from "../csvImport.js";
import type * as embeddingJobs from "../embeddingJobs.js";
import type * as embeddingManager from "../embeddingManager.js";
import type * as firecrawl from "../firecrawl.js";
import type * as firecrawlKeys from "../firecrawlKeys.js";
import type * as geminiFlashLite from "../geminiFlashLite.js";
import type * as generateEmbeddings from "../generateEmbeddings.js";
import type * as helpers from "../helpers.js";
import type * as importComplianceReports from "../importComplianceReports.js";
import type * as jurisdictionDetails from "../jurisdictionDetails.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as lib_sanitize from "../lib/sanitize.js";
import type * as migrateEmbeddings from "../migrateEmbeddings.js";
import type * as monitoring from "../monitoring.js";
import type * as notifications from "../notifications.js";
import type * as reportImport from "../reportImport.js";
import type * as ruleDetails from "../ruleDetails.js";
import type * as singleUserSetup from "../singleUserSetup.js";
import type * as testActions from "../testActions.js";
import type * as testChatSources from "../testChatSources.js";
import type * as testEmbeddings from "../testEmbeddings.js";
import type * as testingMode from "../testingMode.js";
import type * as userSettings from "../userSettings.js";
import type * as websites from "../websites.js";
import type * as workpoolSimple from "../workpoolSimple.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  aiAnalysis: typeof aiAnalysis;
  alertEmail: typeof alertEmail;
  autoSetup: typeof autoSetup;
  chatSettings: typeof chatSettings;
  complianceAI: typeof complianceAI;
  complianceChanges: typeof complianceChanges;
  complianceCrawler: typeof complianceCrawler;
  complianceDeadlines: typeof complianceDeadlines;
  complianceImport: typeof complianceImport;
  complianceParser: typeof complianceParser;
  compliancePriority: typeof compliancePriority;
  complianceQueries: typeof complianceQueries;
  complianceRAG: typeof complianceRAG;
  complianceTemplates: typeof complianceTemplates;
  complianceWebsiteIntegration: typeof complianceWebsiteIntegration;
  crawl: typeof crawl;
  crons: typeof crons;
  csvImport: typeof csvImport;
  embeddingJobs: typeof embeddingJobs;
  embeddingManager: typeof embeddingManager;
  firecrawl: typeof firecrawl;
  firecrawlKeys: typeof firecrawlKeys;
  geminiFlashLite: typeof geminiFlashLite;
  generateEmbeddings: typeof generateEmbeddings;
  helpers: typeof helpers;
  importComplianceReports: typeof importComplianceReports;
  jurisdictionDetails: typeof jurisdictionDetails;
  "lib/encryption": typeof lib_encryption;
  "lib/sanitize": typeof lib_sanitize;
  migrateEmbeddings: typeof migrateEmbeddings;
  monitoring: typeof monitoring;
  notifications: typeof notifications;
  reportImport: typeof reportImport;
  ruleDetails: typeof ruleDetails;
  singleUserSetup: typeof singleUserSetup;
  testActions: typeof testActions;
  testChatSources: typeof testChatSources;
  testEmbeddings: typeof testEmbeddings;
  testingMode: typeof testingMode;
  userSettings: typeof userSettings;
  websites: typeof websites;
  workpoolSimple: typeof workpoolSimple;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {
  resend: {
    lib: {
      cancelEmail: FunctionReference<
        "mutation",
        "internal",
        { emailId: string },
        null
      >;
      cleanupAbandonedEmails: FunctionReference<
        "mutation",
        "internal",
        { olderThan?: number },
        null
      >;
      cleanupOldEmails: FunctionReference<
        "mutation",
        "internal",
        { olderThan?: number },
        null
      >;
      createManualEmail: FunctionReference<
        "mutation",
        "internal",
        {
          from: string;
          headers?: Array<{ name: string; value: string }>;
          replyTo?: Array<string>;
          subject: string;
          to: string;
        },
        string
      >;
      get: FunctionReference<
        "query",
        "internal",
        { emailId: string },
        {
          complained: boolean;
          createdAt: number;
          errorMessage?: string;
          finalizedAt: number;
          from: string;
          headers?: Array<{ name: string; value: string }>;
          html?: string;
          opened: boolean;
          replyTo: Array<string>;
          resendId?: string;
          segment: number;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
          subject: string;
          text?: string;
          to: string;
        } | null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { emailId: string },
        {
          complained: boolean;
          errorMessage: string | null;
          opened: boolean;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
        } | null
      >;
      handleEmailEvent: FunctionReference<
        "mutation",
        "internal",
        { event: any },
        null
      >;
      sendEmail: FunctionReference<
        "mutation",
        "internal",
        {
          from: string;
          headers?: Array<{ name: string; value: string }>;
          html?: string;
          options: {
            apiKey: string;
            initialBackoffMs: number;
            onEmailEvent?: { fnHandle: string };
            retryAttempts: number;
            testMode: boolean;
          };
          replyTo?: Array<string>;
          subject: string;
          text?: string;
          to: string;
        },
        string
      >;
      updateManualEmail: FunctionReference<
        "mutation",
        "internal",
        {
          emailId: string;
          errorMessage?: string;
          resendId?: string;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
        },
        null
      >;
    };
  };
};
