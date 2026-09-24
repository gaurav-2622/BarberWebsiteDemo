import { randomBytes } from "node:crypto";

export const MANAGEMENT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

export function createManagementToken() {
  return randomBytes(32).toString("base64url");
}

export function isManagementToken(value: string) {
  return MANAGEMENT_TOKEN_PATTERN.test(value);
}
