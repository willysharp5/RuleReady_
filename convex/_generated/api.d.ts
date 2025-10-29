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
import type * as complianceQueries from "../complianceQueries.js";
import type * as complianceRAG from "../complianceRAG.js";
import type * as complianceTemplates from "../complianceTemplates.js";
import type * as embeddingManager from "../embeddingManager.js";
import type * as generateEmbeddings from "../generateEmbeddings.js";
import type * as helpers from "../helpers.js";
import type * as jurisdictionDetails from "../jurisdictionDetails.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as lib_sanitize from "../lib/sanitize.js";
import type * as migrateJurisdictionCodes from "../migrateJurisdictionCodes.js";
import type * as researchConversations from "../researchConversations.js";
import type * as researchSettings from "../researchSettings.js";
import type * as savedResearch from "../savedResearch.js";
import type * as userSettings from "../userSettings.js";

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
  complianceQueries: typeof complianceQueries;
  complianceRAG: typeof complianceRAG;
  complianceTemplates: typeof complianceTemplates;
  embeddingManager: typeof embeddingManager;
  generateEmbeddings: typeof generateEmbeddings;
  helpers: typeof helpers;
  jurisdictionDetails: typeof jurisdictionDetails;
  "lib/encryption": typeof lib_encryption;
  "lib/sanitize": typeof lib_sanitize;
  migrateJurisdictionCodes: typeof migrateJurisdictionCodes;
  researchConversations: typeof researchConversations;
  researchSettings: typeof researchSettings;
  savedResearch: typeof savedResearch;
  userSettings: typeof userSettings;
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
