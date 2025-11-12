'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { defaultSettings, SETTINGS_VERSION } from '@/lib/settings/default';

const STORAGE_KEY = 'app:settings';
const SettingsContext = createContext(null);

function safeParse(json) {
    try { return JSON.parse(json); } catch { return null; }
}

function loadFromLocalStorage() {
    if (typeof window === 'undefined') return defaultSettings;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;

    const parsed = safeParse(raw);
    if (!parsed || typeof parsed !== 'object') return defaultSettings;

    // petit hook de migration si tu fais évoluer le schéma
    if (!parsed.version || parsed.version !== SETTINGS_VERSION) {
        parsed.version = SETTINGS_VERSION;
    }
    // merge: les nouvelles clés prennent les valeurs par défaut
    return { ...defaultSettings, ...parsed };
}

export function SettingsProvider({ children, initial = null }) {
    // lazy init pour ne lire localStorage que côté client
    const [settings, setSettings] = useState(() => initial ?? loadFromLocalStorage());

    // persister à chaque changement
    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch {}
    }, [settings]);

    // écouter les changements depuis d'autres onglets
    useEffect(() => {
        function onStorage(e) {
            if (e.key === STORAGE_KEY && e.newValue) {
                const next = safeParse(e.newValue);
                if (next && typeof next === 'object') {
                    setSettings(prev => ({ ...prev, ...next }));
                }
            }
        }
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const api = useMemo(() => ({
        settings,
        setSettings,
        update: (patch) => setSettings(s => ({ ...s, ...patch })),
        reset: () => setSettings(defaultSettings),
    }), [settings]);

    return (
        <SettingsContext.Provider value={api}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error('useSettings must be used within <SettingsProvider>');
    return ctx;
}
