import type React from "react"
import "@/app/globals.css"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/toaster"

const inter = Inter({ subsets: ["latin"] })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1f2937",
}

export const metadata: Metadata = {
  title: "Spiritual Baptist Hymnal",
  description: "A digital hymnal application for Spiritual Baptist hymns and choruses",
  generator: 'v0.dev',
  manifest: "/manifest.json",
  metadataBase: new URL('https://your-domain.com'),
  keywords: ['hymns', 'spiritual baptist', 'choruses', 'worship', 'religious', 'digital hymnal', 'pwa'],
  authors: [
    { name: 'Your Name' }
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://your-domain.com',
    title: 'Spiritual Baptist Hymnal',
    description: 'A digital hymnal application with offline support',
    siteName: 'Spiritual Baptist Hymnal',
    images: [
      {
        url: '/icons/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'Spiritual Baptist Hymnal'
      }
    ]
  },
  twitter: {
    card: 'summary',
    title: 'Spiritual Baptist Hymnal',
    description: 'A digital hymnal application with offline support',
    images: ['/icons/icon-512x512.png']
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hymnal",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192x192.png" },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Spiritual Baptist Hymnal" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
