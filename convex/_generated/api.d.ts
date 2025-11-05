/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as appAuth from "../appAuth.js";
import type * as chatConversations from "../chatConversations.js";
import type * as chatSettings from "../chatSettings.js";
import type * as cleanup from "../cleanup.js";
import type * as complianceQueries from "../complianceQueries.js";
import type * as complianceTemplates from "../complianceTemplates.js";
import type * as complianceTopics from "../complianceTopics.js";
import type * as editorSettings from "../editorSettings.js";
import type * as helpers from "../helpers.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as lib_sanitize from "../lib/sanitize.js";
import type * as researchConversations from "../researchConversations.js";
import type * as researchSettings from "../researchSettings.js";
import type * as savedResearch from "../savedResearch.js";
import type * as seedAllTemplates from "../seedAllTemplates.js";
import type * as seedChatSettings from "../seedChatSettings.js";
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
  appAuth: typeof appAuth;
  chatConversations: typeof chatConversations;
  chatSettings: typeof chatSettings;
  cleanup: typeof cleanup;
  complianceQueries: typeof complianceQueries;
  complianceTemplates: typeof complianceTemplates;
  complianceTopics: typeof complianceTopics;
  editorSettings: typeof editorSettings;
  helpers: typeof helpers;
  "lib/encryption": typeof lib_encryption;
  "lib/sanitize": typeof lib_sanitize;
  researchConversations: typeof researchConversations;
  researchSettings: typeof researchSettings;
  savedResearch: typeof savedResearch;
  seedAllTemplates: typeof seedAllTemplates;
  seedChatSettings: typeof seedChatSettings;
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
