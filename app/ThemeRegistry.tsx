'use client';

import * as React from 'react';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { useServerInsertedHTML } from 'next/navigation';
import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

type ThemeRegistryProps = {
  children: React.ReactNode;
};

type EmotionCacheWithFlush = {
  cache: ReturnType<typeof createCache>;
  flush: () => string[];
};

export default function ThemeRegistry({ children }: ThemeRegistryProps) {
  const [{ cache, flush }] = React.useState<EmotionCacheWithFlush>(() => {
    const cache = createCache({ key: 'mui', prepend: true });
    cache.compat = true;

    const previousInsert = cache.insert;
    let inserted: string[] = [];
    cache.insert = (
      ...args: Parameters<typeof previousInsert>
    ) => {
      const [selector, serialized] = args;
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return previousInsert(...args);
    };

    const flush = () => {
      const prevInserted = inserted;
      inserted = [];
      return prevInserted;
    };

    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) {
      return null;
    }

    let styles = '';
    for (const name of names) {
      styles += cache.inserted[name];
    }

    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return (
    <CacheProvider value={cache}>
      <CssVarsProvider theme={theme} defaultMode="system" disableTransitionOnChange>
        <CssBaseline enableColorScheme />
        {children}
      </CssVarsProvider>
    </CacheProvider>
  );
}
