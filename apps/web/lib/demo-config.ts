/**
 * Recipient address for the live hero demo (calendar invite + email).
 *
 * Defaults to the canned Berger fixture. Override per demo machine with
 * NEXT_PUBLIC_DEMO_RECIPIENT_EMAIL to send the real invite to an inbox you can
 * show on stage. NEXT_PUBLIC_ so the same value is inlined for both the client
 * (which sends kunde_email) and the server route (the live allowlist) — set it
 * BEFORE `pnpm dev:web` / `pnpm build:web`.
 */
const configuredRecipient = process.env.NEXT_PUBLIC_DEMO_RECIPIENT_EMAIL?.trim();

export const DEMO_RECIPIENT_EMAIL =
  configuredRecipient || "thomas.berger@example.com";
