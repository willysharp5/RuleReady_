/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as chatSettings from "../chatSettings.js";
import type * as complianceAI from "../complianceAI.js";
import type * as complianceChanges from "../complianceChanges.js";
import type * as complianceCrawler from "../complianceCrawler.js";
import type * as complianceDeadlines from "../complianceDeadlines.js";
import type * as complianceGeneration from "../complianceGeneration.js";
import type * as complianceImport from "../complianceImport.js";
import type * as complianceParser from "../complianceParser.js";
import type * as compliancePriority from "../compliancePriority.js";
import type * as complianceQueries from "../complianceQueries.js";
import type * as complianceRAG from "../complianceRAG.js";
import type * as complianceTemplates from "../complianceTemplates.js";
import type * as complianceWebsiteIntegration from "../complianceWebsiteIntegration.js";
import type * as crawl from "../crawl.js";
import type * as crawlActions from "../crawlActions.js";
import type * as crons from "../crons.js";
import type * as csvImport from "../csvImport.js";
import type * as databaseCleanup from "../databaseCleanup.js";
import type * as embeddingJobs from "../embeddingJobs.js";
import type * as embeddingManager from "../embeddingManager.js";
import type * as firecrawl from "../firecrawl.js";
import type * as firecrawlKeys from "../firecrawlKeys.js";
import type * as firecrawlKeysActions from "../firecrawlKeysActions.js";
import type * as geminiFlashLite from "../geminiFlashLite.js";
import type * as generateEmbeddings from "../generateEmbeddings.js";
import type * as helpers from "../helpers.js";
import type * as importComplianceReports from "../importComplianceReports.js";
import type * as jurisdictionDetails from "../jurisdictionDetails.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as lib_sanitize from "../lib/sanitize.js";
import type * as monitoring from "../monitoring.js";
import type * as ruleDetails from "../ruleDetails.js";
import type * as savedResearch from "../savedResearch.js";
import type * as singleUserSetup from "../singleUserSetup.js";
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
  chatSettings: typeof chatSettings;
  complianceAI: typeof complianceAI;
  complianceChanges: typeof complianceChanges;
  complianceCrawler: typeof complianceCrawler;
  complianceDeadlines: typeof complianceDeadlines;
  complianceGeneration: typeof complianceGeneration;
  complianceImport: typeof complianceImport;
  complianceParser: typeof complianceParser;
  compliancePriority: typeof compliancePriority;
  complianceQueries: typeof complianceQueries;
  complianceRAG: typeof complianceRAG;
  complianceTemplates: typeof complianceTemplates;
  complianceWebsiteIntegration: typeof complianceWebsiteIntegration;
  crawl: typeof crawl;
  crawlActions: typeof crawlActions;
  crons: typeof crons;
  csvImport: typeof csvImport;
  databaseCleanup: typeof databaseCleanup;
  embeddingJobs: typeof embeddingJobs;
  embeddingManager: typeof embeddingManager;
  firecrawl: typeof firecrawl;
  firecrawlKeys: typeof firecrawlKeys;
  firecrawlKeysActions: typeof firecrawlKeysActions;
  geminiFlashLite: typeof geminiFlashLite;
  generateEmbeddings: typeof generateEmbeddings;
  helpers: typeof helpers;
  importComplianceReports: typeof importComplianceReports;
  jurisdictionDetails: typeof jurisdictionDetails;
  "lib/encryption": typeof lib_encryption;
  "lib/sanitize": typeof lib_sanitize;
  monitoring: typeof monitoring;
  ruleDetails: typeof ruleDetails;
  savedResearch: typeof savedResearch;
  singleUserSetup: typeof singleUserSetup;
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

export declare const components: {};
