'use client';

import {createContext, useContext, useEffect, useMemo, useState} from 'react';

const DEFAULT_NAMESPACE = 'app:';
const MultiStorageContext = createContext(null);

const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
const safeParse = (json) => {
    try {
        return JSON.parse(json);
    } catch {
        return null;
    }
};

function hydrateFromLocalStorage(sources, namespace) {
    const state = {};
    for (const [key, cfg] of Object.entries(sources)) {
        const storageKey = namespace + key;
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
        const parsed = raw ? safeParse(raw) : null;

        const baseDefault = cfg?.default ?? cfg ?? null;
        const shouldMerge = isPlainObject(baseDefault) && isPlainObject(parsed);

        let value = parsed ?? baseDefault;
        if (shouldMerge) value = {...baseDefault, ...parsed};
        if (cfg?.version && isPlainObject(value)) value.version = cfg.version;

        state[key] = value;
    }
    return state;
}

/**
 * Provider simple (clé/valeur) adossé à localStorage.
 * - Pas d’écriture pendant le render d’un autre composant (écritures via handlers/effects).
 */
export function MultiStorageProvider({
                                         children,
                                         sources = {},
                                         overwriteOnLoad = false,
                                         namespace = DEFAULT_NAMESPACE,
                                         clearNamespaceBeforeOverwrite = true,
                                     }) {
    const [data, setData] = useState(() => hydrateFromLocalStorage(sources, namespace));

    // Éventuel écrasement initial (dev/reset)
    useEffect(() => {
        if (!overwriteOnLoad) return;
        try {
            if (clearNamespaceBeforeOverwrite && typeof window !== 'undefined') {
                const toDelete = [];
                for (let i = 0; i < window.localStorage.length; i++) {
                    const k = window.localStorage.key(i);
                    if (k && k.startsWith(namespace)) toDelete.push(k);
                }
                toDelete.forEach((k) => window.localStorage.removeItem(k));
            }
            for (const [key, value] of Object.entries(data)) {
                window.localStorage.setItem(namespace + key, JSON.stringify(value));
            }
        } catch {
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync cross-tab
    useEffect(() => {
        function onStorage(e) {
            if (!e.key || !e.key.startsWith(namespace)) return;
            const shortKey = e.key.slice(namespace.length);
            const parsed = safeParse(e.newValue);
            if (parsed !== null) setData((prev) => ({...prev, [shortKey]: parsed}));
        }

        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, [namespace]);

    const api = useMemo(() => ({
        data,
        get: (key) => data[key],
        set: (key, valueOrUpdater) => {
            setData((prev) => {
                const value =
                    typeof valueOrUpdater === 'function' ? valueOrUpdater(prev[key]) : valueOrUpdater;
                const next = {...prev, [key]: value};
                try {
                    if (value === undefined) {
                        // optionnel: nettoyer proprement si undefined passé
                        window.localStorage.removeItem(namespace + key);
                    } else {
                        window.localStorage.setItem(namespace + key, JSON.stringify(value));
                    }
                } catch {
                }
                return next;
            });
        },
        patch: (key, patch) => {
            setData((prev) => {
                const nextVal = isPlainObject(prev[key]) ? {...prev[key], ...patch} : patch;
                try {
                    window.localStorage.setItem(namespace + key, JSON.stringify(nextVal));
                } catch {
                }
                return {...prev, [key]: nextVal};
            });
        },
        resetKey: (key) => {
            const base = sources[key]?.default ?? sources[key] ?? null;
            const val = isPlainObject(base)
                ? {...base, ...(sources[key]?.version ? {version: sources[key].version} : {})}
                : base;
            setData((prev) => {
                try {
                    window.localStorage.setItem(namespace + key, JSON.stringify(val));
                } catch {
                }
                return {...prev, [key]: val};
            });
        },
        resetAll: () => {
            const fresh = {};
            for (const [key, cfg] of Object.entries(sources)) {
                const base = cfg?.default ?? cfg ?? null;
                const val = isPlainObject(base) ? {...base, ...(cfg?.version ? {version: cfg.version} : {})} : base;
                fresh[key] = val;
                try {
                    window.localStorage.setItem(namespace + key, JSON.stringify(val));
                } catch {
                }
            }
            setData(fresh);
        },
        clearNamespace: () => {
            try {
                const toDelete = [];
                for (let i = 0; i < window.localStorage.length; i++) {
                    const k = window.localStorage.key(i);
                    if (k && k.startsWith(namespace)) toDelete.push(k);
                }
                toDelete.forEach((k) => window.localStorage.removeItem(k));
            } catch {
            }
        },
    }), [data, namespace, sources]);

    return (
        <MultiStorageContext.Provider value={api}>
            {children}
        </MultiStorageContext.Provider>
    );
}

export function useMultiStorage() {
    const ctx = useContext(MultiStorageContext);
    if (!ctx) throw new Error('useMultiStorage must be used within <MultiStorageProvider>');
    return ctx;
}
