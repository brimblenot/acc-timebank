import { Cormorant_Garamond, Nunito } from 'next/font/google'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  variable: '--font-cormorant',
})

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito',
})

export const metadata = {
  title: 'ACC Timebank',
  description: 'Alachua Community Collective — A Mutual Aid Network',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${nunito.variable}`}>
      <body style={{ fontFamily: 'var(--font-nunito)', backgroundColor: '#2A272A', color: '#FEFFFF' }}>
        {children}
      </body>
    </html>
  )
}