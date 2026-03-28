import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
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
        cssLayerName: 'clerk',
        variables: {
          colorPrimary: '#68dbae',
          colorBackground: '#1b211e',
          colorInputBackground: '#303633',
          colorText: '#dee4de',
          colorTextSecondary: '#bccac1',
          borderRadius: '0.75rem',
        },
        elements: {
          card: 'bg-surface-container ghost-border',
          formButtonPrimary: 'bg-primary text-on-primary hover:opacity-90',
          footerActionLink: 'text-primary hover:opacity-80',
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
