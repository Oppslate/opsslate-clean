import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/lib/convex";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/toast";
import { CommandPalette } from "@/components/command-palette";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OpsSlate — Construction Operations",
  description: "Your operations. One slate. Construction workflows on the OpsSlate platform.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "OpsSlate",
    description: "Your operations. One slate. Construction workflows on the OpsSlate platform.",
    type: "website",
    url: "https://opsslate.app",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ff5b00" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={inter.className + " bg-[#0b0f14] text-white min-h-screen"}>
        <ConvexClientProvider>
          <AuthProvider>
            <ToastProvider>
              <CommandPalette />
              {children}
            </ToastProvider>
          </AuthProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
