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
      <title>Synth Calculators</title>
      <meta name="description" content="Common calculators for DIY synth"/>

      <meta property="og:url" content="https://synthi-calc.expressive-circuits.com/"/>
      <meta property="og:type" content="website"/>
      <meta property="og:title" content="Synth Calculators"/>
      <meta property="og:description" content="Common calculators for DIY synth"/>
      <meta property="og:image" content="public/img/synthi-calc-og-image.png"/>

      <meta name="twitter:card" content="summary_large_image"/>
      <meta property="twitter:domain" content="synthi-calc.expressive-circuits.com"/>
      <meta property="twitter:url" content="https://synthi-calc.expressive-circuits.com/"/>
      <meta name="twitter:title" content="Synth Calculators"/>
      <meta name="twitter:description" content="Common calculators for DIY synth"/>
      <meta name="twitter:image" content="public/img/synthi-calc-og-image.png"/>

      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
