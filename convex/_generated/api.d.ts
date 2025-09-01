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
import type * as apiKeys from "../apiKeys.js";
import type * as auth from "../auth.js";
import type * as complianceChanges from "../complianceChanges.js";
import type * as complianceCrawler from "../complianceCrawler.js";
import type * as complianceImport from "../complianceImport.js";
import type * as complianceParser from "../complianceParser.js";
import type * as compliancePriority from "../compliancePriority.js";
import type * as complianceQueries from "../complianceQueries.js";
import type * as complianceWebsiteIntegration from "../complianceWebsiteIntegration.js";
import type * as crawl from "../crawl.js";
import type * as crons from "../crons.js";
import type * as csvImport from "../csvImport.js";
import type * as emailConfig from "../emailConfig.js";
import type * as emailManager from "../emailManager.js";
import type * as embeddingJobs from "../embeddingJobs.js";
import type * as embeddingManager from "../embeddingManager.js";
import type * as firecrawl from "../firecrawl.js";
import type * as firecrawlKeys from "../firecrawlKeys.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as lib_sanitize from "../lib/sanitize.js";
import type * as monitoring from "../monitoring.js";
import type * as notifications from "../notifications.js";
import type * as reportImport from "../reportImport.js";
import type * as testActions from "../testActions.js";
import type * as userSettings from "../userSettings.js";
import type * as users from "../users.js";
import type * as webhookPlayground from "../webhookPlayground.js";
import type * as websites from "../websites.js";

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
  apiKeys: typeof apiKeys;
  auth: typeof auth;
  complianceChanges: typeof complianceChanges;
  complianceCrawler: typeof complianceCrawler;
  complianceImport: typeof complianceImport;
  complianceParser: typeof complianceParser;
  compliancePriority: typeof compliancePriority;
  complianceQueries: typeof complianceQueries;
  complianceWebsiteIntegration: typeof complianceWebsiteIntegration;
  crawl: typeof crawl;
  crons: typeof crons;
  csvImport: typeof csvImport;
  emailConfig: typeof emailConfig;
  emailManager: typeof emailManager;
  embeddingJobs: typeof embeddingJobs;
  embeddingManager: typeof embeddingManager;
  firecrawl: typeof firecrawl;
  firecrawlKeys: typeof firecrawlKeys;
  helpers: typeof helpers;
  http: typeof http;
  "lib/encryption": typeof lib_encryption;
  "lib/sanitize": typeof lib_sanitize;
  monitoring: typeof monitoring;
  notifications: typeof notifications;
  reportImport: typeof reportImport;
  testActions: typeof testActions;
  userSettings: typeof userSettings;
  users: typeof users;
  webhookPlayground: typeof webhookPlayground;
  websites: typeof websites;
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
      get: FunctionReference<"query", "internal", { emailId: string }, any>;
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
            | "bounced";
        }
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
    };
  };
};
