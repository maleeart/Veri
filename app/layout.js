import './globals.css';

export const metadata = {
  title: 'Veri',
  description: 'แอพบันทึกผลตรวจสอบ Fire Pump / Generator — EGAT สำนักงานไทรน้อย',
  icons: { icon: '/logo.png', apple: '/logo.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Veri" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
