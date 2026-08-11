#!/usr/bin/env node
/**
 * Signs a fulfillment order and POSTs it at `provision-from-quiz`, the way the
 * quiz funnel will.
 *
 * Run it twice with the same --key. The second run must answer
 * `created: false` and send no second email — that is the idempotency guard
 * doing its job, and it is the single most important behaviour of the receiver:
 * Stripe redelivers, the sender's outbox retries, and a buyer must still end up
 * with exactly one account.
 *
 *   node scripts/test-provision.mjs \
 *     --url https://<ref>.supabase.co/functions/v1/provision-from-quiz \
 *     --secret $FULFILLMENT_SIGNING_SECRET \
 *     --email you+quiz1@example.com
 *
 * Then check, in this project: auth.users, profiles, user_body_profiles,
 * academy_members, quiz_provisions — and the inbox.
 */
import { createHmac, randomBytes } from "node:crypto";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    url: { type: "string" },
    secret: { type: "string" },
    email: { type: "string" },
    key: { type: "string" },
    locale: { type: "string", default: "es" },
    action: { type: "string", default: "provision" },
    // Proves the receiver rejects what it should. Without checking the negative
    // case, "it returned 200" only tells you the endpoint is reachable.
    "bad-signature": { type: "boolean", default: false },
    stale: { type: "boolean", default: false },
  },
});

const url = values.url ?? process.env.PROVISION_URL;
const secret = values.secret ?? process.env.FULFILLMENT_SIGNING_SECRET;
const email = values.email;

if (!url || !secret || !email) {
  console.error("usage: --url <endpoint> --secret <hmac secret> --email <address> [--key cs_test_...] [--locale es|pt|en] [--action provision|revoke] [--bad-signature] [--stale]");
  process.exit(1);
}

const idempotencyKey = values.key ?? `cs_test_${randomBytes(12).toString("hex")}`;

const order = {
  version: "1",
  idempotencyKey,
  action: values.action,
  occurredAt: new Date().toISOString(),
  source: {
    platform: "moove-quiz",
    tenantSlug: "tai-chi",
    quizSlug: "tai-chi-yoga",
    locale: values.locale,
    visitorId: "test-visitor",
    sessionId: "test-session",
  },
  customer: { email, name: "María Test", phone: null },
  subscription: {
    planId: "quarterly",
    stripeCustomerId: "cus_test_123",
    stripeSubscriptionId: "sub_test_123",
    amountTotal: 3999,
    currency: "usd",
    status: "active",
  },
  profile: {
    gender: "female",
    ageYears: 55,
    heightCm: 165,
    weightKg: 78.5,
    targetWeightKg: 65,
    activityLevel: "sedentary",
    goal: "lose_weight",
    estimated: ["ageYears", "activityLevel"],
  },
};

// Stringified once. The signature covers these exact bytes, so re-serializing
// before sending would break verification the moment key order differed.
const rawBody = JSON.stringify(order);
const timestamp = values.stale
  ? Math.floor(Date.now() / 1000) - 400 // outside the 300s tolerance
  : Math.floor(Date.now() / 1000);
const signingSecret = values["bad-signature"] ? `${secret}-wrong` : secret;
const signature = createHmac("sha256", signingSecret).update(`${timestamp}.${rawBody}`).digest("hex");

console.log(`POST ${url}`);
console.log(`  idempotencyKey: ${idempotencyKey}`);
console.log(`  action:         ${order.action}`);
console.log(`  email:          ${email}`);
if (values["bad-signature"]) console.log("  (deliberately wrong signature — expecting 401)");
if (values.stale) console.log("  (deliberately stale timestamp — expecting 401)");

const response = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-moove-signature": `t=${timestamp},v1=${signature}`,
  },
  body: rawBody,
});

const text = await response.text();
console.log(`\n${response.status} ${response.statusText}`);
console.log(text);

if (values["bad-signature"] || values.stale) {
  process.exit(response.status === 401 ? 0 : 1);
}
process.exit(response.ok ? 0 : 1);
