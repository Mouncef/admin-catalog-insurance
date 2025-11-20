'use client';

import {Fragment, useCallback, useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';

// Providers
import {
    useRefOffers,
    useRefCatalogues,
    useRefModules,
    useRefCategories,
    useRefActs,
    useRefNiveau,
    useRefNiveauSets,
    useCatModules,
    useRefCatPersonnel,
} from '@/providers/AppDataProvider';
import { normalizeRisk } from '@/lib/utils/StringUtil';
import { buildVirtualCategory } from '@/lib/utils/categoryUtils';

import {useGroupStore} from '@/hooks/useGroupData';
import ReadonlyGroupMatrix from '@/components/catalogues/inline/ReadonlyGroupMatrix';

/* =============================================================================
 * Header
 * ========================================================================== */
function ViewerHeader({offer, catalogue, catPersonnel, onBack, onConfigure, onPrint}) {

    return (
        <div className="card bg-base-100 shadow-sm">
            <div className="card-body gap-3 sm:gap-2">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl sm:text-2xl font-bold">
                        Visualisation — {catalogue?.version?.toUpperCase()} • {offer?.code || '—'}
                    </h1>
                    <div className="join">
                        <button className="btn join-item" onClick={onBack}>← Retour</button>
                        <button className="btn join-item" onClick={onConfigure}>Configurer</button>
                        {/*<button className="btn join-item" onClick={onPrint}>Imprimer</button>*/}
                    </div>
                </div>
                <div className="text-sm opacity-80">
                    <div>
                        <span className="opacity-60">Offre:</span>{' '}
                        <span className="font-mono">{offer?.code}</span>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <span><span className="opacity-60">Catalogue:</span> <span
                            className="font-mono">{catalogue?.id}</span></span>
                        <span><span className="opacity-60">Risque:</span> {catalogue?.risque || '—'}</span>
                        <span><span className="opacity-60">Année:</span> {catalogue?.annee || '—'}</span>
                        <span><span
                            className="opacity-60">Validité:</span> {catalogue?.valid_from || '—'} → {catalogue?.valid_to || '—'}</span>
                        <span><span className="opacity-60">Statut:</span> {catalogue?.status || '—'}</span>
                    </div>
                    {Array.isArray(catPersonnel) && catPersonnel.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="opacity-60">Collèges:</span>
                            {catPersonnel.map((cat) => (
                                <span key={cat.id} className="badge badge-outline badge-sm">
                                    {cat.libelle || cat.code || cat.id}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* =============================================================================
 * Panel read-only d’un module
 * ========================================================================== */
function ViewerModulePanel({
                               module,
                               catalogueId,
                               refNiveau,
                               selectedNiveauSetIdBase,
                               selectedNiveauSetIdSurco, // null => suit Base
                               categoriesByModule,
                               actsByCategory,
                               membres,
                               gvaleurs,
                               groupes,
                               allowSurco = true,
                               optionDepth = 0,
                               showSelectionTypeIndicators = false,
                           }) {
    const moduleRisk = normalizeRisk(module?.risque);
    // Tous les niveaux actifs
    const allEnabledLevels = useMemo(
        () => (refNiveau || []).filter(n => !!n.is_enabled),
        [refNiveau]
    );
    // Niveaux Base
    const niveauxBase = useMemo(() => {
        const list = selectedNiveauSetIdBase
            ? allEnabledLevels.filter(n => n.ref_set_id === selectedNiveauSetIdBase)
            : allEnabledLevels;
        const out = list.length ? list : allEnabledLevels;
        return out.slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    }, [allEnabledLevels, selectedNiveauSetIdBase]);
    const effectiveNiveauxBase = useMemo(() => {
        return moduleRisk === 'prevoyance'
            ? (niveauxBase.length ? niveauxBase.slice(0, 1) : [])
            : niveauxBase;
    }, [moduleRisk, niveauxBase]);
    // Niveaux Surco (par défaut suit Base)
    const niveauxSurco = useMemo(() => {
        if (!allowSurco) return [];
        const setId = selectedNiveauSetIdSurco || selectedNiveauSetIdBase;
        const list = setId
            ? allEnabledLevels.filter(n => n.ref_set_id === setId)
            : allEnabledLevels;
        const out = list.length ? list : allEnabledLevels;
        return out.slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    }, [allowSurco, allEnabledLevels, selectedNiveauSetIdBase, selectedNiveauSetIdSurco]);
    // Flag d’affichage séparé
    const separateSets = allowSurco && !!selectedNiveauSetIdSurco && selectedNiveauSetIdSurco !== selectedNiveauSetIdBase;
    const optionDepthValue = Math.max(Math.floor(optionDepth) || 0, 0);
    const optionsEnabled = moduleRisk === 'sante' && optionDepthValue > 0;


    const myGroups = useMemo(
        () => (groupes || [])
            .filter(g => g.catalogue_id === catalogueId && g.ref_module_id === module.id)
            .sort((a, b) =>
                (a.ordre ?? 1e9) - (b.ordre ?? 1e9) ||
                (a.priorite ?? 0) - (b.priorite ?? 0) ||
                String(a.nom).localeCompare(String(b.nom))
            ),
        [groupes, catalogueId, module.id]
    );

    return (
        <div className="card bg-base-100">
            <div className="card-body">
                <div className="flex items-center justify-between gap-3 mb-2">
                    <h2 className="text-lg font-semibold">
                        Module : {module?.libelle || module?.code || '—'}
                    </h2>
                    {/*{selectedNiveauSetId && (
                        <div className="badge badge-outline" title="Set de niveaux appliqué">
                            Set: <span className="ml-1 font-mono">{selectedNiveauSetId}</span>
                        </div>
                    )}*/}
                </div>

                {myGroups.length === 0 && (
                    <div className="alert alert-info">Aucun groupe défini pour ce module.</div>
                )}

                {myGroups.map((g) => {
                    const subItems = Array.isArray(g.sub_items)
                        ? g.sub_items.filter((si) => si.parent_act_id && si.libelle)
                        : [];
                    const categoryGroups = normalizeRisk(module?.risque) === 'prevoyance' && g.category_groups ? g.category_groups : null;
                    const subItemsByParent = new Map();
                    for (const si of subItems) {
                        if (!subItemsByParent.has(si.parent_act_id)) subItemsByParent.set(si.parent_act_id, []);
                        subItemsByParent.get(si.parent_act_id).push(si);
                    }
                    const selectionTypes = new Set([g.selection_type === 'checkbox' ? 'checkbox' : 'radio']);
                    if (g.category_selection_types && typeof g.category_selection_types === 'object' && !Array.isArray(g.category_selection_types)) {
                        Object.values(g.category_selection_types).forEach((val) => {
                            if (val === 'checkbox' || val === 'radio') selectionTypes.add(val);
                        });
                    }
                    // const badgeLabel = selectionTypes.size > 1
                    //     ? 'Mixte (catégorie)'
                    //     : selectionTypes.has('checkbox')
                    //         ? 'CheckBox'
                    //         : 'Bouton radio';
                    return (
                        <div key={g.id} className="card bg-base-200/40 shadow-sm mb-4">
                            <div className="card-body p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="text-base sm:text-lg font-semibold">
                                            Groupe : {g.nom}
                                        </div>
                                        {/*{moduleRisk === 'prevoyance' && (
                                            <span className="badge badge-outline">
                                                {badgeLabel}
                                            </span>
                                        )}*/}
                                    </div>
                                </div>

                                <ReadonlyGroupMatrix
                                    editable={false}
                                    group={g}
                                    module={module}
                                    niveauxBase={effectiveNiveauxBase}
                                    niveauxSurco={niveauxSurco}
                                    separateSets={separateSets}
                                    allowSurco={allowSurco}
                                    optionsEnabled={optionsEnabled}
                                    optionLevels={effectiveNiveauxBase}
                                    allowSubItems={false}
                                    subItemsMap={subItemsByParent}
                                    categoriesByModule={categoriesByModule}
                                    actsByCategory={actsByCategory}
                                    categoryGroups={categoryGroups}
                                    membres={membres}
                                    gvaleurs={gvaleurs}
                                    showSelectionTypeIndicators={showSelectionTypeIndicators}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* =============================================================================
 * Page
 * ========================================================================== */
function VisualiserPageBase({catalogueId, targetRisk = null}) {
    // Hooks d’état en tête (ordre stable)
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const [activeModuleId, setActiveModuleId] = useState(''); // contrôlera le radio checked

    const router = useRouter();
    if (!catalogueId) {
        return (
            <div className="p-6">
                <div className="alert alert-error">
                    <span>ID de catalogue manquant dans l’URL.</span>
                </div>
                <div className="mt-4">
                    <button className="btn" onClick={() => router.push('/catalogues')}>← Retour</button>
                </div>
            </div>
        );
    }

    // Référentiels
    const {refOffers} = useRefOffers();
    const {refCatalogues} = useRefCatalogues();
    const {refModules} = useRefModules();
    const {refCategories} = useRefCategories();
    const {refActs} = useRefActs();
    const {refNiveau} = useRefNiveau();
    const {refNiveauSets} = useRefNiveauSets();
    const {catModules} = useCatModules();
    const {refCatPersonnel} = useRefCatPersonnel();

    // Maps
    const offerMap = useMemo(() => new Map(refOffers.map(o => [o.id, o])), [refOffers]);
    const catalogueMap = useMemo(() => new Map(refCatalogues.map(c => [c.id, c])), [refCatalogues]);
    const catalogue = catalogueMap.get(catalogueId);
    const offer = offerMap.get(catalogue?.offre_id || '');
    if (!catalogue) {
        return (
            <div className="p-6">
                <div className="alert alert-error">
                    <span>Catalogue introuvable pour l’ID <span className="font-mono">{catalogueId}</span>.</span>
                </div>
                <div className="mt-4">
                    <button className="btn" onClick={() => router.push('/catalogues')}>← Retour</button>
                </div>
            </div>
        );
    }
    const catalogueRisk = normalizeRisk(catalogue?.risque);
    if (targetRisk && catalogueRisk && catalogueRisk !== targetRisk) {
        return (
            <div className="p-6">
                <div className="alert alert-warning">
                    <span>
                        Ce catalogue est associé au risque <span className="font-mono">{catalogueRisk}</span> et ne peut pas
                        être visualisé dans l’espace <span className="font-mono">{targetRisk}</span>.
                    </span>
                </div>
                <div className="mt-4">
                    <button className="btn" onClick={() => router.push('/catalogues')}>← Retour</button>
                </div>
            </div>
        );
    }

    const modulesForRisk = useMemo(() => {
        const target = catalogueRisk;
        return (refModules || []).filter((m) => normalizeRisk(m.risque) === target);
    }, [refModules, catalogueRisk]);

    const moduleMap = useMemo(() => new Map(modulesForRisk.map((m) => [m.id, m])), [modulesForRisk]);
    const catPersonnelOrdered = useMemo(() => {
        const arr = Array.isArray(refCatPersonnel) ? [...refCatPersonnel] : [];
        return arr.sort(
            (a, b) =>
                (a.ordre ?? 0) - (b.ordre ?? 0) ||
                String(a.libelle || a.code || '').localeCompare(String(b.libelle || b.code || ''))
        );
    }, [refCatPersonnel]);
    const enabledCatPersonnel = useMemo(
        () => catPersonnelOrdered.filter((c) => c.is_enabled !== false),
        [catPersonnelOrdered]
    );
    const catPersonnelIdSet = useMemo(() => new Set(catPersonnelOrdered.map((c) => c.id)), [catPersonnelOrdered]);
    const catPersonnelOrderIndex = useMemo(() => {
        const map = new Map();
        catPersonnelOrdered.forEach((cat, idx) => map.set(cat.id, idx));
        return map;
    }, [catPersonnelOrdered]);
    const catPersonnelMap = useMemo(
        () => new Map(catPersonnelOrdered.map((c) => [c.id, c])),
        [catPersonnelOrdered]
    );
    const cleanCatalogueCatIds = useCallback(
        (rawIds) => {
            const input = Array.isArray(rawIds) ? rawIds : [];
            const next = [];
            const seen = new Set();
            for (const id of input) {
                if (!catPersonnelIdSet.has(id) || seen.has(id)) continue;
                next.push(id);
                seen.add(id);
            }
            next.sort(
                (a, b) =>
                    (catPersonnelOrderIndex.get(a) ?? 1e6) -
                    (catPersonnelOrderIndex.get(b) ?? 1e6)
            );
            return next;
        },
        [catPersonnelIdSet, catPersonnelOrderIndex]
    );
    const selectedCatalogueCatIds = useMemo(() => {
        const ids = cleanCatalogueCatIds(catalogue?.cat_personnel_ids);
        if (ids.length > 0) return ids;
        if (enabledCatPersonnel.length > 0) return enabledCatPersonnel.map((c) => c.id);
        return [];
    }, [catalogue?.cat_personnel_ids, cleanCatalogueCatIds, enabledCatPersonnel]);
    const selectedCatalogueCatMeta = useMemo(
        () => selectedCatalogueCatIds.map((id) => catPersonnelMap.get(id)).filter(Boolean),
        [selectedCatalogueCatIds, catPersonnelMap]
    );

    const categoriesForRisk = useMemo(() => {
        const target = catalogueRisk;
        const allowedModules = new Set(modulesForRisk.map((m) => m.id));
        const map = new Map();
        for (const c of refCategories || []) {
            if (!allowedModules.has(c.ref_module_id)) continue;
            if (normalizeRisk(c.risque) !== target) continue;
            map.set(c.id, c);
        }
        for (const mod of modulesForRisk) {
            const virtual = buildVirtualCategory(mod);
            if (virtual && normalizeRisk(virtual.risque ?? mod.risque) === target) {
                map.set(virtual.id, virtual);
            }
        }
        return Array.from(map.values());
    }, [refCategories, modulesForRisk, catalogueRisk]);

    const categoriesByModule = useMemo(() => {
        const by = new Map(modulesForRisk.map((m) => [m.id, []]));
        for (const c of categoriesForRisk) {
            const arr = by.get(c.ref_module_id) || [];
            arr.push(c);
            by.set(c.ref_module_id, arr);
        }
        for (const [, arr] of by) {
            arr.sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || a.code.localeCompare(b.code));
        }
        return by;
    }, [categoriesForRisk, modulesForRisk]);

    const categoryIdsForRisk = useMemo(() => new Set(categoriesForRisk.map((c) => c.id)), [categoriesForRisk]);

    const actsForRisk = useMemo(() => {
        const target = catalogueRisk;
        return (refActs || []).filter(
            (a) => categoryIdsForRisk.has(a.ref_categorie_id) && normalizeRisk(a.risque) === target
        );
    }, [refActs, categoryIdsForRisk, catalogueRisk]);

    const actsByCategory = useMemo(() => {
        const by = new Map(Array.from(categoryIdsForRisk).map((id) => [id, []]));
        for (const act of actsForRisk) {
            const arr = by.get(act.ref_categorie_id);
            if (arr) arr.push(act);
        }
        for (const [, arr] of by) {
            arr.sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || a.code.localeCompare(b.code));
        }
        return by;
    }, [actsForRisk, categoryIdsForRisk]);

    // Modules inclus (ordre d’affichage)
    const includedRows = useMemo(() => {
        if (!catalogueId) return [];
        return (catModules || [])
            .filter(cm => cm.catalogue_id === catalogueId && moduleMap.has(cm.ref_module_id))
            .sort(
                (a, b) =>
                    (a.ordre ?? 0) - (b.ordre ?? 0) ||
                    (moduleMap.get(a.ref_module_id)?.code || '').localeCompare(
                        moduleMap.get(b.ref_module_id)?.code || ''
                    )
            );
    }, [catModules, catalogueId, moduleMap]);

    const includedModules = useMemo(
        () => includedRows.map(r => moduleMap.get(r.ref_module_id)).filter(Boolean),
        [includedRows, moduleMap]
    );

    // Store groupes / membres / gvaleurs
    const storeRefs = useMemo(() => ({catalogueMap, moduleMap}), [catalogueMap, moduleMap]);
    const {groupes, membres, gvaleurs} = useGroupStore(storeRefs, {ns: catalogueId});

    // Sets de niveaux filtrés par risque
    const niveauSetsForRisk = useMemo(() => {
        const target = catalogueRisk;
        return (refNiveauSets || [])
            .filter((s) => s && s.is_enabled !== false && normalizeRisk(s.risque) === target)
            .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
    }, [refNiveauSets, catalogueRisk]);

    const allowedSetIds = useMemo(() => new Set(niveauSetsForRisk.map((s) => s.id)), [niveauSetsForRisk]);

    const niveauxForRisk = useMemo(() => {
        if (!allowedSetIds.size) return [];
        const target = catalogueRisk;
        return (refNiveau || []).filter(
            (n) =>
                n &&
                n.is_enabled &&
                allowedSetIds.has(n.ref_set_id) &&
                normalizeRisk(n.risque) === target
        );
    }, [refNiveau, allowedSetIds, catalogueRisk]);

    const firstEnabledSet = useMemo(() => niveauSetsForRisk[0] || null, [niveauSetsForRisk]);


    // Récupère les IDs de set Base / Surco (compat: si legacy, on lit niveau_set_id)
    const getSetIdsForModule = (modId) => {
        const row = includedRows.find(cm => cm.ref_module_id === modId);

        const baseCandidate = row?.niveau_set_base_id
            ?? row?.niveau_set_id_base
            ?? row?.niveau_set_id
            ?? null;
        const base = baseCandidate && allowedSetIds.has(baseCandidate)
            ? baseCandidate
            : firstEnabledSet?.id ?? null;

        const surcoCandidate = row?.niveau_set_surco_id
            ?? row?.niveau_set_id_surco
            ?? null;
        const surco = surcoCandidate && allowedSetIds.has(surcoCandidate) ? surcoCandidate : null;

        return { base, surco };
    };

    const getOptionDepthForModule = (modId) => {
        const row = includedRows.find(cm => cm.ref_module_id === modId);
        const raw = Number(row?.option_depth);
        if (Number.isInteger(raw) && raw >= 0) return raw;
        return null;
    };

    // Compte groupes par module (pour info dans label)
    const groupsCountByModule = useMemo(() => {
        const map = new Map();
        for (const g of (groupes || [])) {
            if (g.catalogue_id !== catalogueId) continue;
            if (!moduleMap.has(g.ref_module_id)) continue;
            map.set(g.ref_module_id, 1 + (map.get(g.ref_module_id) || 0));
        }
        return map;
    }, [groupes, catalogueId, moduleMap]);

    // Onglet actif par défaut = 1er module inclus
    useEffect(() => {
        if (includedModules.length === 0) {
            setActiveModuleId('');
            return;
        }
        if (!includedModules.some(m => m.id === activeModuleId)) {
            setActiveModuleId(includedModules[0].id);
        }
    }, [includedModules, activeModuleId]);

    /* -------------------------------------------------------------------------
     * Guards
     * ---------------------------------------------------------------------- */
    if (!mounted) {
        return (
            <div className="p-6">
                <div className="skeleton h-8 w-64 mb-4"/>
                <div className="skeleton h-5 w-96 mb-2"/>
                <div className="skeleton h-5 w-80"/>
            </div>
        );
    }
    if (!catalogueId) {
        return (
            <div className="p-6 max-w-3xl">
                <div className="alert alert-warning">
                    <span>Aucun <span className="font-mono">catalogueId</span> dans l’URL.</span>
                </div>
                <div className="mt-4">
                    <button className="btn" onClick={() => router.push('/catalogues')}>← Retour à la liste</button>
                </div>
            </div>
        );
    }
    if (!catalogue) {
        return (
            <div className="p-6 max-w-3xl">
                <div className="alert alert-error">
                    <span>Catalogue introuvable pour l’ID <span className="font-mono">{catalogueId}</span>.</span>
                </div>
                <div className="mt-4">
                    <button className="btn" onClick={() => router.push('/catalogues')}>← Retour à la liste</button>
                </div>
            </div>
        );
    }

    /* -------------------------------------------------------------------------
     * Render
     * ---------------------------------------------------------------------- */
    const tabsName = `tabs_${catalogueId || 'catalogue'}`;

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-4 print:p-0">
            <ViewerHeader
                offer={offer}
                catalogue={catalogue}
                catPersonnel={selectedCatalogueCatMeta}
                onBack={() => router.push('/catalogues')}
                onConfigure={() => router.push(`/catalogues/${catalogueId}/configure/inline`)}
                onPrint={() => window.print()}
            />

            {includedModules.length === 0 ? (
                <div className="alert alert-info mt-2">Aucun module sélectionné dans ce catalogue.</div>
            ) : (
                <>
                    {/* Tabs DaisyUI (tabs-lift) */}
                    <div className="card bg-base-100 shadow-sm">
                        <div className="card-body">
                            <div className="overflow-x-auto no-scrollbar">
                                <div className="tabs tabs-lift">
                                    {includedModules.map((m, idx) => {
                                        const cnt = groupsCountByModule.get(m.id) || 0;
                                        const setIds = getSetIdsForModule(m.id);
                                        const moduleOptionDepth = getOptionDepthForModule(m.id) || 0;
                                        const moduleOptionsEnabled = normalizeRisk(m?.risque) === 'sante' && moduleOptionDepth > 0;
                                        const label =
                                            `${m.libelle}` ///*${m.code}*/ +
                                        // `${cnt ? ` • ${cnt} gr.` : ''}` +
                                        // `${setId ? ` • ${setId}` : ''}`;

                                        const isChecked =
                                            activeModuleId
                                                ? activeModuleId === m.id
                                                : idx === 0;

                                        return (
                                            <Fragment key={m.id}>
                                                {/* Radio tab (contrôlé via activeModuleId) */}
                                                <input
                                                    type="radio"
                                                    name={tabsName}
                                                    className="tab"
                                                    aria-label={label}
                                                    checked={isChecked}
                                                    onChange={() => setActiveModuleId(m.id)}
                                                />
                                                <div className="tab-content bg-base-100 border-base-300 p-0 sm:p-4">
                                                    <ViewerModulePanel
                                                        module={m}
                                                        catalogueId={catalogueId}
                                                        refNiveau={niveauxForRisk}
                                                        selectedNiveauSetIdBase={setIds.base}
                                                        selectedNiveauSetIdSurco={setIds.surco}
                                                        categoriesByModule={categoriesByModule}
                                                        actsByCategory={actsByCategory}
                                                        membres={membres}
                                                        gvaleurs={gvaleurs}
                                                        groupes={groupes}
                                                        allowSurco={normalizeRisk(m?.risque) !== 'prevoyance'}
                                                        optionsEnabled={moduleOptionsEnabled}
                                                        showSelectionTypeIndicators={normalizeRisk(m?.risque) === 'prevoyance'}
                                                    />
                                               </div>
                                            </Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Impression : tout afficher */}
                    <div className="hidden print:block">
                        {includedModules.map((m) => (
                            <div key={`print-${m.id}`} className="mt-6">
                                {(() => {
                                    const s = getSetIdsForModule(m.id);
                                    return (
                                        <ViewerModulePanel
                                            module={m}
                                            catalogueId={catalogueId}
                                            refNiveau={niveauxForRisk}
                                            selectedNiveauSetIdBase={s.base}
                                            selectedNiveauSetIdSurco={s.surco}
                                            categoriesByModule={categoriesByModule}
                                            actsByCategory={actsByCategory}
                                            membres={membres}
                                            gvaleurs={gvaleurs}
                                            groupes={groupes}
                                            allowSurco={normalizeRisk(m?.risque) !== 'prevoyance'}
                                            optionsEnabled={normalizeRisk(m?.risque) === 'sante' && (getOptionDepthForModule(m.id) || 0) > 0}
                                            showSelectionTypeIndicators={normalizeRisk(m?.risque) === 'prevoyance'}
                                        />
                                    )
                                })()}
                            </div>
                        ))}
                    </div>
                </>
            )}

            <div className="opacity-60 text-xs text-center my-6 print:hidden">
                Affichage en lecture seule • Généré depuis les données locales
            </div>
        </div>
    );
}

export default VisualiserPageBase;
