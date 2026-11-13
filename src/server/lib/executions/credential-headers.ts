// Model SDKs send their API key, and so the execution token, each in its own header.
// The runner imports this list at runtime: it must depend on nothing.
export const credentialHeaders = [
  "authorization",
  "x-api-key",
  "x-goog-api-key",
  "api-key",
];
