"use client";

import Link from "next/link";
import {Euro, Container, TableProperties, Database, Package, Box, Bookmark, SquareActivity, BookText, Cog, Library, Grid3x3, Users} from 'lucide-react';

/* === Icônes inline (pas de dépendance) === */
const Icon = {
    Home: (p) => (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
            <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10.5z"></path>
        </svg>
    ),
    Box: (p) => (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
            <path d="M21 8l-9-5-9 5 9 5 9-5z"></path>
            <path d="M3 8v8l9 5 9-5V8"></path>
        </svg>
    ),
    Users: (p) => (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
    ),
    CreditCard: (p) => (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
            <rect x="2" y="5" width="20" height="14" rx="2"></rect>
            <path d="M2 10h20"></path>
        </svg>
    ),
    Chart: (p) => (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
            <path d="M3 3v18h18"></path>
            <path d="M7 16l3-3 2 2 5-5"></path>
        </svg>
    ),
    Settings: (p) => (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
            <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"></path>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1.82l.02.06a2 2 0 1 1-3.38 0l.02-.06A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82-.33l-.06.02a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.82-.33l-.06.02a2 2 0 1 1 0-3.38l.06.02A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.04 4.3l.06.06A1.65 1.65 0 0 0 9 4.6c.37 0 .72-.12 1-.33a1.65 1.65 0 0 0 .33-1.82l-.02-.06a2 2 0 1 1 3.38 0l-.02.06A1.65 1.65 0 0 0 15 4.6c.37 0 .72-.12 1-.33a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c0 .37.12.72.33 1 .21.28.33.63.33 1s-.12.72-.33 1a1.65 1.65 0 0 0-.33 1z"></path>
        </svg>
    ),
    Key: (p) => (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
            <circle cx="7.5" cy="15.5" r="3.5"></circle>
            <path d="M10.5 12.5L21 2l1 1-2 2 1 1-2 2 1 1-6 6"></path>
        </svg>
    ),
    Shield: (p) => (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
    ),
    File: (p) => (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <path d="M14 2v6h6"></path>
        </svg>
    ),
    Help: (p) => (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 2-3 4"></path>
            <path d="M12 17h.01"></path>
        </svg>
    ),
};

export default function Sidebar({ drawerId = "my-drawer-2" }) {
    return (
        <div className="drawer lg:drawer-open">
            <input id={drawerId} type="checkbox" className="drawer-toggle" />

            {/* Laisse vide si ton main est ailleurs */}
            <div className="drawer-content"></div>

            <div className="drawer-side">
                <label htmlFor={drawerId} aria-label="close sidebar" className="drawer-overlay"></label>

                {/* === MENU === */}
                <ul className="menu bg-base-200 text-base-content min-h-full w-80 p-4 gap-1">
                    {/* Header / Branding */}
                    <li className="mb-2">
                        <div className="text-lg font-semibold flex items-center gap-2 px-2 py-1">
                            <Box size={16} />
                            <span className="sidebar-label">Back Office Echiquier</span>
                        </div>
                    </li>

                    {/*<li>*/}
                    {/*    <details>*/}
                    {/*        <summary className="flex items-center gap-2" title="Administration">*/}
                    {/*            <Cog size={16} />*/}
                    {/*            <span className="sidebar-label">Paramétrage</span>*/}
                    {/*        </summary>*/}
                    {/*        <ul>*/}
                    {/*            <li>*/}
                    {/*                <Link href="/catalogue/configurer" className="flex items-center gap-2" title="Offres">*/}
                    {/*                    <BookText size={16} />*/}
                    {/*                    <span className="sidebar-label">Catalague méthode 1</span>*/}
                    {/*                </Link>*/}
                    {/*            </li>*/}
                    {/*            <li>*/}
                    {/*                <Link href="/catalogue/inline" className="flex items-center gap-2" title="Catalogues">*/}
                    {/*                    <BookText size={16} />*/}
                    {/*                    <span className="sidebar-label">Catalogue méthode 2</span>*/}
                    {/*                </Link>*/}
                    {/*            </li>*/}
                    {/*        </ul>*/}
                    {/*    </details>*/}
                    {/*</li>*/}

                    <li className="menu-title"><span>Configuration</span></li>
                    <li>
                        <details>
                            <summary className="flex items-center gap-2" title="Référentiels">
                                <Database size={16} />
                                <span className="sidebar-label">Référentiels</span>
                            </summary>
                            <ul>
                                <li>
                                    <Link href="/modules" className="flex items-center gap-2" title="Modules">
                                        <Package size={16} />
                                        <span className="sidebar-label">Modules</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/groupes/garanties" className="flex items-center gap-2" title="Groupes de garanties">
                                        <Bookmark size={16} />
                                        <span className="sidebar-label">Groupes de garanties</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/garanties" className="flex items-center gap-2" title="Garanties">
                                        <SquareActivity size={16} />
                                        <span className="sidebar-label">Garanties</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/groupes/niveaux" className="flex items-center gap-2" title="Groupes de niveaux">
                                        <Bookmark size={16} />
                                        <span className="sidebar-label">Groupes de niveaux</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/niveaux" className="flex items-center gap-2" title="Niveaux">
                                        <Container size={16} />
                                        <span className="sidebar-label">Niveaux</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/value-type" className="flex items-center gap-2" title="Types de valeur">
                                        <Euro size={16} />
                                        <span className="sidebar-label">Types de valeur</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/categories-personnel" className="flex items-center gap-2" title="Catégories de personnel">
                                        <Users size={16} />
                                        <span className="sidebar-label">Catégories de personnel</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/tranches-ages" className="flex items-center gap-2" title="Tranches d'ages">
                                        <Grid3x3 size={16} />
                                        <span className="sidebar-label">Tranches d'ages</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/regimes" className="flex items-center gap-2" title="Régimes">
                                        <Library size={16} />
                                        <span className="sidebar-label">Régimes</span>
                                    </Link>
                                </li>


                            </ul>
                        </details>
                    </li>

                    <li className="menu-title"><span>Echiquier</span></li>
                    <li>
                        <details>
                            <summary className="flex items-center gap-2" title="Administration">
                                <Cog size={16} />
                                <span className="sidebar-label">Administration</span>
                            </summary>
                            <ul>
                                <li>
                                    <Link href="/offres" className="flex items-center gap-2" title="Offres">
                                        <BookText size={16} />
                                        <span className="sidebar-label">Offres</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/catalogues" className="flex items-center gap-2" title="Catalogues">
                                        <TableProperties size={16}  />
                                        <span className="sidebar-label">Catalogues</span>
                                    </Link>
                                </li>
                            </ul>
                        </details>
                    </li>
                    {/*<li>
                        <Link href="/dashboard" className="flex items-center gap-2" title="Dashboard">
                            <Icon.Home />
                            <span className="sidebar-label">Dashboard</span>
                        </Link>
                    </li>
                    <li>
                        <Link href="/dashboard" className="flex items-center gap-2" title="Catalogue">
                            <Icon.Home />
                            <span className="sidebar-label">Catalogue</span>
                        </Link>
                    </li>

                     Section MAIN
                    <li className="menu-title"><span>Configuration</span></li>

                    <li>
                        <details open>
                            <summary className="flex items-center gap-2" title="Catalogue">
                                <Icon.Box />
                                <span className="sidebar-label">Catalogue</span>
                            </summary>
                            <ul>
                                <li>
                                    <Link href="/catalog/garanties" className="flex items-center gap-2" title="Modules">
                                        <Icon.File width="16" height="16" />
                                        <span className="sidebar-label">Modules</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/catalog/garanties" className="flex items-center gap-2" title="Garanties">
                                        <Icon.File width="16" height="16" />
                                        <span className="sidebar-label">Garanties</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/catalog/options" className="flex items-center gap-2" title="Niveaux">
                                        <Icon.File width="16" height="16" />
                                        <span className="sidebar-label">Niveaux</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/catalog/packs" className="flex items-center gap-2" title="Groupes">
                                        <Icon.File width="16" height="16" />
                                        <span className="sidebar-label">Groupes</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/catalog/options" className="flex items-center gap-2" title="Offres">
                                        <Icon.File width="16" height="16" />
                                        <span className="sidebar-label">Offres</span>
                                    </Link>
                                </li>
                            </ul>
                        </details>
                    </li>

                     Section OPERATIONS
                    <li className="menu-title"><span>Référentiels</span></li>

                    <li>
                        <details>
                            <summary className="flex items-center gap-2" title="Billing">
                                <Icon.CreditCard />
                                <span className="sidebar-label">Billing</span>
                            </summary>
                            <ul>
                                <li>
                                    <Link href="/billing/subscriptions" className="flex items-center gap-2" title="Régimes">
                                        <Icon.File width="16" height="16" />
                                        <span className="sidebar-label">Régimes</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/billing/invoices" className="flex items-center gap-2" title="Collèges">
                                        <Icon.File width="16" height="16" />
                                        <span className="sidebar-label">Collèges</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/billing/refunds" className="flex items-center gap-2" title="CCN">
                                        <Icon.File width="16" height="16" />
                                        <span className="sidebar-label">CCN</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/billing/refunds" className="flex items-center gap-2" title="NAF">
                                        <Icon.File width="16" height="16" />
                                        <span className="sidebar-label">NAF</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/billing/refunds" className="flex items-center gap-2" title="FIA Gestionnaire">
                                        <Icon.File width="16" height="16" />
                                        <span className="sidebar-label">FIA Gestionnaire</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/billing/refunds" className="flex items-center gap-2" title="Périmètres">
                                        <Icon.File width="16" height="16" />
                                        <span className="sidebar-label">Périmètres</span>
                                    </Link>
                                </li>
                            </ul>
                        </details>
                    </li>


                     Section ADMIN
                    <li className="menu-title"><span>Administration</span></li>

                    <li>
                        <details>
                            <summary className="flex items-center gap-2" title="Administration">
                                <Icon.Users />
                                <span className="sidebar-label">Administration</span>
                            </summary>
                            <ul>
                                <li>
                                    <Link href="/admin/users" className="flex items-center gap-2" title="Users">
                                        <Icon.Users width="16" height="16" />
                                        <span className="sidebar-label">Users</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/admin/roles" className="flex items-center gap-2" title="Roles">
                                        <Icon.Key width="16" height="16" />
                                        <span className="sidebar-label">Roles</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/admin/permissions" className="flex items-center gap-2" title="Permissions">
                                        <Icon.Shield width="16" height="16" />
                                        <span className="sidebar-label">Permissions</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/admin/api-keys" className="flex items-center gap-2" title="API Keys">
                                        <Icon.Key width="16" height="16" />
                                        <span className="sidebar-label">API Keys</span>
                                    </Link>
                                </li>
                            </ul>
                        </details>
                    </li>

                     Section SETTINGS
                    <li className="menu-title"><span>Paramètres</span></li>
                    <li>
                        <details>
                            <summary className="flex items-center gap-2" title="Settings">
                                <Icon.Settings />
                                <span className="sidebar-label">Settings</span>
                            </summary>
                            <ul>
                                <li>
                                    <Link href="/settings/general" className="flex items-center gap-2" title="General">
                                        <Icon.File width="16" height="16" />
                                        <span className="sidebar-label">General</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/settings/appearance" className="flex items-center gap-2" title="Appearance">
                                        <Icon.File width="16" height="16" />
                                        <span className="sidebar-label">Appearance</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/settings/security" className="flex items-center gap-2" title="Security">
                                        <Icon.Shield width="16" height="16" />
                                        <span className="sidebar-label">Security</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/settings/integrations" className="flex items-center gap-2" title="Integrations">
                                        <Icon.File width="16" height="16" />
                                        <span className="sidebar-label">Integrations</span>
                                    </Link>
                                </li>
                            </ul>
                        </details>
                    </li>*/}

                    {/*<li className="menu-title"><span>Visualisation</span></li>
                    <li>
                        <Link href="/echiquier" className="flex items-center gap-2" title="Echiquier">
                            <TableProperties size={16}  />
                            <span className="sidebar-label">Echiquier</span>
                        </Link>
                    </li>*/}

                </ul>
            </div>
        </div>
    );
}
