import type { Metadata, Viewport } from "next";
import "./globals.css";
import { I18nProvider } from "@/i18n";
import { CartProvider } from "@/components/cart/CartContext";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { getCurrentSession } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "SocietyBuy - Wholesale Grocery Pool for Housing Societies",
  description:
    "Pool monthly orders with your housing society neighbors for staples and household supplies at wholesale slab prices.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#16a34a",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();

  const user = session
    ? {
        name: session.name,
        phone: session.phone,
        activeRole: session.activeRole,
        activeSocietyName: session.memberships[0]?.societyName,
      }
    : null;

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-gray-50 text-gray-900 antialiased">
        <I18nProvider>
          <CartProvider>
            <Header user={user} />
            <main className="flex-1">{children}</main>
            <Footer />
          </CartProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

