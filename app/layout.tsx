import type { Metadata } from 'next'
import { Onest } from 'next/font/google'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/contexts/ThemeContext'
import './globals.css'

// Self-hosted через next/font: без render-blocking @import к Google и без сдвига вёрстки.
// Кириллица обязательна — у прежнего DM Sans её не было, и русский текст шёл системным шрифтом
const onest = Onest({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
  display: 'swap',
})

// Ставит палитру Саске до первой отрисовки: иначе она включалась только после гидрации,
// и пользователь видел оранжевый акцент, сменяющийся фиолетовым. Синхронизирует ThemeProvider
const THEME_INIT_SCRIPT =
  "try{if(localStorage.getItem('theme-sasuke')==='true')document.documentElement.setAttribute('data-sasuke','true')}catch(e){}"

export const metadata: Metadata = {
  title: 'Last Episode',
  description: 'Your personal media tracker — movies, series and anime in one place',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className={`dark ${onest.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'hsl(213 50% 11%)',
              border: '1px solid hsl(213 44% 16%)',
              color: 'hsl(210 100% 93%)',
            },
          }}
        />
      </body>
    </html>
  )
}