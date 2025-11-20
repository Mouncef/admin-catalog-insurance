"use client";
import { useEffect, useState, useRef } from "react";
import ThemeDropdown from "@/components/layout/ThemeDropdown";
import {PanelLeft, PanelLeftClose, Download, Upload, HardDriveDownload, HardDriveUpload} from "lucide-react";
import { defaultSettings } from "@/lib/settings/default"; // 👈 SETTINGS_VERSION retiré
import { sourcesFromDefault } from "@/providers/AppDataProvider"; // OK, composant client → client
import {useAuth} from '@/providers/AuthProvider';


// Helpers si tu ne veux pas importer depuis le provider :
const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
function looksLikeLegacyMapDump(obj) {
    return isPlainObject(obj?.data) && Object.keys(obj.data).some(k => k.startsWith('app:') || k.startsWith('grp:'));
}
// petit helper
const safeParse = (json) => { try { return json ? JSON.parse(json) : null; } catch { return null; } };
const clone = (v) => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

// récolte toutes les clés d’un namespace ("grp:" ici) -> { [shortKey]: value }
function collectNamespace(prefix) {
    const out = {};
    if (typeof window === 'undefined') return out;

    for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (!k || !k.startsWith(prefix)) continue;
        const shortKey = k.slice(prefix.length);
        const raw = window.localStorage.getItem(k);
        const parsed = safeParse(raw);
        out[shortKey] = parsed ?? raw; // si ce n'est pas du JSON, on garde le brut
    }

    return out;
}
function flushNamespace(prefix) {
    const toRemove = [];
    for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(prefix)) toRemove.push(k);
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k));
}
function writeNamespaceMap(prefix, map) {
    if (!isPlainObject(map)) return;
    for (const [shortKey, value] of Object.entries(map)) {
        try {
            window.localStorage.setItem(prefix + shortKey, JSON.stringify(value));
        } catch { /* ignore single key error */ }
    }
}
function writeMapToLocalStorage(map) {
    for (const [k, v] of Object.entries(map)) {
        try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
    }
}
/**
 * Importe un dump déjà parsé au format "app-like-default" et ses namespaces supplémentaires.
 * @param {object} dump - structure JSON correspondant à defaultSettings (+ __extraNamespaces optionnel)
 * @param {string} ns   - namespace principal (par défaut "app:")
 * @param {object} opts - options d'écriture (importExtras/purgeExtras/extrasWhitelist/reload)
 */
async function importAppLikeDefault(dump, ns = 'app:', opts = {}) {
    const {
        importExtras = true,
        purgeExtras = true,
        extrasWhitelist = null, // ex: ["grp:"]
        reload = false,
    } = opts;
    const UI_KEYS = ['version','theme','locale','density','apiBaseUrl','showBeta'];

    if (!isPlainObject(dump)) {
        throw new Error('Dump JSON invalide');
    }

    // 1) construire settings à partir de dump.settings (si présent) ou du top-level
    const uiSource = isPlainObject(dump.settings) ? dump.settings : dump;
    const settings = {};
    for (const k of UI_KEYS) settings[k] = (k in uiSource) ? uiSource[k] : defaultSettings[k];
    localStorage.setItem(ns + 'settings', JSON.stringify(settings));

    // synchroniser le thème DaisyUI (respecte le fichier si présent)
    const theme = (typeof uiSource.theme === 'string' && uiSource.theme.trim()) ? uiSource.theme : defaultSettings.theme;
    localStorage.setItem('theme', theme);

    // 2) écrire toutes les sources du provider (sans préfixe app: ici)
    const sources = sourcesFromDefault(defaultSettings);
    for (const key of Object.keys(sources)) {
        if (key === 'settings') continue;
        const val = (key in dump) ? dump[key] : (defaultSettings[key] ?? null);
        localStorage.setItem(ns + key, JSON.stringify(val));
    }

    // 3) namespaces additionnels
    if (importExtras && isPlainObject(dump.__extraNamespaces)) {
        const prefixes = Object.keys(dump.__extraNamespaces).filter(p => !extrasWhitelist || extrasWhitelist.includes(p));
        if (purgeExtras) {
            for (const p of prefixes) {
                const toDel = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith(p)) toDel.push(k);
                }
                toDel.forEach(k => localStorage.removeItem(k));
            }
        }
        for (const p of prefixes) {
            const map = dump.__extraNamespaces[p];
            if (!isPlainObject(map)) continue;
            for (const [shortKey, value] of Object.entries(map)) {
                localStorage.setItem(p + shortKey, JSON.stringify(value));
            }
        }
    }
    if (reload) window.location.reload();
}
async function importLegacyDataMapObject(dump, { reload = true } = {}) {
    // 1) map des données
    const map = isPlainObject(dump?.data) ? dump.data : dump;
    if (!isPlainObject(map)) throw new Error('Dump legacy invalide: "data" manquant');

    // 2) purge app:/grp:
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('app:') || k.startsWith('grp:'))) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));

    // 3) écriture brute des clés (elles sont déjà préfixées "app:" / "grp:")
    writeMapToLocalStorage(map);

    // 4) thème (si présent au bon endroit)
    // Certains vieux dumps mettent "theme" directement dans map
    if (typeof map.theme === 'string' && map.theme.trim()) {
        localStorage.setItem('theme', map.theme);
    }

    if (reload) window.location.reload();
}
async function importSmartFromFile(file) {
    const text = await file.text();
    const dump = JSON.parse(text);

    if (looksLikeLegacyMapDump(dump)) {
        // Ancien format {"namespace":"app:","data":{ "app:*": ... }}
        await importLegacyDataMapObject(dump, { reload: true });
    } else {
        // Nouveau format "app-like-default" (mêmes clés que defaultSettings)
        await importAppLikeDefault(dump, 'app:', { importExtras: true, purgeExtras: true, reload: true });
    }
}


const UI_KEYS = ['version','theme','locale','density','apiBaseUrl','showBeta'];

function takeUIFromSettings(settingsObj, fallback) {
    const out = {};
    for (const k of UI_KEYS) {
        out[k] = (settingsObj && k in settingsObj) ? settingsObj[k] : fallback[k];
    }
    return out;
}

function snapshotFromLocalStorageLikeProvider(ns = 'app:') {
    // mêmes "sources" que ton provider
    const sources = sourcesFromDefault(defaultSettings);
    const snap = {};

    for (const [key, cfg] of Object.entries(sources)) {
        const storageKey = ns + key;
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
        const parsed = safeParse(raw);

        const baseDefault = cfg?.default ?? cfg ?? null;
        const shouldMerge = isPlainObject(baseDefault) && isPlainObject(parsed);

        let value = parsed ?? baseDefault;
        if (shouldMerge) value = { ...baseDefault, ...parsed };
        if (cfg?.version && isPlainObject(value)) value.version = cfg.version;

        snap[key] = value;
    }

    return snap;
}
/**
 * Exporte un JSON **à la forme de `defaultSettings`** :
 * - les préférences UI (version, theme, locale, …) remontent au niveau racine
 * - tous les tableaux ref_* y sont présents, qu’ils aient été écrits ou non dans le localStorage
 */
// ⚠️ remplace ta fonction actuelle par celle-ci
export function exportAppLikeDefault(ns = 'app:') {
    const snap = snapshotFromLocalStorageLikeProvider(ns);

    // on part d’un clone des defaults pour garantir la forme
    const out = clone(defaultSettings);

    // 1) Remonter les préférences UI du bloc "settings" vers la racine
    const uiFromSettings = takeUIFromSettings(snap.settings, defaultSettings);
    for (const k of UI_KEYS) out[k] = uiFromSettings[k];

    // 2) Pour toutes les autres clés stockées par le provider, remplir/écraser
    for (const [k, v] of Object.entries(snap)) {
        if (k === 'settings') continue;
        out[k] = v;
    }

    // 3) Ajouter toutes les données "grp:" dans un bloc séparé du dump
    const grpDump = collectNamespace('grp:');
    if (Object.keys(grpDump).length > 0) {
        // on les range dans un espace dédié pour éviter de polluer la forme "default"
        out.__extraNamespaces = out.__extraNamespaces || {};
        out.__extraNamespaces['grp:'] = grpDump;
    }

    // 4) Télécharger
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const a = document.createElement('a');
    a.href = url;
    a.download = `app-like-default-and-grp-${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

export default function Navbar({ drawerId = "my-drawer-2" }) {
    const [collapsed, setCollapsed] = useState(false);
    const [toast, setToast] = useState(null)
    const {user, logout} = useAuth();
    const initials = (user?.displayName || user?.username || '?')
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase())
        .join('')
        .slice(0, 2) || 'NA';

    // Lire l’état persistant au chargement (optionnel)
    useEffect(() => {
        const saved = localStorage.getItem("sidebar-collapsed") === "1";
        setCollapsed(saved);
        document.documentElement.setAttribute("data-sidebar", saved ? "collapsed" : "expanded");
    }, []);
    const toggleSidebar = () => {
        const next = !collapsed;
        setCollapsed(next);
        document.documentElement.setAttribute("data-sidebar", next ? "collapsed" : "expanded");
        localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
    };
    function showToast(type, msg) { setToast({type, msg}); setTimeout(() => setToast(null), 2500) }

    const fileImportRef = useRef(null);

    function openImportJsonDialog() {
        fileImportRef.current?.click();
    }

    async function handleImportJsonFile(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            await importSmartFromFile(file);
        } catch (err) {
            console.error(err);
            showToast('error', `Import JSON invalide: ${err.message || err}`);
        } finally {
            e.target.value = '';
        }
    }

    /**
     * Ecrase TOUTES les clés "app:" et "grp:" puis écrit celles du dump.
     * Termine par un reload pour réhydrater tout le contexte.
     */
    function importJsonDump(dump) {
        // 1) Extraire la map de données
        const map = dump && typeof dump === 'object'
            ? (dump.data && typeof dump.data === 'object' ? dump.data : dump)
            : null;

        if (!map || typeof map !== 'object') {
            showToast('error', 'Format JSON non reconnu (champ "data" manquant ?)');
            return;
        }

        // 2) (optionnel) avertir si namespace inattendu
        const ns = dump.namespace ?? 'app:';
        if (ns !== 'app:') {
            const ok = window.confirm(`Le namespace du fichier est "${ns}" (attendu: "app:"). Continuer quand même ?`);
            if (!ok) return;
        }

        // 3) Confirmation destructive
        const ok = window.confirm('⚠️ Cette action va SUPPRIMER toutes les clés locales "app:" et "grp:" puis importer le JSON. Continuer ?');
        if (!ok) return;

        try {
            // 4) Purge complète des clés app:/grp:
            const toRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && (k.startsWith('app:') || k.startsWith('grp:'))) toRemove.push(k);
            }
            toRemove.forEach((k) => localStorage.removeItem(k));

            // 5) Ecriture de toutes les nouvelles clés du dump
            Object.entries(map).forEach(([k, v]) => {
                try {
                    localStorage.setItem(k, JSON.stringify(v));
                } catch (err) {
                    console.warn('Impossible d’écrire la clé', k, err);
                }
            });

            // 6) Bonus: thème DaisyUI si présent (clé simple "theme")
            if (typeof map.theme === 'string') {
                localStorage.setItem('theme', map.theme);
            }

            showToast('success', 'Import terminé. Rechargement…');
            // 7) Réhydratation globale (plus simple/fiable que de setter tous les hooks à la main)
            window.location.reload();
        } catch (err) {
            console.error(err);
            showToast('error', `Échec import: ${err.message || err}`);
        }
    }

    return (
        <div className="navbar bg-base-100 shadow-sm">
        {/*<div className="navbar bg-base-100 shadow-sm">*/}
            <div className="navbar-start gap-1">

                <label htmlFor={drawerId} className="btn btn-ghost lg:hidden">
                    {/* … ton icône burger … */}
                    ☰
                </label>
                {/* Bouton Collapse (desktop) */}
                <button
                    onClick={toggleSidebar}
                    className="btn btn-ghost btn-square hidden lg:inline-flex"
                    aria-pressed={collapsed}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed ? <PanelLeft className="size-5"/> : <PanelLeftClose className="size-5"/> }
                </button>


                {/*<a className="btn btn-ghost text-xl">daisyUI</a>*/}
            </div>
            <div className="navbar-center hidden lg:flex">
                {/*<ul className="menu menu-horizontal px-1">
                    <li><a>Item 1</a></li>
                    <li>
                        <details>
                            <summary>Parent</summary>
                            <ul className="p-2">
                                <li><a>Submenu 1</a></li>
                                <li><a>Submenu 2</a></li>
                            </ul>
                        </details>
                    </li>
                    <li><a>Item 3</a></li>
                </ul>*/}
            </div>
            <div className="navbar-end gap-2">
                {/* ✅ Sélecteur de thème */}
                {/*<ThemeSelect className="hidden md:flex" />*/}

                <div className="flex gap-2">
                    <button
                        type="button"
                        className="btn btn-ghost btn-circle lg:inline-flex"
                        onClick={openImportJsonDialog}
                        title="Importer le namespace app: en JSON"
                    >
                        <HardDriveDownload size={16} />
                    </button>
                    <input
                        ref={fileImportRef}
                        type="file"
                        accept="application/json,.json"
                        className="hidden"
                        onChange={handleImportJsonFile}
                    />
                </div>

                <button
                    type="button"
                    className="btn btn-ghost btn-circle lg:inline-flex"
                    onClick={() => exportAppLikeDefault('app:')}
                    title="Exporter le namespace app: en JSON"
                >
                    <HardDriveUpload size={16} />
                </button>



                {/* Avatar */}
                <ThemeDropdown />

                <div className="dropdown dropdown-end">
                    <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                        <div className="avatar avatar-online avatar-placeholder">
                            <div className="bg-primary text-primary-content w-9 rounded-full">
                                <span className="text-sm font-semibold">{initials}</span>
                            </div>
                        </div>
                    </div>
                    <ul
                        tabIndex={0}
                        className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-56 p-3 shadow space-y-2">
                        <li className="menu-title">Session</li>
                        <li>
                            <div className="flex flex-col">
                                <span className="font-semibold">{user?.displayName || user?.username}</span>
                                <span className="text-xs opacity-70">
                                    {Array.isArray(user?.roles) ? user.roles.join(', ') : '—'}
                                </span>
                            </div>
                        </li>
                        <li>
                            <button type="button" onClick={logout}>
                                Se déconnecter
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
