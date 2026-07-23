"use client";

import { CheckCircle2, Info, XCircle } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    (message: string, type: Toast["type"] = "success") => {
      const id = nextId++;
      setToasts((current) => [...current, { id, message, type }]);
      setTimeout(
        () => setToasts((current) => current.filter((item) => item.id !== id)),
        3000,
      );
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role={item.type === "error" ? "alert" : "status"}
            className={`animate-slide-up pointer-events-auto flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
              item.type === "success"
                ? "border-green-700 bg-green-900/90 text-green-200"
                : item.type === "error"
                  ? "border-red-700 bg-red-900/90 text-red-200"
                  : "border-blue-700 bg-blue-900/90 text-blue-200"
            }`}
          >
            {item.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            ) : item.type === "error" ? (
              <XCircle className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <Info className="size-4 shrink-0" aria-hidden="true" />
            )}
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
