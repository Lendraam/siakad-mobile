import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { getData, onPrefThemeChange } from '../src/services/storage';

export function useColorScheme() {
	const rn = useRNColorScheme();
	const [pref, setPref] = useState<string | null | undefined>(undefined);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const p = await getData('pref_theme');
				if (mounted) setPref(p ?? null);
			} catch (e) {
				if (mounted) setPref(null);
			}
		})();
		// subscribe to runtime changes
		const unsub = onPrefThemeChange((v) => {
			if (mounted) setPref(v ?? null);
		});
		return () => {
			mounted = false;
			unsub && unsub();
		};
	}, []);

	if (pref === undefined) return rn ?? 'light';
	if (pref === 'dark' || pref === 'light') return pref;
	return rn ?? 'light';
}
