/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as emailConfig from "../emailConfig.js";
import type * as firecrawl from "../firecrawl.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as monitoring from "../monitoring.js";
import type * as notifications from "../notifications.js";
import type * as users from "../users.js";
import type * as webhookPlayground from "../webhookPlayground.js";
import type * as websites from "../websites.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  crons: typeof crons;
  emailConfig: typeof emailConfig;
  firecrawl: typeof firecrawl;
  helpers: typeof helpers;
  http: typeof http;
  monitoring: typeof monitoring;
  notifications: typeof notifications;
  users: typeof users;
  webhookPlayground: typeof webhookPlayground;
  websites: typeof websites;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
