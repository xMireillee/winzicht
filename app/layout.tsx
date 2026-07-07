import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
})
const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'Gunningsbrief-analyse · Corus Advies',
  description:
    'Interne tool van Corus Advies om gunningsbrieven te analyseren, coderen en leren van aanbestedingen.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0A1322',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="nl" className={`${plexSans.variable} ${plexMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        {/* Atmospheric backdrop: soft out-of-focus image, dimmed so glass
            panels and white text stay readable. Fixed behind everything. */}
        <div aria-hidden="true" className="fixed inset-0 -z-10 bg-[#0A1322]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/chorus.png"
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(rgba(6,9,22,0.28), rgba(6,9,22,0.45))',
            }}
          />
        </div>
        {children}
        <Toaster />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
