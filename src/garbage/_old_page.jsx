'use client'

import {Fragment, useMemo, useRef, useState, useEffect, useId} from 'react'
import {useParams, useSearchParams, useRouter} from 'next/navigation'
import {
    useRefOffers,
    useRefCatalogues,
    useRefModules,
    useRefCategories,
    useRefActs,
    useRefNiveau,
    useCatModules
} from '@/providers/AppDataProvider'
import {useGroupStore, uuid} from '@/hooks/useGroupData'

export default function ConfigurerCatalogueInlinePage() {
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()

    // catalogueId depuis le segment ou fallback query
    const routeCatalogueId = params?.catalogueId || ''
    const queryCatalogueId = searchParams.get('catalogueId') || ''
    const catalogueId = String(routeCatalogueId || queryCatalogueId || '')

    // Référentiels
    const {refOffers} = useRefOffers()
    const {refCatalogues} = useRefCatalogues()
    const {refModules} = useRefModules()
    const {refCategories} = useRefCategories()
    const {refActs} = useRefActs()
    const {refNiveau} = useRefNiveau()
    const {catModules, setCatModules} = useCatModules()

    // Maps
    const offerMap = useMemo(() => new Map(refOffers.map(o => [o.id, o])), [refOffers])
    const catalogueMap = useMemo(() => new Map(refCatalogues.map(c => [c.id, c])), [refCatalogues])
    const moduleMap = useMemo(() => new Map(refModules.map(m => [m.id, m])), [refModules])

    const headerCat = catalogueMap.get(catalogueId)
    const offerId = headerCat?.offre_id || ''
    const headerOffer = offerMap.get(offerId)

    if (!catalogueId) {
        return (
            <div className="p-6 max-w-3xl">
                <div className="alert alert-warning">
                    <span>Aucun <span className="font-mono">catalogueId</span> fourni dans l’URL.</span>
                </div>
                <div className="mt-4">
                    <button className="btn" onClick={() => router.push('/catalogues')}>← Retour à la liste</button>
                </div>
            </div>
        )
    }
    if (!headerCat) {
        return (
            <div className="p-6 max-w-3xl">
                <div className="alert alert-error">
                    <span>Catalogue introuvable pour l’ID <span className="font-mono">{catalogueId}</span>.</span>
                </div>
                <div className="mt-4">
                    <button className="btn" onClick={() => router.push('/catalogues')}>← Retour à la liste</button>
                </div>
            </div>
        )
    }

    // Catégories/Actes indexés
    const categoriesByModule = useMemo(() => {
        const by = new Map()
        for (const c of refCategories) {
            if (!by.has(c.ref_module_id)) by.set(c.ref_module_id, [])
            by.get(c.ref_module_id).push(c)
        }
        for (const [, arr] of by) arr.sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || a.code.localeCompare(b.code))
        return by
    }, [refCategories])

    const actsByCategory = useMemo(() => {
        const by = new Map()
        for (const a of refActs) {
            if (!by.has(a.ref_categorie_id)) by.set(a.ref_categorie_id, [])
            by.get(a.ref_categorie_id).push(a)
        }
        for (const [, arr] of by) arr.sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || a.code.localeCompare(b.code))
        return by
    }, [refActs])
    const actMap = useMemo(() => new Map(refActs.map(a => [a.id, a])), [refActs])

    // Stores groupements
    const refs = {catalogueMap, moduleMap}
    const {groupes, setGroupes, membres, setMembres, gvaleurs, setGvaleurs, memberOrderByGroup} = useGroupStore(refs)

    // Modules inclus pour ce catalogue
    const [activeModuleId, setActiveModuleId] = useState('')
    const tabsId = useId()
    const moduleTabsName = `mod_tabs_${tabsId}`

    const [toast, setToast] = useState(null)

    function showToast(type, msg) {
        setToast({type, msg});
        setTimeout(() => setToast(null), 2200)
    }

    const includedRows = useMemo(() => {
        if (!catalogueId) return []
        return (catModules || [])
            .filter(cm => cm.catalogue_id === catalogueId)
            .sort(
                (a, b) =>
                    (a.ordre ?? 0) - (b.ordre ?? 0) ||
                    (moduleMap.get(a.ref_module_id)?.code || '').localeCompare(moduleMap.get(b.ref_module_id)?.code || '')
            )
    }, [catModules, catalogueId, moduleMap])

    const selectedModuleIds = useMemo(() => new Set(includedRows.map(r => r.ref_module_id)), [includedRows])
    const includedModules = useMemo(() => includedRows.map(r => moduleMap.get(r.ref_module_id)).filter(Boolean), [includedRows, moduleMap])

    useEffect(() => {
        if (!catalogueId) return
        if (includedModules.length === 0) {
            setActiveModuleId('');
            return
        }
        if (!includedModules.find(m => m.id === activeModuleId)) {
            setActiveModuleId(includedModules[0].id)
        }
    }, [catalogueId, includedModules, activeModuleId])

    function reindexCatModules(nextAll) {
        const [kept, rows] = nextAll.reduce((acc, cm) => {
            if (cm.catalogue_id === catalogueId) acc[1].push(cm); else acc[0].push(cm);
            return acc;
        }, [[], []]);
        const reindexed = rows.slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)).map((r, i) => ({
            ...r,
            ordre: i + 1
        }));
        return [...kept, ...reindexed];
    }

    function moveModule(modId, dir) {
        if (!catalogueId) return
        const idx = includedRows.findIndex(r => r.ref_module_id === modId)
        const target = dir === 'up' ? idx - 1 : idx + 1
        if (idx < 0 || target < 0 || target >= includedRows.length) return
        const a = includedRows[idx], b = includedRows[target]
        setCatModules(prev => reindexCatModules(prev.map(cm => {
            if (cm.id === a.id) return {...cm, ordre: b.ordre}
            if (cm.id === b.id) return {...cm, ordre: a.ordre}
            return cm
        })))
    }

    const groupsCountByModule = useMemo(() => {
        const map = new Map()
        for (const g of groupes) {
            if (g.catalogue_id !== catalogueId) continue
            map.set(g.ref_module_id, 1 + (map.get(g.ref_module_id) || 0))
        }
        return map
    }, [groupes, catalogueId])

    function nextOrdreForCatalogue() {
        return includedRows.length + 1
    }

    function toggleModule(modId) {
        if (!catalogueId) return
        const isSelected = selectedModuleIds.has(modId)
        if (isSelected) {
            const cnt = groupsCountByModule.get(modId) || 0
            if (cnt > 0 && !confirm(`Des groupes (${cnt}) existent sur ce module. Le masquer ?`)) return
            const next = (catModules || []).filter(cm => !(cm.catalogue_id === catalogueId && cm.ref_module_id === modId))
            setCatModules(reindexCatModules(next))
            if (activeModuleId === modId) setActiveModuleId('')
        } else {
            const mod = moduleMap.get(modId)
            const row = {
                id: uuid(),
                catalogue_id: catalogueId,
                ref_module_id: modId,
                code: mod?.code || '',
                libelle: mod?.libelle || '',
                ordre: nextOrdreForCatalogue(),
                is_enabled: true,
            }
            setCatModules(reindexCatModules([...(catModules || []), row]))
            if (!activeModuleId) setActiveModuleId(modId)
        }
    }

    function selectAllModules() {
        if (!catalogueId) return
        setCatModules(prev => {
            const selected = new Set(prev.filter(x => x.catalogue_id === catalogueId).map(x => x.ref_module_id))
            const adds = refModules
                .filter(m => !selected.has(m.id))
                .map((m, i) => ({
                    id: uuid(),
                    catalogue_id: catalogueId,
                    ref_module_id: m.id,
                    code: m.code,
                    libelle: m.libelle || '',
                    ordre: (selected.size + i + 1),
                    is_enabled: true,
                }))
            return reindexCatModules([...prev, ...adds])
        })
    }

    function clearAllModules() {
        if (!catalogueId) return
        const totalGroups = groupes.filter(g => g.catalogue_id === catalogueId).length
        if (totalGroups > 0 && !confirm(`Ce catalogue contient ${totalGroups} groupe(s). Les modules seront masqués dans l'UI (données conservées). Continuer ?`)) return
        setCatModules((catModules || []).filter(cm => cm.catalogue_id !== catalogueId))
        setActiveModuleId('')
    }

    if (!mounted) {
        return (
            <div className="p-6">
                <div className="skeleton h-8 w-64 mb-4"/>
                <div className="skeleton h-5 w-96 mb-2"/>
                <div className="skeleton h-5 w-80"/>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h1 className="text-2xl font-bold">
                        {headerOffer?.code} — {headerOffer?.libelle}
                    </h1>
                    <div className="opacity-70">
                        Catalogue: {[headerCat?.risque, headerCat?.annee, headerCat?.version].filter(Boolean).join(' · ')}
                    </div>
                </div>
                <div className="join">
                    <button className="btn join-item"
                            onClick={() => router.push(`/catalogues/${catalogueId}/configurer`)}>↔ Mode modal
                    </button>
                    <button className="btn join-item" onClick={() => router.push('/catalogues')}>← Retour liste</button>
                </div>
            </div>

            {/* Sélecteur modules */}
            <div className="card bg-base-100 shadow-sm">
                <div className="card-body p-4">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold">Modules inclus dans ce catalogue</h2>
                        <div className="join">
                            <button className="btn btn-sm join-item" onClick={selectAllModules}>Tout inclure</button>
                            <button className="btn btn-sm join-item" onClick={clearAllModules}>Tout retirer</button>
                        </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                        {refModules.map(m => {
                            const on = mounted ? selectedModuleIds.has(m.id) : false
                            const hasGroups = mounted ? ((groupsCountByModule.get(m.id) || 0) > 0) : false
                            return (
                                <button
                                    key={m.id}
                                    type="button"
                                    className={`btn btn-sm ${on ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => toggleModule(m.id)}
                                    title={hasGroups ? 'Des groupes existent pour ce module' : ''}
                                >
                                    <span className="font-mono">{m.code}</span>
                                    {hasGroups ? <span className="badge badge-xs ml-2">grp</span> : null}
                                </button>
                            )
                        })}
                    </div>

                    <div className="mt-4">
                        <div className="font-semibold mb-2">Ordre d’affichage (onglets)</div>
                        {includedRows.length === 0 ? (
                            <div className="alert alert-info">Sélectionne des modules ci-dessus pour les
                                réordonner.</div>
                        ) : (
                            <div className="space-y-2">
                                {includedRows.map((row, idx) => {
                                    const mod = moduleMap.get(row.ref_module_id)
                                    const isFirst = idx === 0
                                    const isLast = idx === includedRows.length - 1
                                    const groups = groupsCountByModule.get(row.ref_module_id) || 0
                                    return (
                                        <div key={row.id}
                                             className="flex items-center gap-3 border border-base-300 rounded-box p-2">
                                            <div className="join">
                                                <button type="button" className="btn btn-xs join-item"
                                                        disabled={isFirst}
                                                        onClick={() => moveModule(row.ref_module_id, 'up')}
                                                        title="Monter">▲
                                                </button>
                                                <span
                                                    className="btn btn-xs btn-ghost join-item w-10 justify-center">{row.ordre}</span>
                                                <button type="button" className="btn btn-xs join-item" disabled={isLast}
                                                        onClick={() => moveModule(row.ref_module_id, 'down')}
                                                        title="Descendre">▼
                                                </button>
                                            </div>
                                            <div className="badge badge-outline">{mod?.code}</div>
                                            <div className="truncate opacity-70">{mod?.libelle || '—'}</div>
                                            <div className="ml-auto flex items-center gap-2">
                                                {groups > 0 && <div className="badge">{groups} grp</div>}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <div className="opacity-60 text-xs mt-2">
                        L’ordre ci-dessus détermine l’ordre des onglets de configuration.
                    </div>
                </div>
            </div>

            {/* Tabs modules */}
            {includedModules.length === 0 ? (
                <div className="alert alert-info">Sélectionne au moins un module pour commencer à créer des
                    groupes.</div>
            ) : (
                <div className="tabs tabs-lift mt-2">
                    {includedModules.map((m, i) => {
                        const checked = activeModuleId ? activeModuleId === m.id : i === 0
                        return (
                            <Fragment key={m.id}>
                                <label className="tab">
                                    <input
                                        type="radio"
                                        name={moduleTabsName}
                                        checked={checked}
                                        onChange={() => setActiveModuleId(m.id)}
                                    />
                                    {m.code}
                                </label>
                                <div className="tab-content bg-base-100 border-base-300 p-4">
                                    <ModulePanelInline
                                        module={m}
                                        catalogueId={catalogueId}
                                        niveaux={refNiveau}
                                        categoriesByModule={categoriesByModule}
                                        actsByCategory={actsByCategory}
                                        // store
                                        groupes={groupes}
                                        setGroupes={setGroupes}
                                        membres={membres}
                                        setMembres={setMembres}
                                        gvaleurs={gvaleurs}
                                        setGvaleurs={setGvaleurs}
                                        memberOrderByGroup={memberOrderByGroup}
                                        showToast={showToast}
                                        actMap={actMap}
                                    />
                                </div>
                            </Fragment>
                        )
                    })}
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className="toast">
                    <div
                        className={`alert ${toast.type === 'success' ? 'alert-success' : toast.type === 'error' ? 'alert-error' : 'alert-info'}`}>
                        <span>{toast.msg}</span>
                    </div>
                </div>
            )}
        </div>
    )
}

/* ========== Sous-composants ========== */

function ModulePanelInline({
                               module,
                               catalogueId,
                               niveaux,
                               categoriesByModule,
                               actsByCategory,
                               groupes, setGroupes,
                               membres, setMembres,
                               gvaleurs, setGvaleurs,
                               memberOrderByGroup,
                               showToast,
                               actMap,
                           }) {
    const niveauxEnabled = useMemo(
        () => (niveaux || []).filter(n => !!n.is_enabled).sort((a, b) => (a.ordre || 0) - (b.ordre || 0)),
        [niveaux]
    )

    // État d’édition inline : soit création, soit id d’un groupe existant
    const [createOpen, setCreateOpen] = useState(false)
    const [editGroupId, setEditGroupId] = useState(null)

    // Groupes du module
    const myGroups = useMemo(() => groupes.filter(g => g.catalogue_id === catalogueId && g.ref_module_id === module.id), [groupes, catalogueId, module.id])

    // Actions persistées (création/maj/suppression)
    function persistGroup({mode, groupe, selectedActs, displayActIds, valuesByAct, catOrderSelected}) {
        const nom = String(groupe.nom || '').trim()
        if (!nom) {
            showToast('error', 'Nom requis');
            return
        }

        const gid = groupe.id || uuid()
        const orderList = (displayActIds && displayActIds.length) ? displayActIds : (selectedActs || [])

        // upsert groupe (avec l'ordre des catégories sélectionnées)
        const grpPayload = { ...groupe, cat_order: Array.from(catOrderSelected || []) }
        const nextGroupes = groupe.id
            ? groupes.map(x => x.id === groupe.id
                ? { ...grpPayload, id: gid, nom, priorite: Number(groupe.priorite) || 100 }
                : x)
            : [...groupes, { ...grpPayload, id: gid, nom, priorite: Number(groupe.priorite) || 100 }]

        setGroupes(nextGroupes)

        // membres dans l'ordre d'affichage
        const keptM = membres.filter(m => m.groupe_id !== gid)
        const nextMembers = orderList.map((actId, i) => ({groupe_id: gid, act_id: actId, ordre: i + 1}))
        setMembres([...keptM, ...nextMembers])

        // valeurs (facultatif: on suit aussi orderList)
        const restVals = gvaleurs.filter(v => v.groupe_id !== gid)
        const newVals = []
        for (const actId of orderList) {
            const perLevel = (valuesByAct || {})[actId] || {}
            for (const [nivId, pair] of Object.entries(perLevel)) {
                const {baseVal = {}, surcoVal = {}} = pair || {}
                if ((baseVal.value?.trim()?.length || baseVal.expression?.trim()?.length)) {
                    newVals.push(normalizeCell(gid, actId, nivId, 'base', baseVal))
                }
                if ((surcoVal.value?.trim()?.length || surcoVal.expression?.trim()?.length)) {
                    newVals.push(normalizeCell(gid, actId, nivId, 'surco', surcoVal))
                }
            }
        }
        setGvaleurs([...restVals, ...newVals])

        showToast('success', mode === 'edit' ? 'Groupe mis à jour' : 'Groupe créé')
        setCreateOpen(false)
        setEditGroupId(null)
    }

    function requestDelete(g) {
        if (!confirm('Supprimer ce groupe ?')) return
        setGroupes(groupes.filter(x => x.id !== g.id))
        setMembres(membres.filter(m => m.groupe_id !== g.id))
        setGvaleurs(gvaleurs.filter(v => v.groupe_id !== g.id))
        showToast('success', 'Groupe supprimé')
    }

    return (
        <div className="space-y-4">
            {/* Header module */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Module: {module?.code} — {module?.libelle}</h2>
                <div className="join">
                    {!createOpen && editGroupId == null && (
                        <button className="btn btn-primary join-item" onClick={() => setCreateOpen(true)}>+ Nouveau
                            groupe (inline)</button>
                    )}
                    {(createOpen || editGroupId != null) && (
                        <button className="btn btn-ghost join-item" onClick={() => {
                            setCreateOpen(false);
                            setEditGroupId(null)
                        }}>Annuler</button>
                    )}
                </div>
            </div>

            {/* Éditeur de création inline */}
            {createOpen && (
                <InlineGroupEditor
                    key="creator"
                    module={module}
                    catalogueId={catalogueId}
                    niveaux={niveauxEnabled}
                    categoriesByModule={categoriesByModule}
                    actsByCategory={actsByCategory}
                    actMap={actMap}
                    onSave={(payload) => persistGroup({mode: 'create', ...payload})}
                    onCancel={() => {
                        setCreateOpen(false)
                    }}
                />
            )}

            {/* Liste des groupes (avec édition inline individuelle) */}
            {myGroups.length === 0 && !createOpen && (
                <div className="alert alert-info">Aucun groupe pour ce module. Clique sur « Nouveau groupe (inline)
                    ».</div>
            )}

            {myGroups.map(g => (
                <div key={g.id} className="card bg-base-100 shadow-md">
                    <div className="card-body p-4">
                        {editGroupId === g.id ? (
                            <InlineGroupEditor
                                key={`editor-${g.id}`}
                                module={module}
                                catalogueId={catalogueId}
                                niveaux={niveauxEnabled}
                                categoriesByModule={categoriesByModule}
                                actsByCategory={actsByCategory}
                                actMap={actMap}
                                initial={prefillFromStores(g, membres, gvaleurs, niveauxEnabled)}
                                onSave={(payload) => persistGroup({mode: 'edit', ...payload})}
                                onCancel={() => setEditGroupId(null)}
                            />
                        ) : (
                            <>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="text-lg font-semibold">Groupe : {g.nom}</div>
                                    <div className="badge">Priorité {g.priorite}</div>
                                    <div className="ml-auto join">
                                        <button className="btn btn-sm join-item"
                                                onClick={() => setEditGroupId(g.id)}>Modifier inline
                                        </button>
                                        <button className="btn btn-sm btn-error join-item"
                                                onClick={() => requestDelete(g)}>Supprimer
                                        </button>
                                    </div>
                                </div>
                                <ReadonlyGroupMatrix
                                    key={`ro-${g.id}-${JSON.stringify(g.cat_order||[])}`}
                                    group={g}
                                    module={module}
                                    niveaux={niveauxEnabled}
                                    membersSet={buildMembersSet(g, membres)}
                                    categoriesByModule={categoriesByModule}
                                    actsByCategory={actsByCategory}
                                    memberOrderByGroup={memberOrderByGroup}
                                    gvaleurs={gvaleurs}
                                    membres={membres}
                                />
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

/* ---------- InlineGroupEditor : tout se fait dans la page ---------- */

function InlineGroupEditor({
                               module,
                               catalogueId,
                               niveaux,
                               categoriesByModule,
                               actsByCategory,
                               initial,
                               onSave,
                               onCancel,
                               actMap,
                           }) {
    // State groupe & membres sélectionnés
    const [groupe, setGroupe] = useState(() => initial?.groupe || {
        id: null,
        catalogue_id: catalogueId,
        ref_module_id: module.id,
        nom: '',
        priorite: 100
    })
    const [selectedActs, setSelectedActs] = useState(() => initial?.membersArr || [])
    const [valuesByAct, setValuesByAct] = useState(() => initial?.valuesByAct || {})

    // Aides
    const cats = useMemo(
        () => (categoriesByModule.get(module.id) || []).slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || a.code.localeCompare(b.code)),
        [categoriesByModule, module.id]
    )
    // === Ordre des catégories (éditable) ===
    const initialCatOrder = useMemo(() => {
        // ordre par défaut = ordre référentiel (même tri que cats)
        const base = ((categoriesByModule.get(module.id) || [])
                .slice()
                .sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || a.code.localeCompare(b.code))
        ).map(c => c.id)

        // si on édite un groupe existant et qu'un ordre est stocké
        const stored = initial?.groupe?.cat_order
        if (stored && stored.length) {
            const set = new Set(base)
            // on garde uniquement les ids valides, puis on complète par les manquants
            return stored.filter(id => set.has(id)).concat(base.filter(id => !stored.includes(id)))
        }
        return base
    }, [categoriesByModule, module.id, initial?.groupe?.cat_order])

    const [catOrder, setCatOrder] = useState(initialCatOrder)

    // si on change d'initial (édition d'un autre groupe), on resynchronise
    useEffect(() => {
        setCatOrder(initialCatOrder)
    }, [initialCatOrder])

    // Catégories ordonnées selon catOrder
    const catsOrdered = useMemo(() => {
        const byId = new Map((categoriesByModule.get(module.id) || []).map(c => [c.id, c]))
        return (catOrder || []).map(id => byId.get(id)).filter(Boolean)
    }, [catOrder, categoriesByModule, module.id])


    // Comptage des actes sélectionnés par catégorie
    const selectedSet = useMemo(() => new Set(selectedActs), [selectedActs])
    const catSelectedCount = useMemo(() => {
        const m = new Map()
        for (const cat of (categoriesByModule.get(module.id) || [])) {
            const acts = (actsByCategory.get(cat.id) || [])
            let cnt = 0;
            for (const a of acts) if (selectedSet.has(a.id)) cnt++
            m.set(cat.id, cnt)
        }
        return m
    }, [categoriesByModule, module.id, actsByCategory, selectedSet])

    // Liste des catégories "visibles" (ayant ≥1 acte sélectionné) dans l'ordre courant
    const visibleCatIds = useMemo(
        () => (catOrder || []).filter(id => (catSelectedCount.get(id) || 0) > 0),
        [catOrder, catSelectedCount]
    )

    // Déplacer une catégorie (dans l'ensemble des visibles)
    function moveCategory(catId, dir) {
        setCatOrder(prev => {
            const vis = prev.filter(id => (catSelectedCount.get(id) || 0) > 0)
            const i = vis.indexOf(catId)
            const j = dir === 'up' ? i - 1 : i + 1
            if (i < 0 || j < 0 || j >= vis.length) return prev
            const aId = vis[i], bId = vis[j]
            const arr = prev.slice()
            const ia = arr.indexOf(aId), ib = arr.indexOf(bId)
            if (ia < 0 || ib < 0) return prev
                ;
            [arr[ia], arr[ib]] = [arr[ib], arr[ia]]
            return arr
        })
    }


    const orderIndex = useMemo(
        () => new Map(selectedActs.map((id, i) => [id, i])),
        [selectedActs]
    )

    function toggleAct(actId) {
        setSelectedActs(prev => {
            if (prev.includes(actId)) {
                // retirer
                const next = prev.filter(id => id !== actId)
                // nettoyer les valeurs de cet acte
                setValuesByAct(v => {
                    if (!v || !v[actId]) return v
                    const nv = {...v}
                    delete nv[actId]
                    return nv
                })
                return next
            }
            // ajouter en fin
            return [...prev, actId]
        })
    }

    function ensureOrder(actId) {
        setSelectedActs(prev => (prev.includes(actId) ? prev : [...prev, actId]))
    }

    function moveAct(actId, dir) {
        setSelectedActs(prev => {
            const idx = prev.indexOf(actId)
            if (idx < 0) return prev
            const tgt = dir === 'up' ? idx - 1 : idx + 1
            if (tgt < 0 || tgt >= prev.length) return prev
            const arr = prev.slice()
            ;[arr[idx], arr[tgt]] = [arr[tgt], arr[idx]]
            return arr
        })
    }

    // Toggle catégorie (tout ajouter / tout retirer) SANS casser l’ordre courant + nettoyage valeurs
    function toggleCategory(actsInCat, add) {
        const ids = actsInCat.map(a => a.id)
        setSelectedActs(prev => {
            if (add) {
                const set = new Set(prev)
                const append = ids.filter(id => !set.has(id))
                return [...prev, ...append]
            }
            // retirer
            const next = prev.filter(id => !ids.includes(id))
            // nettoyer les valeurs de tous les actes retirés
            setValuesByAct(v => {
                if (!v) return v
                const nv = {...v}
                for (const id of ids) if (nv[id]) delete nv[id]
                return nv
            })
            return next
        })
    }

    // Edition des valeurs (inputs toujours visibles pour les actes sélectionnés)
    function setCell(actId, nivId, kind, patch) {
        setValuesByAct(prev => {
            const next = {...(prev || {})}
            next[actId] = next[actId] || {}
            next[actId][nivId] = next[actId][nivId] || {baseVal: {}, surcoVal: {}}
            const key = kind === 'base' ? 'baseVal' : 'surcoVal'
            next[actId][nivId][key] = {...(next[actId][nivId][key] || {}), ...patch}
            return next
        })
    }

    function submit() {
        // ordre d'affichage = catégories (catOrder) -> actes sélectionnés dans l’ordre utilisateur
        const displayActIds = []
        for (const catId of (catOrder || [])) {
            const acts = (actsByCategory.get(catId) || [])
                .filter(a => selectedSet.has(a.id))
                .sort((a, b) => {
                    const oa = (selectedActs.indexOf(a.id) + 1) || 1e9
                    const ob = (selectedActs.indexOf(b.id) + 1) || 1e9
                    if (oa !== ob) return oa - ob
                    const ra = a.ordre || 0, rb = b.ordre || 0
                    return (ra - rb) || a.code.localeCompare(b.code)
                })
            for (const a of acts) displayActIds.push(a.id)
        }

        const catOrderSelected = (catOrder || []).filter(id => (catSelectedCount.get(id) || 0) > 0)

        onSave({groupe, selectedActs, displayActIds, valuesByAct, catOrderSelected})
    }

    function getDisplayActIds() {
        const out = []
        for (const cat of cats) {
            const acts = (actsByCategory.get(cat.id) || [])
                .filter(a => selectedSet.has(a.id))
                .sort((a, b) => {
                    const oa = orderIndex.get(a.id) ?? 1e9
                    const ob = orderIndex.get(b.id) ?? 1e9
                    if (oa !== ob) return oa - ob
                    const ra = a.ordre || 0, rb = b.ordre || 0
                    return (ra - rb) || a.code.localeCompare(b.code)
                })
            for (const a of acts) out.push(a.id)
        }
        return out
    }

    console.log("selectedSet")
    console.log(selectedSet)

    return (
        <div className="space-y-4">
            {/* En-tête mini formulaire */}
            <div className="border border-base-300 rounded-box p-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="floating-label">
                        <span>Nom du groupe <span className="text-error">*</span></span>
                        <input className="input input-bordered w-full" value={groupe.nom}
                               onChange={e => setGroupe(g => ({...g, nom: e.target.value}))}
                               placeholder="Ex: Soins courants – Base"/>
                    </label>
                    <label className="floating-label">
                        <span>Priorité</span>
                        <input type="number" className="input input-bordered w-full" value={groupe.priorite ?? 100}
                               onChange={e => setGroupe(g => ({...g, priorite: Number(e.target.value || 0)}))}/>
                    </label>
                    <div className="flex items-end gap-2">
                        <button className="btn btn-primary" onClick={submit}>Enregistrer</button>
                        <button className="btn" onClick={onCancel}>Annuler</button>
                    </div>
                </div>
            </div>

            {/* Sélection des actes (par catégorie) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-5">
                    <div className="card bg-base-200">
                        <div className="card-body p-3">
                            <div className="font-semibold mb-2">Sélection des actes</div>
                            <div className="space-y-2 max-h-[50vh] overflow-auto pr-1">
                                {catsOrdered.map(cat => {

                                    const acts = (actsByCategory.get(cat.id) || [])
                                    if (acts.length === 0) return null

                                    const total = acts.length
                                    const selectedCnt = catSelectedCount.get(cat.id) || 0
                                    const allInCat = selectedCnt === total && total > 0
                                    const isVisible = selectedCnt > 0
                                    const isFirstVis = isVisible && visibleCatIds[0] === cat.id
                                    const isLastVis = isVisible && visibleCatIds[visibleCatIds.length - 1] === cat.id

                                    return (
                                        <div key={cat.id} className="border border-base-300 rounded-box">
                                            <div className="flex items-center justify-between p-2 bg-base-300">
                                                <div className="flex items-center gap-2">
                                                    <span className="badge badge-outline">{cat.code}</span>
                                                    <span className="opacity-70">{cat.libelle || '—'}</span>
                                                    {/* Compteur sélectionnés / total */}
                                                    <span className="badge badge-sm">{selectedCnt}/{total}</span>
                                                </div>
                                                <div className="join">
                                                    {/* Ordre des catégories (sur les visibles) */}
                                                    <button
                                                        className="btn btn-xs join-item"
                                                        disabled={!isVisible || isFirstVis}
                                                        onClick={() => moveCategory(cat.id, 'up')}
                                                        title="Monter la catégorie"
                                                    >▲
                                                    </button>
                                                    <button
                                                        className="btn btn-xs join-item"
                                                        disabled={!isVisible || isLastVis}
                                                        onClick={() => moveCategory(cat.id, 'down')}
                                                        title="Descendre la catégorie"
                                                    >▼
                                                    </button>

                                                    {/* Tout ajouter/retirer */}
                                                    <button
                                                        className="btn btn-xs join-item"
                                                        onClick={() => toggleCategory(acts, !allInCat)}
                                                    >
                                                        {allInCat ? 'Tout retirer' : 'Tout ajouter'}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-2">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {acts.map(a => {
                                                        const checked = selectedSet.has(a.id)
                                                        return (
                                                            <label key={a.id}
                                                                   className={`flex items-center gap-2 p-2 rounded-box border ${checked ? 'border-primary' : 'border-base-300'}`}>
                                                                <input type="checkbox" className="checkbox checkbox-sm"
                                                                       checked={checked}
                                                                       onChange={() => toggleAct(a.id)}/>
                                                                <div className="min-w-0">
                                                                    <div className="font-mono text-sm">{a.code}</div>
                                                                    <div
                                                                        className="text-xs opacity-70 truncate">{a.libelle || '—'}</div>
                                                                </div>
                                                                {checked && (
                                                                    <div className="ml-auto join">
                                                                        <button type="button"
                                                                                className="btn btn-xs join-item"
                                                                                onClick={() => moveAct(a.id, 'up')}>▲
                                                                        </button>
                                                                        <button type="button"
                                                                                className="btn btn-xs join-item"
                                                                                onClick={() => moveAct(a.id, 'down')}>▼
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </label>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Matrice inline des valeurs (seulement pour les actes sélectionnés) */}
                <div className="lg:col-span-7">
                    <div className="card bg-base-100">
                        <div className="card-body p-3">
                            <div className="font-semibold mb-2">Valeurs par niveau</div>

                            {selectedActs.length === 0 ? (
                                <div className="alert">Sélectionne des actes à gauche pour saisir les valeurs.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="table">
                                        <thead>
                                        <tr>
                                            <th style={{minWidth: 240}}>Garantie</th>
                                            {niveaux.map(n => (
                                                <th key={n.id} colSpan={2} className="text-center">{n.code}</th>))}
                                        </tr>
                                        <tr>
                                            {niveaux.map(n => (
                                                <Fragment key={`sub-${n.id}`}>
                                                    <th className="text-center">Base</th>
                                                    <th className="text-center">Surco</th>
                                                </Fragment>
                                            ))}
                                        </tr>
                                        </thead>
                                        <tbody>

                                        {catsOrdered.map(cat => {
                                            const acts = (actsByCategory.get(cat.id) || [])
                                                .filter(a => selectedSet.has(a.id))
                                                .sort((a, b) => {
                                                    const oa = (selectedActs.indexOf(a.id) + 1) || 1e9
                                                    const ob = (selectedActs.indexOf(b.id) + 1) || 1e9
                                                    if (oa !== ob) return oa - ob
                                                    const ra = a.ordre || 0, rb = b.ordre || 0
                                                    return (ra - rb) || a.code.localeCompare(b.code)
                                                })
                                            if (acts.length === 0) return null

                                            return (
                                                <Fragment key={cat.id}>
                                                    <tr className="bg-base-200">
                                                        <th colSpan={1 + (niveaux.length * 2)} className="text-left">
                                                            <span className="badge badge-outline mr-2">{cat.code}</span>
                                                            <span className="opacity-70">{cat.libelle || '—'}</span>
                                                        </th>
                                                    </tr>
                                                    {acts.map(a => (
                                                        <InlineRow
                                                            key={a.id}
                                                            actId={a.id}
                                                            niveaux={niveaux}
                                                            valuesByAct={valuesByAct}
                                                            setCell={setCell}
                                                            actMap={actMap}
                                                        />
                                                    ))}
                                                </Fragment>
                                            )
                                        })}

                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function InlineRow({actId, niveaux, valuesByAct, setCell, actMap}) {
    const act = actMap.get(actId);

    // édition locale d'une cellule: { nivId, kind: 'base'|'surco', value, expression }
    const [editing, setEditing] = useState(null);

    function startEdit(nivId, kind) {
        const pair = (valuesByAct?.[actId]?.[nivId]) || {baseVal: {}, surcoVal: {}};
        const cur = (kind === 'base' ? pair.baseVal : pair.surcoVal) || {};
        setEditing({
            nivId,
            kind,
            value: cur.value || '',
            expression: cur.expression || '',
        });
    }

    function cancelEdit() {
        setEditing(null);
    }

    function saveEdit() {
        if (!editing) return;
        const {nivId, kind, value, expression} = editing;
        setCell(actId, nivId, kind, {value, expression});
        setEditing(null);
    }

    function onKeyDown(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            saveEdit();
        }
    }

    function RenderVal({v}) {
        const hasV = (v?.value || '').trim().length > 0;
        const hasE = (v?.expression || '').trim().length > 0;
        if (!hasV && !hasE) return <span className="opacity-40">—</span>;
        return (
            <div className="min-h-8">
                {hasV && <div className="font-mono text-sm break-words">{v.value}</div>}
                {hasE && <div className="text-xs opacity-70 break-words" title={v.expression}>{v.expression}</div>}
            </div>
        );
    }

    return (
        <tr>
            <td className="align-top">
                <div className="flex flex-col">
                    <span className="font-mono font-medium">{act?.code}</span>
                    <span className="opacity-70 text-xs truncate">{act?.libelle || '—'}</span>
                </div>
            </td>

            {niveaux.map((n) => {
                const pair = (valuesByAct?.[actId]?.[n.id]) || {baseVal: {}, surcoVal: {}};
                const isBaseEditing = editing && editing.nivId === n.id && editing.kind === 'base';
                const isSurcEditing = editing && editing.nivId === n.id && editing.kind === 'surco';

                return (
                    <Fragment key={`${actId}-${n.id}`}>
                        {/* BASE */}
                        <td
                            onDoubleClick={() => startEdit(n.id, 'base')}
                            title="Double-clique pour éditer"
                        >
                            {isBaseEditing ? (
                                <div className="space-y-2" onKeyDown={onKeyDown}>
                                    <input
                                        className="input input-sm input-bordered w-full font-mono"
                                        placeholder="value"
                                        autoFocus
                                        value={editing.value}
                                        onChange={(e) => setEditing((s) => ({...s, value: e.target.value}))}
                                    />
                                    <input
                                        className="input input-sm input-bordered w-full"
                                        placeholder="expression"
                                        value={editing.expression}
                                        onChange={(e) => setEditing((s) => ({...s, expression: e.target.value}))}
                                    />
                                    <div className="join">
                                        <button type="button" className="btn btn-xs btn-primary join-item"
                                                onClick={saveEdit}>Enregistrer
                                        </button>
                                        <button type="button" className="btn btn-xs join-item"
                                                onClick={cancelEdit}>Annuler
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <RenderVal v={pair.baseVal}/>
                            )}
                        </td>

                        {/* SURCO */}
                        <td
                            onDoubleClick={() => startEdit(n.id, 'surco')}
                            title="Double-clique pour éditer"
                        >
                            {isSurcEditing ? (
                                <div className="space-y-2" onKeyDown={onKeyDown}>
                                    <input
                                        className="input input-sm input-bordered w-full font-mono"
                                        placeholder="value"
                                        autoFocus
                                        value={editing.value}
                                        onChange={(e) => setEditing((s) => ({...s, value: e.target.value}))}
                                    />
                                    <input
                                        className="input input-sm input-bordered w-full"
                                        placeholder="expression"
                                        value={editing.expression}
                                        onChange={(e) => setEditing((s) => ({...s, expression: e.target.value}))}
                                    />
                                    <div className="join">
                                        <button type="button" className="btn btn-xs btn-primary join-item"
                                                onClick={saveEdit}>Enregistrer
                                        </button>
                                        <button type="button" className="btn btn-xs join-item"
                                                onClick={cancelEdit}>Annuler
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <RenderVal v={pair.surcoVal}/>
                            )}
                        </td>
                    </Fragment>
                );
            })}
        </tr>
    );
}


/* ---------- Vue lecture seule pour les groupes existants (rapide) ---------- */

function ReadonlyGroupMatrix({
                                 group, module, niveaux,
                                 membersSet, categoriesByModule, actsByCategory,
                                 memberOrderByGroup, gvaleurs, membres,
                             }) {


    console.log(memberOrderByGroup)
    console.log(membres)
    // fallback si memberOrderByGroup ne donne rien (ex: tout juste après un setMembres)
    const orderMapLocal = useMemo(() => {
        const map = new Map()
        if (!Array.isArray(membres)) return map
        const rows = membres
            .filter(m => m.groupe_id === group.id)
            .sort((a, b) => (a.ordre || 1e9) - (b.ordre || 1e9))
        rows.forEach((m, i) => map.set(m.act_id, i + 1))
        return map
    }, [membres, group.id])

    // ordre référentiel de base
    const catsBase = useMemo(
        () => (categoriesByModule.get(module.id) || [])
            .slice()
            .sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || a.code.localeCompare(b.code)),
        [categoriesByModule, module.id]
    )

    // si group.cat_order est présent, on le respecte
    const cats = useMemo(() => {
        const raw = group?.cat_order;
        const toArray = (x) => {
            if (Array.isArray(x)) return x.slice();
            if (!x) return [];
            if (typeof x === 'string') {
                try { const j = JSON.parse(x); if (Array.isArray(j)) return j; } catch {}
                return x.split(',').map(s => s.trim()).filter(Boolean);
            }
            if (typeof x === 'object') {
                const entries = Object.entries(x);
                const numeric = entries.every(([, v]) => Number.isFinite(+v));
                return (numeric ? entries.sort((a,b) => (+a[1])- (+b[1])) : entries).map(([k]) => k);
            }
            return [];
        };

        const order = toArray(raw);
        if (order.length === 0) return catsBase;

        const byId = new Map(catsBase.map(c => [c.id, c]));
        const arr = order.map(id => byId.get(id)).filter(Boolean);
        for (const c of catsBase) if (!order.includes(c.id)) arr.push(c);
        return arr;
    }, [catsBase, JSON.stringify(group?.cat_order ?? [])]);

    const orderMap = useMemo(() => {
        // si on a déjà l’ordre depuis les membres persistés, on l’utilise en priorité
        if (orderMapLocal && orderMapLocal.size > 0) return orderMapLocal
        // sinon on prend la map du store (qui peut être vide le temps d’un render)
        return memberOrderByGroup.get(group.id) || new Map()
    }, [orderMapLocal, memberOrderByGroup, group.id])

    const valMap = useMemo(() => {
        const m = new Map()
        for (const v of gvaleurs || []) {
            if (v.groupe_id !== group.id) continue
            const key = `${v.act_id}::${v.niveau_id}::${v.kind}`
            m.set(key, {value: v?.commentaire || '', expression: v?.expression || ''})
        }
        return m
    }, [gvaleurs, group.id])

    function cellVal(actId, nivId, kind) {
        return valMap.get(`${actId}::${nivId}::${kind}`) || {value: '', expression: ''}
    }

    console.log("cats")
    console.log(cats)
    console.log("membersSet")
    console.log(membersSet)
    return (
        <div className="overflow-x-auto">
            <table className="table">
                <thead>
                <tr>
                    <th rowSpan={2} className="align-bottom" style={{minWidth: 260}}>Garantie</th>
                    {niveaux.map(n => (<th key={n.id} colSpan={2} className="text-center">{n.code}</th>))}
                </tr>
                <tr>
                    {niveaux.map(n => (
                        <Fragment key={`sub-${n.id}`}>
                            <th className="text-center">Base</th>
                            <th className="text-center">Surco</th>
                        </Fragment>
                    ))}
                </tr>
                </thead>
                <tbody>
                {cats.map(cat => {
                    const acts = (actsByCategory.get(cat.id) || [])
                        .filter(a => membersSet.has(a.id))
                        .sort((a, b) => {
                            const oa = orderMap.get(a.id) ?? 1e9
                            const ob = orderMap.get(b.id) ?? 1e9
                            if (oa !== ob) return oa - ob
                            // fallback stable
                            const ra = a.ordre || 0, rb = b.ordre || 0
                            return (ra - rb) || a.code.localeCompare(b.code)
                        })
                    if (acts.length === 0) return null
                    return (
                        <Fragment key={cat.id}>
                            <tr className="bg-base-200">
                                <th colSpan={1 + (niveaux.length * 2)} className="text-left">
                                    <span className="badge badge-outline mr-2">{cat.code}</span>
                                    <span className="opacity-70">{cat.libelle || '—'}</span>
                                </th>
                            </tr>
                            {acts.map(a => (
                                <tr key={a.id}>
                                    <td className="table-pin-cols">
                                        <div className="flex flex-col">
                                            <span className="font-mono font-medium">{a.code}</span>
                                            <span className="opacity-70 truncate">{a.libelle || '—'}</span>
                                        </div>
                                    </td>
                                    {niveaux.map(n => {
                                        const base = cellVal(a.id, n.id, 'base')
                                        const surc = cellVal(a.id, n.id, 'surco')
                                        return (
                                            <Fragment key={`${a.id}-${n.id}`}>
                                                <td><RenderVal v={base}/></td>
                                                <td><RenderVal v={surc}/></td>
                                            </Fragment>
                                        )
                                    })}
                                </tr>
                            ))}
                        </Fragment>
                    )
                })}
                </tbody>
            </table>
        </div>
    )
}

function RenderVal({v}) {
    const hasV = (v.value || '').trim().length > 0
    const hasE = (v.expression || '').trim().length > 0
    if (!hasV && !hasE) return <span className="opacity-40">—</span>
    return (
        <div className="min-h-8">
            {hasV && <div className="font-mono text-sm break-words">{v.value}</div>}
            {hasE && <div className="text-xs opacity-70 break-words" title={v.expression}>{v.expression}</div>}
        </div>
    )
}

/* ---------- Helpers ---------- */

function buildMembersSet(group, membres) {
    const set = new Set()
    for (const m of membres) if (m.groupe_id === group.id) set.add(m.act_id)
    return set
}

function prefillFromStores(g, membres, gvaleurs, niveaux) {
    const membersRows = membres.filter(m => m.groupe_id === g.id).sort((a, b) => (a.ordre || 1e9) - (b.ordre || 1e9))
    const membersArr = membersRows.map(m => m.act_id)
    const toMini = (v) => ({value: (v?.commentaire ?? ''), expression: (v?.expression ?? '')})

    const valuesByAct = {}
    for (const actId of membersArr) {
        valuesByAct[actId] = {}
        for (const n of niveaux || []) {
            const base = gvaleurs.find(v => v.groupe_id === g.id && v.act_id === actId && v.niveau_id === n.id && v.kind === 'base')
            const surc = gvaleurs.find(v => v.groupe_id === g.id && v.act_id === actId && v.niveau_id === n.id && v.kind === 'surco')
            if (base || surc) {
                valuesByAct[actId][n.id] = {baseVal: toMini(base), surcoVal: toMini(surc)}
            }
        }
    }

    return {
        groupe: {...g},
        membersArr,
        valuesByAct,
    }
}

function normalizeCell(gid, actId, nivId, kind, mini) {
    return {
        id: crypto?.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36),
        groupe_id: gid,
        act_id: actId,
        niveau_id: nivId,
        kind,                 // 'base' | 'surco'
        mode: 'texte_libre',
        base: 'inconnu',
        taux: null,
        montant: null,
        unite: 'inconnu',
        plafond_montant: null,
        plafond_unite: null,
        periodicite: null,
        condition_json: null,
        expression: mini?.expression || '',
        commentaire: mini?.value || '',
    };
}
