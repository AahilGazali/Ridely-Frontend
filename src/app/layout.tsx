import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import { Inter } from "next/font/google";
import { StoreHydrator } from "@/components/StoreHydrator";
import { AuthSync } from "@/components/AuthSync";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Ridely - Ride or Drive",
  description: "Book rides or accept ride requests",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/rider/dashboard"
      afterSignUpUrl="/rider/dashboard"
    >
      <html lang="en" className={inter.variable}>
        <body className="min-h-screen font-sans">
          <StoreHydrator />
          <AuthSync />
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#1a1a1a",
                color: "#fff",
                borderRadius: "12px",
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
