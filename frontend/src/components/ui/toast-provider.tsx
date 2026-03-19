"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneClasses: Record<ToastTone, string> = {
  success: "border-[#2a9d8f]/20 bg-[#edf8f5] text-[#1f6c63]",
  error: "border-[#e76f51]/25 bg-[#fff0eb] text-[#a13f24]",
  info: "border-[#2563eb]/18 bg-[#eef4ff] text-[#1e40af]",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);

    setItems((current) => [...current, { id, message, tone }]);

    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-5 top-5 z-50 flex w-[min(360px,calc(100vw-2.5rem))] flex-col gap-3">
        {items.map((item) => (
          <div
            className={`tf-enter pointer-events-auto rounded-2xl border px-4 py-3 text-sm font-medium shadow-[0_18px_50px_rgba(15,23,42,0.12)] ${toneClasses[item.tone]}`}
            key={item.id}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}
