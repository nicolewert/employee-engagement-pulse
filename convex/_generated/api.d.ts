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
import type * as channels from "../channels.js";
import type * as dashboard from "../dashboard.js";
import type * as lib_claudeAPIClient from "../lib/claudeAPIClient.js";
import type * as lib_sentimentProcessor from "../lib/sentimentProcessor.js";
import type * as lib_sentimentValidator from "../lib/sentimentValidator.js";
import type * as messages from "../messages.js";
import type * as slack from "../slack.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  channels: typeof channels;
  dashboard: typeof dashboard;
  "lib/claudeAPIClient": typeof lib_claudeAPIClient;
  "lib/sentimentProcessor": typeof lib_sentimentProcessor;
  "lib/sentimentValidator": typeof lib_sentimentValidator;
  messages: typeof messages;
  slack: typeof slack;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
