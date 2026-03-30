import type { Metadata } from "next";
import { BackendWakeProvider } from "@/components/backend-wake-provider";
import { ToastProvider } from "@/components/ui/toast-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeamFlow",
  description: "A multi-tenant task management SaaS platform for modern teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <BackendWakeProvider>
          <ToastProvider>{children}</ToastProvider>
        </BackendWakeProvider>
      </body>
    </html>
  );
}
