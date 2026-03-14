import type { Metadata } from 'next'
import { Geologica, JetBrains_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import PWARegister from '@/components/PWARegister'
import './globals.css'

const geologica = Geologica({
  variable: '--font-geologica',
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600', '700', '800'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'Смена',
  description: 'Управление задачами для ресторанов и кафе',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Смена',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <meta name="theme-color" content="#1a1a1a" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className={`${geologica.variable} ${jetbrainsMono.variable} antialiased`}>
        <PWARegister />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
