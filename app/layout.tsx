import { Cormorant_Garamond, Nunito } from 'next/font/google'
import './globals.css'
import { MessagesProvider } from './context/MessagesContext'
import { NotificationsProvider } from './context/NotificationsContext'
import MessagesOverlay from './components/MessagesOverlay'
import FloatingMessageButton from './components/FloatingMessageButton'
import AccessibilityWidget from './components/AccessibilityWidget'
import SuspensionGuard from './components/SuspensionGuard'
import AdminBanner from './components/AdminBanner'

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
      <body style={{ fontFamily: 'var(--font-nunito)', margin: 0, padding: 0 }}>
        <MessagesProvider>
          <NotificationsProvider>
            <SuspensionGuard />
            <AdminBanner />
            {children}
            <MessagesOverlay />
            <FloatingMessageButton />
            <AccessibilityWidget />
          </NotificationsProvider>
        </MessagesProvider>
      </body>
    </html>
  )
}