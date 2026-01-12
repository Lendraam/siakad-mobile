import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { getData, onPrefThemeChange } from '../src/services/storage';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 * and also respect a persisted user preference stored in AsyncStorage.
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const [pref, setPref] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    setHasHydrated(true);
    (async () => {
      try {
        const p = await getData('pref_theme');
        if (mounted) setPref(p ?? null);
      } catch (e) {
        if (mounted) setPref(null);
      }
    })();
    const unsub = onPrefThemeChange((v) => {
      if (mounted) setPref(v ?? null);
    });
    return () => {
      mounted = false;
      unsub && unsub();
    };
  }, []);

  const colorScheme = useRNColorScheme();

  if (!hasHydrated) return 'light';
  if (pref === undefined) return colorScheme;
  if (pref === 'dark' || pref === 'light') return pref;
  return colorScheme;
}
