"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function titleize(segment) {
     const title = decodeURIComponent(segment)
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

     switch (title) {
        case "Category":
            return "Catégories"
        default:
            return title;
    }
}

export default function Breadcrumbs() {
    const pathname = usePathname() || "/";
    const segments = pathname.split("/").filter(Boolean);

    const crumbs = [
        { href: "/", label: "Accueil" },
        ...segments.map((seg, idx) => ({
            href: "/" + segments.slice(0, idx + 1).join("/"),
            label: titleize(seg),
        })),
    ];

    return (
        <div className="breadcrumbs text-sm">
            <ul>
                {crumbs.map((c, i) => (
                    <li key={c.href}>
                        {i === crumbs.length - 1 ? (
                            <span className="font-semibold">{c.label}</span>
                        ) : (
                            <Link href={c.href}>{c.label}</Link>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
