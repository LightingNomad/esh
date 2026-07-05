import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider, SignInButton, UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { mergeGuestIntoRealUser, syncUser } from "@/lib/queries";
import "./globals.css";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/spreadsheet", label: "Spreadsheet" },
  { href: "/analytics", label: "Analytics" },
];

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
    if (email) {
      await mergeGuestIntoRealUser(user.id, email);
    }
  }

  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-black/10 px-4 py-3">
            <div className="flex items-center gap-4">
              <span className="font-semibold">⛳️ Mini Golf</span>
              {user && (
                <nav className="flex gap-3 text-sm">
                  {NAV_LINKS.map((link) => (
                    <Link key={link.href} href={link.href} className="hover:underline">
                      {link.label}
                    </Link>
                  ))}
                </nav>
              )}
            </div>
            {user ? <UserButton /> : <SignInButton mode="modal" />}
          </header>
          <main className="flex-1">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
