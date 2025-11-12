"use client";
import { useEffect, useState } from "react";

const THEMES = [
    "light","dark","cupcake","bumblebee","emerald","corporate","synthwave","retro","cyberpunk",
    "valentine","halloween","garden","forest","aqua","lofi","pastel","fantasy","wireframe","black",
    "luxury","dracula","cmyk","autumn","business","acid","lemonade","night","coffee","winter","dim",
    "nord","sunset","caramellatte","abyss","silk",
];

const Check = ({ className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
         viewBox="0 0 24 24" fill="currentColor"
         className={`h-3 w-3 shrink-0 transition-opacity ${className}`}>
        <path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z" />
    </svg>
);

const Swatch = ({ theme }) => (
    <div data-theme={theme}
         className="bg-base-100 grid shrink-0 grid-cols-2 gap-0.5 rounded-md p-1 shadow-sm">
        <div className="bg-base-content size-1.5 rounded-full" />
        <div className="bg-primary size-1.5 rounded-full" />
        <div className="bg-secondary size-1.5 rounded-full" />
        <div className="bg-accent size-1.5 rounded-full" />
    </div>
);

const Chevron = () => (
    <svg width="12" height="12" className="mt-px hidden size-2 fill-current opacity-60 sm:inline-block"
         xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 2048">
        <path d="M1799 349l242 241-1017 1017L7 590l242-241 775 775 775-775z" />
    </svg>
);

export default function ThemeDropdown() {
    // 1) stable au SSR: pas de lecture de window/localStorage
    const [theme, setTheme] = useState("dark"); // placeholder stable
    const [mounted, setMounted] = useState(false);

    // 2) côté client, on synchronise
    useEffect(() => {
        setMounted(true);
        const saved =
            (typeof window !== "undefined" && localStorage.getItem("theme")) ||
            document.documentElement.getAttribute("data-theme") ||
            "dark";
        setTheme(saved);
        document.documentElement.setAttribute("data-theme", saved);
    }, []);

    const pick = (t) => {
        setTheme(t);
        document.documentElement.setAttribute("data-theme", t);
        try { localStorage.setItem("theme", t); } catch {}
    };

    return (
        <div title="Change Theme" className="dropdown dropdown-end">
            {/* Trigger */}
            <div tabIndex={0} role="button" aria-label="Change Theme"
                 className="btn group btn-sm gap-1.5 px-1.5 btn-ghost">
                <div className="bg-base-100 group-hover:border-base-content/20 border-base-content/10
                        grid shrink-0 grid-cols-2 gap-0.5 rounded-md border p-1 transition-colors">
                    <div className="bg-base-content size-1 rounded-full" />
                    <div className="bg-primary size-1 rounded-full" />
                    <div className="bg-secondary size-1 rounded-full" />
                    <div className="bg-accent size-1 rounded-full" />
                </div>
                <Chevron />
            </div>

            {/* Menu */}
            <div tabIndex={0}
                 className="dropdown-content bg-base-200 text-base-content rounded-box top-px
                      max-h-[calc(100vh-8.6rem)] overflow-y-auto border-[length:var(--border)]
                      border-white/5 shadow-2xl outline-[length:var(--border)] outline-black/5 mt-16">
                <ul className="menu w-56">
                    <li className="menu-title text-xs"><span>Theme</span></li>

                    {THEMES.map((t) => {
                        const isActive = mounted && theme === t; // ✅ seulement après mount
                        return (
                            <li key={t}>
                                <button
                                    type="button"
                                    onClick={() => pick(t)}
                                    className="gap-3 px-2"
                                >
                                    <Swatch theme={t} />
                                    <div className="w-32 truncate">{t}</div>
                                    {/* check masqué au SSR + première render client */}
                                    <Check className={isActive ? "opacity-100" : "opacity-0"} />
                                </button>
                            </li>
                        );
                    })}

                </ul>
            </div>
        </div>
    );
}
