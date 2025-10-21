import './globals.css'

export const metadata = {
  title: 'MF King Vehicle Inspection',
  description: 'Pre-start vehicle inspection system for MF King Engineering',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}