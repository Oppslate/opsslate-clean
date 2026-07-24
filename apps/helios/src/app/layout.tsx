import { ClerkProvider } from "@clerk/nextjs";
import { ToastProvider } from "@opsslate/suite-ui/toast";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Helios — Construction Intelligence",
  description:
    "Independent construction intelligence for heavy highway estimating.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      localization={{
        signIn: {
          start: {
            title: "Sign in to Helios",
            titleCombined: "Sign in to Helios",
            subtitle: "Welcome back. Sign in to continue.",
            subtitleCombined: "Welcome back. Sign in to continue.",
          },
        },
        signUp: {
          start: {
            title: "Create your Helios account",
            titleCombined: "Create your Helios account",
            subtitle: "Start your private Helios workspace.",
            subtitleCombined: "Start your private Helios workspace.",
          },
        },
      }}
    >
      <html lang="en" className="dark">
        <body
          className={`${inter.className} min-h-screen bg-background text-foreground`}
        >
          <ToastProvider>{children}</ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
