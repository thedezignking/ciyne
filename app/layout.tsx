import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import {
  Plus_Jakarta_Sans,
  Dancing_Script,
  Caveat,
  Great_Vibes,
} from 'next/font/google'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

// Handwriting faces for typed signatures.
const dancing = Dancing_Script({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--font-dancing',
  display: 'swap',
})
const caveat = Caveat({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--font-caveat',
  display: 'swap',
})
const greatVibes = Great_Vibes({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-great-vibes',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Ciyne — Sign PDFs free, no watermark',
  description:
    'Place your handwritten signature on any PDF instantly. No account, no watermark, no quality loss.',
  openGraph: {
    title: 'Ciyne — Sign PDFs free',
    description:
      'Upload a PDF and your signature. Drag to position. Download the signed document instantly.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${jakarta.variable} ${dancing.variable} ${caveat.variable} ${greatVibes.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
