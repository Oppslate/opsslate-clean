"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastCtx {
  toast: (message: string, type?: Toast["type"]) => void;
}

const Ctx = createContext<ToastCtx>({ toast: () => {} });
export const useToast = () => useContext(Ctx);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-slide-up border ${
              t.type === "success"
                ? "bg-green-900/90 text-green-200 border-green-700"
                : t.type === "error"
                ? "bg-red-900/90 text-red-200 border-red-700"
                : "bg-blue-900/90 text-blue-200 border-blue-700"
            }`}
          >
            <span className="mr-2">
              {t.type === "success" ? "✅" : t.type === "error" ? "❌" : "ℹ️"}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
