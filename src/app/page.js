'use client';

import {useMemo} from 'react';
import Link from 'next/link';
import {
    useRefModules,
    useRefCategories,
    useRefActs,
    useRefOffers,
    useRefCatalogues,
} from '@/providers/AppDataProvider';
import {normalizeRisk} from '@/lib/utils/StringUtil';

const CARD_CLASSES = 'card bg-base-100 shadow-md border border-base-200';

export default function Home() {
    const {refModules} = useRefModules();
    const {refCategories} = useRefCategories();
    const {refActs} = useRefActs();
    const {refOffers} = useRefOffers();
    const {refCatalogues} = useRefCatalogues();

    const globalStats = useMemo(() => {
        const modulesCount = refModules.length;
        const categoriesCount = refCategories.length;
        const actsCount = refActs.length;
        const offersCount = refOffers.length;
        const cataloguesCount = refCatalogues.length;

        const modulesByRisk = {sante: 0, prevoyance: 0};
        refModules.forEach((m) => {
            const r = normalizeRisk(m.risque);
            if (r === 'prevoyance') modulesByRisk.prevoyance += 1;
            else modulesByRisk.sante += 1;
        });

        const categoriesByModule = new Map();
        refCategories.forEach((cat) => {
            const list = categoriesByModule.get(cat.ref_module_id) || [];
            list.push(cat);
            categoriesByModule.set(cat.ref_module_id, list);
        });
        const topModules = Array.from(categoriesByModule.entries())
            .map(([moduleId, list]) => ({
                moduleId,
                count: list.length,
                libelle: refModules.find((m) => m.id === moduleId)?.libelle || moduleId,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        const actsByRisk = {sante: 0, prevoyance: 0};
        refActs.forEach((act) => {
            const r = normalizeRisk(act.risque);
            if (r === 'prevoyance') actsByRisk.prevoyance += 1;
            else actsByRisk.sante += 1;
        });

        return {
            modulesCount,
            categoriesCount,
            actsCount,
            offersCount,
            cataloguesCount,
            modulesByRisk,
            actsByRisk,
            topModules,
        };
    }, [refModules, refCategories, refActs, refOffers, refCatalogues]);

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
            <header className="space-y-2">
                <p className="text-sm uppercase tracking-widest text-primary">Bienvenue</p>
                <h1 className="text-3xl font-bold">Tableau de bord référentiel</h1>
                <p className="text-base-content/70 max-w-3xl">
                    Visualisez les indicateurs clés de votre référentiel et accédez rapidement aux écrans
                    d’administration. Les données ci-dessous proviennent de votre stockage local.
                </p>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <SummaryCard title="Modules" value={globalStats.modulesCount} subtitle="Répartis par risque" />
                <SummaryCard title="Catégories" value={globalStats.categoriesCount} subtitle="Groupes actifs" />
                <SummaryCard title="Garanties" value={globalStats.actsCount} subtitle="Actes référencés" />
                <SummaryCard title="Offres" value={globalStats.offersCount} subtitle="Offres commerciales" />
                <SummaryCard title="Catalogues" value={globalStats.cataloguesCount} subtitle="Versions suivies" />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className={CARD_CLASSES}>
                    <div className="card-body">
                        <h2 className="card-title">Répartition par risque</h2>
                        <div className="grid grid-cols-2 gap-3 pt-4">
                            <RiskStat label="Modules Santé" value={globalStats.modulesByRisk.sante} highlight="badge-success" />
                            <RiskStat label="Modules Prévoyance" value={globalStats.modulesByRisk.prevoyance} highlight="badge-warning" />
                            <RiskStat label="Garanties Santé" value={globalStats.actsByRisk.sante} highlight="badge-success" />
                            <RiskStat label="Garanties Prévoyance" value={globalStats.actsByRisk.prevoyance} highlight="badge-warning" />
                        </div>
                    </div>
                </div>

                <div className={CARD_CLASSES}>
                    <div className="card-body">
                        <h2 className="card-title">Modules les plus fournis</h2>
                        {globalStats.topModules.length === 0 ? (
                            <p className="text-sm text-base-content/70">Aucune donnée disponible.</p>
                        ) : (
                            <ul className="space-y-3">
                                {globalStats.topModules.map((mod) => (
                                    <li key={mod.moduleId} className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{mod.libelle}</p>
                                            <p className="text-xs text-base-content/60">ID : {mod.moduleId}</p>
                                        </div>
                                        <span className="badge badge-outline">{mod.count} catégories</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </section>

            <section className={CARD_CLASSES}>
                <div className="card-body">
                    <h2 className="card-title">Raccourcis administration</h2>
                    <p className="text-sm text-base-content/70">Accédez rapidement aux principaux écrans pour enrichir
                        votre référentiel.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                        {quickLinks.map((link) => (
                            <Link key={link.href} href={link.href} className="btn btn-outline justify-start gap-2">
                                <span className="text-lg">{link.emoji}</span>
                                <div className="text-left">
                                    <p className="font-semibold">{link.label}</p>
                                    <p className="text-xs text-base-content/60">{link.description}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}

function SummaryCard({title, value, subtitle}) {
    return (
        <div className={`${CARD_CLASSES} text-center`}>
            <div className="card-body p-4 gap-2">
                <p className="text-sm uppercase tracking-widest text-base-content/60">{title}</p>
                <p className="text-3xl font-bold">{value}</p>
                <p className="text-xs text-base-content/60">{subtitle}</p>
            </div>
        </div>
    );
}

function RiskStat({label, value, highlight}) {
    return (
        <div className="flex items-center justify-between border border-base-200 rounded-box px-3 py-2">
            <span className="text-sm">{label}</span>
            <span className={`badge ${highlight}`}>{value}</span>
        </div>
    );
}

const quickLinks = [
    {href: '/modules', label: 'Modules', description: 'Créer / modifier les modules', emoji: '🧩'},
    {href: '/groupes/garanties', label: 'Groupes', description: 'Structurer les garanties', emoji: '🗂️'},
    {href: '/garanties', label: 'Garanties', description: 'Référencer les actes', emoji: '🛠️'},
    {href: '/catalogues', label: 'Catalogues', description: 'Piloter les versions', emoji: '📚'},
];
