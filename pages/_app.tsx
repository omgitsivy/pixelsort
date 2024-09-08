import type { AppProps } from 'next/app';
import { ThemeProvider } from 'next-themes'
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider attribute="class">
      <Theme accentColor="cyan" grayColor="sand">
        <Component {...pageProps} />
      </Theme>
    </ThemeProvider>
  );
}

export default MyApp;