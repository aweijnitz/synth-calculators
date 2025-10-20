import type { Metadata } from 'next';
import { Roboto_Flex } from 'next/font/google';
import ThemeRegistry from './ThemeRegistry';
import './globals.css';

const robotoFlex = Roboto_Flex({ subsets: ['latin'], variable: '--font-roboto-flex' });

export const metadata: Metadata = {
  title: 'Synth Calculators',
  description: 'Quick access to synthesizer tools and resources.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={robotoFlex.variable}>
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
