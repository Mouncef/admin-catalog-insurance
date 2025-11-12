"use client";
import { useEffect, useState } from "react";

const THEMES = [
    "light","dark","cupcake","bumblebee","emerald","corporate","synthwave","retro","cyberpunk",
    "valentine","halloween","garden","forest","aqua","lofi","pastel","fantasy","wireframe","black",
    "luxury","dracula","cmyk","autumn","business","acid","lemonade","night","coffee","winter","dim",
    "nord","sunset","caramellatte","abyss","silk"
];

export default function ThemeSelect({ className = "" }) {
    const getInitial = () => {
        if (typeof window === "undefined") return "dark";
        return (
            localStorage.getItem("theme") ||
            document.documentElement.getAttribute("data-theme") ||
            "dark"
        );
    };

    const [theme, setTheme] = useState(getInitial);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    return (
        <label className={`flex items-center gap-2 ${className}`}>
            <span className="hidden xl:inline text-sm opacity-70">Thème</span>
            <select
                className="select select-bordered select-sm"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                aria-label="Sélecteur de thème"
            >
                {THemesSorted(THEMES).map((t) => (
                    <option key={t} value={t}>{t}</option>
                ))}
            </select>
        </label>
    );
}

/* Petite aide: trie pour que 'dark'/'light' restent en tête si tu le souhaites */
function THemesSorted(list){
    const head = ["dark","light"];
    const rest = list.filter(t => !head.includes(t)).sort((a,b)=>a.localeCompare(b));
    return [...head, ...rest];
}
