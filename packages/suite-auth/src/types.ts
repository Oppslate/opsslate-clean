export const HELIOS_SESSION_AUDIENCE = "helios";
export const HELIOS_SESSION_ISSUER = "opsslate-suite";
export const HELIOS_SESSION_VERSION = 1;
export const HELIOS_SESSION_MAX_AGE_SECONDS = 60 * 60;

export type HeliosPrincipal = {
  userId: string;
  companyId: string;
  subject: string;
  issuer: string;
  email: string;
  name: string;
  role: string;
};

export type OpsSlateIdentity = {
  subject: string;
  issuer: string;
  email: string;
  name: string;
};

export type HeliosSessionClaims = HeliosPrincipal & {
  version: typeof HELIOS_SESSION_VERSION;
  audience: typeof HELIOS_SESSION_AUDIENCE;
  sessionIssuer: typeof HELIOS_SESSION_ISSUER;
  issuedAt: number;
  expiresAt: number;
  sessionId: string;
};
