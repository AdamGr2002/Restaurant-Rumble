import './globals.css'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { ConvexProvider, ConvexReactClient } from "convex/react"

const inter = Inter({ subsets: ['latin'] })

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <ConvexProvider client={convex}>
        <html lang="en">
          <body className={inter.className}>{children}</body>
        </html>
      </ConvexProvider>
    </ClerkProvider>
  )
}