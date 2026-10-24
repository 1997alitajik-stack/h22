import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import './globals.css';

const vazirmatn = localFont({
  src: [
    { path: '../fonts/Vazirmatn-Light.woff2', weight: '300', style: 'normal' },
    { path: '../fonts/Vazirmatn-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/Vazirmatn-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/Vazirmatn-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/Vazirmatn-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../fonts/Vazirmatn-ExtraBold.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-vazirmatn',
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: 'سامانه راستا',
    template: '%s | سامانه راستا',
  },
  description: 'راهکار ارزیابی سوابق، تخصص و استعدادها — بانک متقاضیان، جذب و استعلام سوابق سازمانی',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body>{children}</body>
    </html>
  );
}
