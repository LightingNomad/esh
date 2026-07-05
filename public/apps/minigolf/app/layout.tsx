import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider, SignInButton, UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { syncUser } from "@/lib/queries";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mini Golf Score Tracker",
  description: "Collaborative, multi-user mini-golf score tracking and live scorecards.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await currentUser();
  if (user) {
    const email = user.primaryEmailAddress?.emailAddress ?? "";
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || null;
    await syncUser(user.id, email, name);
  }

  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <header className="flex items-center justify-between border-b border-black/10 px-4 py-3">
            <span className="font-semibold">⛳️ Mini Golf</span>
            {user ? <UserButton /> : <SignInButton mode="modal" />}
          </header>
          <main className="flex-1">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
