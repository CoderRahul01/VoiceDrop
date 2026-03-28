import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "VoiceDrop | AI Podcast Generator",
  description: "Turn any article into a high-quality AI podcast episode instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        cssLayerName: 'clerk',
        variables: {
          colorPrimary: '#68dbae',
          colorBackground: '#141a17',
          colorInputBackground: '#1e2622',
          colorInputText: '#dee4de',
          colorText: '#dee4de',
          colorTextSecondary: '#b9c8be',
          colorNeutral: '#dee4de',
          colorShimmer: 'transparent',
          borderRadius: '0.75rem',
          fontFamily: 'Inter, ui-sans-serif, system-ui',
          fontSize: '14px',
        },
        elements: {
          card: { backgroundColor: '#191f1c', borderColor: 'rgba(58,70,66,0.5)' },
          formButtonPrimary: { backgroundColor: '#68dbae', color: '#003827', fontWeight: '700' },
          footerActionLink: { color: '#68dbae' },
        },
      }}
    >
      <html lang="en" className={`${inter.variable} dark`}>
        <head>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
          />
        </head>
        <body className="font-sans antialiased text-foreground bg-background">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
