"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { apiBaseUrl } from "@/lib/api";

type BackendWakeStatus = "checking" | "waking" | "awake";

type BackendWakeContextValue = {
  status: BackendWakeStatus;
};

const BackendWakeContext = createContext<BackendWakeContextValue | null>(null);

const backendOrigin = apiBaseUrl.replace(/\/api$/, "");
const wakeEndpoint = `${backendOrigin}/api/health`;

async function pingBackend(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    // A successful health response means the sleeping Render service woke up.
    await fetch(wakeEndpoint, {
      cache: "no-store",
      credentials: "omit",
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function BackendWakeProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<BackendWakeStatus>("checking");
  const settledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;

    async function runWakeFlow() {
      const initialSuccess = await pingBackend(2500);

      if (cancelled) {
        return;
      }

      if (initialSuccess) {
        settledRef.current = true;
        setStatus("awake");
        return;
      }

      setStatus("waking");

      intervalId = window.setInterval(async () => {
        if (settledRef.current) {
          return;
        }

        const wokeUp = await pingBackend(4000);

        if (cancelled || !wokeUp) {
          return;
        }

        settledRef.current = true;
        setStatus("awake");

        if (intervalId) {
          window.clearInterval(intervalId);
        }
      }, 3500);
    }

    void runWakeFlow();

    return () => {
      cancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  const value = useMemo(() => ({ status }), [status]);

  return (
    <BackendWakeContext.Provider value={value}>
      {children}
      {status === "waking" ? (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div className="tf-enter pointer-events-auto flex items-center gap-3 rounded-full border border-[#cbb08a] bg-[#fff7ea] px-5 py-3 text-sm font-medium text-slate-700 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
            <span className="tf-spinner h-4 w-4 border-[2px]" />
            Waking up server, please wait...
          </div>
        </div>
      ) : null}
    </BackendWakeContext.Provider>
  );
}

export function useBackendWakeStatus() {
  const context = useContext(BackendWakeContext);

  if (!context) {
    throw new Error("useBackendWakeStatus must be used within BackendWakeProvider.");
  }

  return context;
}
