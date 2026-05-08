"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

const AUTH_URL = "https://opsslate-auth.vercel.app";
const OPSLATE_COOKIE_DOMAIN = ".opsslate.app";
const OPSLATE_LOGIN_URL = "https://www.opsslate.app/login";
const OPSLATE_LOGOUT_COOKIE = "opsslate_logged_out";

function getCookie(name: string) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

function setSharedSessionCookie(token: string) {
  document.cookie = `opsslate_token=${encodeURIComponent(token)}; path=/; domain=${OPSLATE_COOKIE_DOMAIN}; max-age=${60 * 60 * 24 * 30}; secure; samesite=lax`;
}

function setSuiteConvexCookie(token: string) {
  document.cookie = `opsslate_convex_token=${encodeURIComponent(token)}; path=/; domain=${OPSLATE_COOKIE_DOMAIN}; max-age=${60 * 60 * 24 * 30}; secure; samesite=lax`;
}

function clearSharedSessionCookie() {
  document.cookie = `opsslate_token=; path=/; domain=${OPSLATE_COOKIE_DOMAIN}; max-age=0; secure; samesite=lax`;
  document.cookie = `opsslate_convex_token=; path=/; domain=${OPSLATE_COOKIE_DOMAIN}; max-age=0; secure; samesite=lax`;
}

function markSuiteLoggedOut() {
  document.cookie = `${OPSLATE_LOGOUT_COOKIE}=1; path=/; domain=${OPSLATE_COOKIE_DOMAIN}; max-age=${60 * 60 * 24 * 30}; secure; samesite=lax`;
}

function clearSuiteLogoutMarker() {
  document.cookie = `${OPSLATE_LOGOUT_COOKIE}=; path=/; domain=${OPSLATE_COOKIE_DOMAIN}; max-age=0; secure; samesite=lax`;
}

async function persistSuiteSession(tokens: { sharedToken?: string; convexToken?: string }) {
  if (tokens.sharedToken) setSharedSessionCookie(tokens.sharedToken);
  if (tokens.convexToken) setSuiteConvexCookie(tokens.convexToken);
  clearSuiteLogoutMarker();

  try {
    await fetch("/api/auth/suite-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tokens),
    });
  } catch {
    // Browser cookies above are the fallback if the server bridge is unavailable.
  }
}

interface User {
  _id: string;
  companyId: Id<"companies">;
  email: string;
  name: string;
  role?: string;
}

interface AuthCtx {
  user: User | null;
  token: string;
  login: (email: string, password: string) => Promise<void>;
  signup: (companyName: string, email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (getCookie(OPSLATE_LOGOUT_COOKIE) === "1") {
      localStorage.removeItem("eq_token");
      localStorage.removeItem("opsslate_token");
      localStorage.removeItem("opsslate_user");
      clearSharedSessionCookie();
      setToken("");
      setLoading(false);
      return;
    }

    const t = localStorage.getItem("eq_token") || "";
    const sharedToken = localStorage.getItem("opsslate_token") || "";
    if (sharedToken || t) void persistSuiteSession({ sharedToken, convexToken: t });
    setToken(t);
    setLoading(false);
  }, []);

  const user = useQuery(api.auth.me, token ? { token } : "skip") as User | null | undefined;
  const provisionMut = useMutation(api.auth.provisionFromSharedAuth);

  const loginMut = useMutation(api.auth.login);

  useEffect(() => {
    if (token && user === null) {
      localStorage.removeItem("eq_token");
      clearSharedSessionCookie();
      setToken("");
    }
  }, [token, user]);

  const login = async (email: string, password: string) => {
    // Try shared auth service first
    try {
      const authRes = await fetch(`${AUTH_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const authData = await authRes.json();

      if (authRes.ok) {
        clearSuiteLogoutMarker();
        localStorage.setItem("opsslate_token", authData.token);
        localStorage.setItem("opsslate_user", JSON.stringify(authData.user));

        const res = await provisionMut({
          email: authData.user.email,
          name: authData.user.name,
          companyName: authData.user.companyName || "My Company",
        });
        localStorage.setItem("eq_token", res.token);
        await persistSuiteSession({ sharedToken: authData.token, convexToken: res.token });
        setToken(res.token);
        return;
      }
    } catch {
      // Shared auth unavailable — fall through to direct login
    }

    // Fallback: direct Convex login
    const res = await loginMut({ email, password });
    clearSuiteLogoutMarker();
    localStorage.setItem("eq_token", res.token);
    await persistSuiteSession({ convexToken: res.token });
    setToken(res.token);
  };

  const signup = async (companyName: string, email: string, password: string, name: string) => {
    // Register with shared auth
    const authRes = await fetch(`${AUTH_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, companyName }),
    });
    const authData = await authRes.json();
    
    if (!authRes.ok) {
      throw new Error(authData.error || "Signup failed");
    }

    localStorage.setItem("opsslate_token", authData.token);
    localStorage.setItem("opsslate_user", JSON.stringify(authData.user));
    clearSuiteLogoutMarker();

    // Provision local OpsSlate account
    const res = await provisionMut({
      email,
      name,
      companyName,
    });
    localStorage.setItem("eq_token", res.token);
    await persistSuiteSession({ sharedToken: authData.token, convexToken: res.token });
    setToken(res.token);
  };

  const logout = () => {
    const sharedToken = localStorage.getItem("opsslate_token");
    if (sharedToken) {
      fetch(`${AUTH_URL}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sharedToken}` },
      }).catch(() => {});
    }
    localStorage.removeItem("eq_token");
    localStorage.removeItem("opsslate_token");
    localStorage.removeItem("opsslate_user");
    clearSharedSessionCookie();
    markSuiteLoggedOut();
    fetch("/api/auth/suite-session", { method: "DELETE" }).catch(() => {});
    setToken("");
    window.location.href = OPSLATE_LOGIN_URL;
  };

  const verifyingSession = Boolean(token) && user === undefined;

  return (
    <AuthContext.Provider value={{ user: user ?? null, token, login, signup, logout, loading: loading || verifyingSession }}>
      {children}
    </AuthContext.Provider>
  );
}
