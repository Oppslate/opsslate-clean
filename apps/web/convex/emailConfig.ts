const DEFAULT_FROM = "OpsSlate <notifications@opsslate.app>";

export function emailFrom(label?: string) {
  const configured = process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
  if (!label) return configured;
  const match = configured.match(/<(.+)>/);
  return match ? `${label} <${match[1]}>` : configured;
}

export function emailReplyTo() {
  return process.env.EMAIL_REPLY_TO?.trim() || undefined;
}
