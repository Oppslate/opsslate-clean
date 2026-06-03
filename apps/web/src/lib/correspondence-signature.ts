export type CorrespondenceSignatureProfile = {
  displayName: string;
  title: string;
  cellPhone: string;
  email: string;
};

type SignatureUser = {
  _id?: string;
  email?: string;
  name?: string;
};

export function signatureStorageKey(user?: SignatureUser | null) {
  const id = user?._id || user?.email || "anonymous";
  return `opsslate_correspondence_signature:${String(id).trim().toLowerCase()}`;
}

export function defaultSignatureProfile(user?: SignatureUser | null): CorrespondenceSignatureProfile {
  return {
    displayName: user?.name || "",
    title: "",
    cellPhone: "",
    email: user?.email || "",
  };
}

export function loadSignatureProfile(user?: SignatureUser | null): CorrespondenceSignatureProfile {
  const fallback = defaultSignatureProfile(user);
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(signatureStorageKey(user));
    if (!stored) return fallback;
    const parsed = JSON.parse(stored) as Partial<CorrespondenceSignatureProfile>;
    return {
      displayName: parsed.displayName || fallback.displayName,
      title: parsed.title || fallback.title,
      cellPhone: parsed.cellPhone || fallback.cellPhone,
      email: parsed.email || fallback.email,
    };
  } catch {
    return fallback;
  }
}

export function saveSignatureProfile(user: SignatureUser, profile: CorrespondenceSignatureProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(signatureStorageKey(user), JSON.stringify(profile));
}

export function formatCorrespondenceSignature(
  profile: CorrespondenceSignatureProfile | undefined,
  companyName: string | undefined,
  user?: SignatureUser | null
) {
  const fallback = defaultSignatureProfile(user);
  const signature = {
    displayName: profile?.displayName || fallback.displayName || "Sender",
    title: profile?.title || fallback.title,
    cellPhone: profile?.cellPhone || fallback.cellPhone,
    email: profile?.email || fallback.email,
  };
  return [
    "Thank you,",
    signature.displayName,
    signature.title,
    companyName || "OpsSlate",
    signature.cellPhone ? `Cell: ${signature.cellPhone}` : "",
    signature.email,
  ].filter(Boolean).join("\n");
}

export function isSignatureComplete(profile: CorrespondenceSignatureProfile) {
  return Boolean(profile.displayName && profile.title && profile.cellPhone && profile.email);
}
