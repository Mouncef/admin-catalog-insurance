'use client'

import { Fragment, useMemo, useRef, useState, useEffect, useId } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import {
    useRefOffers,
    useRefCatalogues,
    useRefModules,
    useRefCategories,
    useRefActs,
    useRefNiveau,
    useCatModules
} from '@/providers/AppDataProvider'
import { useGroupStore, uuid } from '@/hooks/useGroupData'
import GroupeModal from '@/components/regroupements/GroupeModal'


export default function ConfigurerCataloguePage() {
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()

    // Lecture ID catalogue depuis l'URL (segment) ou fallback querystring
    const routeCatalogueId = params?.catalogueId || ''
    const queryCatalogueId = searchParams.get('catalogueId') || ''
    const catalogueId = String(routeCatalogueId || queryCatalogueId || '')

    // Référentiels
    const { refOffers } = useRefOffers()
    const { refCatalogues } = useRefCatalogues()
    const { refModules } = useRefModules()
    const { refCategories } = useRefCategories()
    const { refActs } = useRefActs()
    const { refNiveau } = useRefNiveau()
    const { catModules, setCatModules } = useCatModules()

    // Maps & dérivés
    const offerMap = useMemo(() => new Map(refOffers.map(o => [o.id, o])), [refOffers])
    const catalogueMap = useMemo(() => new Map(refCatalogues.map(c => [c.id, c])), [refCatalogues])
    const moduleMap = useMemo(() => new Map(refModules.map(m => [m.id, m])), [refModules])

    const headerCat = catalogueMap.get(catalogueId)
    const offerId = headerCat?.offre_id || ''
    const headerOffer = offerMap.get(offerId)

    // Gardes simples
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

    // Indexations catégories/actes (identiques)
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

    // Stores groupements
    const refs = { catalogueMap, moduleMap }
    const { groupes, setGroupes, membres, setMembres, gvaleurs, setGvaleurs, memberOrderByGroup } = useGroupStore(refs)

    // Onglet actif
    const [activeModuleId, setActiveModuleId] = useState('')
    const tabsId = useId()
    const moduleTabsName = `mod_tabs_${tabsId}`

    const upsertDialogRef = useRef(null)
    const [modalPayload, setModalPayload] = useState(null)
    const [toast, setToast] = useState(null)
    function showToast(type, msg) { setToast({ type, msg }); setTimeout(() => setToast(null), 2200) }

    // --- modules inclus de ce catalogue ---
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
        if (includedModules.length === 0) { setActiveModuleId(''); return }
        if (!includedModules.find(m => m.id === activeModuleId)) {
            setActiveModuleId(includedModules[0].id)
        }
    }, [catalogueId, includedModules, activeModuleId])

    function reindexCatModules(nextAll) {
        const [kept, rows] = nextAll.reduce((acc, cm) => {
            if (cm.catalogue_id === catalogueId) acc[1].push(cm); else acc[0].push(cm);
            return acc;
        }, [[], []]);
        const reindexed = rows.slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)).map((r, i) => ({ ...r, ordre: i + 1 }));
        return [...kept, ...reindexed];
    }
    function moveModule(modId, dir) {
        if (!catalogueId) return
        const idx = includedRows.findIndex(r => r.ref_module_id === modId)
        const target = dir === 'up' ? idx - 1 : idx + 1
        if (idx < 0 || target < 0 || target >= includedRows.length) return
        const a = includedRows[idx], b = includedRows[target]
        setCatModules(prev => reindexCatModules(prev.map(cm => {
            if (cm.id === a.id) return { ...cm, ordre: b.ordre }
            if (cm.id === b.id) return { ...cm, ordre: a.ordre }
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
    function nextOrdreForCatalogue() { return includedRows.length + 1 }

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

    // Membres/groupes pour matrices
    const membersByGroup = useMemo(() => {
        const by = new Map()
        for (const m of membres) {
            if (!by.has(m.groupe_id)) by.set(m.groupe_id, new Set())
            by.get(m.groupe_id).add(m.act_id)
        }
        return by
    }, [membres])
    const actToCat = useMemo(() => {
        const m = new Map()
        for (const [catId, arr] of actsByCategory.entries()) {
            for (const a of (arr || [])) m.set(a.id, catId)
        }
        return m
    }, [actsByCategory])

    function openCreate(moduleId) {
        const modId = moduleId || activeModuleId
        if (!catalogueId || !modId) return
        if (!selectedModuleIds.has(modId)) {
            showToast('error', 'Sélectionne d’abord le module dans ce catalogue')
            return
        }
        const cat = headerCat
        const mod = moduleMap.get(modId)
        setModalPayload({
            groupe: { id: null, catalogue_id: catalogueId, ref_module_id: modId, nom: '', priorite: 100 },
            membersSet: new Set(),
            valuesByAct: {},
            _catalogueLabel: [cat?.risque, cat?.annee, cat?.version].filter(Boolean).join(' · '),
            _moduleLabel: `${mod?.code || ''} — ${mod?.libelle || ''}`,
        })
        upsertDialogRef.current?.showModal()
    }

    function openEdit(g) {
        const cat = headerCat
        const mod = moduleMap.get(g.ref_module_id)
        const rows = membres.filter(m => m.groupe_id === g.id).sort((a, b) => (a.ordre || 1e9) - (b.ordre || 1e9))
        const mem = new Set(rows.map(m => m.act_id))
        const membersArr = rows.map(m => m.act_id)
        const toMini = (v) => ({ value: (v?.commentaire ?? ''), expression: (v?.expression ?? '') })

        const valuesByAct = {}
        const selectedLevelsByAct = {}

        for (const actId of mem) {
            valuesByAct[actId] = {}
            selectedLevelsByAct[actId] = new Set()
            for (const n of refNiveau) {
                const base = gvaleurs.find(v => v.groupe_id === g.id && v.act_id === actId && v.niveau_id === n.id && v.kind === 'base')
                const surc = gvaleurs.find(v => v.groupe_id === g.id && v.act_id === actId && v.niveau_id === n.id && v.kind === 'surco')
                if (base || surc) {
                    valuesByAct[actId][n.id] = { baseVal: toMini(base), surcoVal: toMini(surc) }
                    selectedLevelsByAct[actId].add(n.id)
                }
            }
        }

        setModalPayload({
            groupe: { ...g },
            membersSet: mem,
            membersArr,
            valuesByAct,
            selectedLevelsByAct,
            _catalogueLabel: [cat?.risque, cat?.annee, cat?.version].filter(Boolean).join(' · '),
            _moduleLabel: `${mod?.code || ''} — ${mod?.libelle || ''}`,
        })
        upsertDialogRef.current?.showModal()
    }

    function handleSubmit(payload) {
        const g = payload.groupe
        const nom = String(g.nom || '').trim();
        if (!nom) return showToast('error', 'Nom requis')

        let gid = g.id || uuid()
        const nextGroupes = g.id ? groupes.map(x => x.id === g.id ? {
            ...g, id: gid, nom, priorite: Number(g.priorite) || 100
        } : x) : [...groupes, { ...g, id: gid, nom, priorite: Number(g.priorite) || 100 }]
        setGroupes(nextGroupes)

        const keptM = membres.filter(m => m.groupe_id !== gid)
        const ordered = (payload.membersArr && payload.membersArr.length > 0)
            ? payload.membersArr.slice()
            : Array.from(payload.membersSet || [])
        const nextMembers = ordered.map((actId, i) => ({ groupe_id: gid, act_id: actId, ordre: i + 1 }))
        setMembres([...keptM, ...nextMembers])

        const restVals = gvaleurs.filter(v => v.groupe_id !== gid)
        const newVals = []
        for (const [actId, perLevel] of Object.entries(payload.valuesByAct || {})) {
            for (const [nivId, pair] of Object.entries(perLevel || {})) {
                newVals.push(normalizeVal(pair.baseVal, gid, actId, nivId, 'base'))
                newVals.push(normalizeVal(pair.surcoVal, gid, actId, nivId, 'surco'))
            }
        }
        setGvaleurs([...restVals, ...newVals])

        showToast('success', g.id ? 'Groupe mis à jour' : 'Groupe créé')
        upsertDialogRef.current?.close();
        setModalPayload(null)
    }

    function normalizeVal(v, gid, actId, nivId, kind) {
        return {
            id: v?.id || uuid(),
            groupe_id: gid,
            act_id: actId,
            niveau_id: nivId,
            kind, // 'base' | 'surco'
            mode: 'texte_libre',
            base: 'inconnu',
            taux: null,
            montant: null,
            unite: 'inconnu',
            plafond_montant: null,
            plafond_unite: null,
            periodicite: null,
            condition_json: null,
            expression: v?.expression || '',
            commentaire: v?.value || '',
        }
    }

    function requestDelete(g) {
        if (!confirm('Supprimer ce groupe ?')) return
        setGroupes(groupes.filter(x => x.id !== g.id))
        setMembres(membres.filter(m => m.groupe_id !== g.id))
        setGvaleurs(gvaleurs.filter(v => v.groupe_id !== g.id))
        showToast('success', 'Groupe supprimé')
    }

    // === Rendu (plus d’étapes, tout est contextuel au catalogueId) ===
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
                    <button className="btn join-item" onClick={() => router.push('/catalogues')}>← Retour à la liste</button>
                </div>
            </div>

            {/* Sélecteur des modules inclus */}
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
                            const on = selectedModuleIds.has(m.id)
                            const hasGroups = (groupsCountByModule.get(m.id) || 0) > 0
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

                    {/* Réordonnancement */}
                    <div className="mt-4">
                        <div className="font-semibold mb-2">Ordre d’affichage (onglets)</div>
                        {includedRows.length === 0 ? (
                            <div className="alert alert-info">Sélectionne des modules ci-dessus pour les réordonner.</div>
                        ) : (
                            <div className="space-y-2">
                                {includedRows.map((row, idx) => {
                                    const mod = moduleMap.get(row.ref_module_id)
                                    const isFirst = idx === 0
                                    const isLast = idx === includedRows.length - 1
                                    const groups = groupsCountByModule.get(row.ref_module_id) || 0
                                    return (
                                        <div key={row.id} className="flex items-center gap-3 border border-base-300 rounded-box p-2">
                                            <div className="join">
                                                <button type="button" className="btn btn-xs join-item" disabled={isFirst} onClick={() => moveModule(row.ref_module_id, 'up')} title="Monter">▲</button>
                                                <span className="btn btn-xs btn-ghost join-item w-10 justify-center">{row.ordre}</span>
                                                <button type="button" className="btn btn-xs join-item" disabled={isLast} onClick={() => moveModule(row.ref_module_id, 'down')} title="Descendre">▼</button>
                                            </div>
                                            <div className="badge badge-outline">{mod?.code}</div>
                                            <div className="truncate opacity-70">{mod?.libelle || '—'}</div>
                                            <div className="ml-auto flex items-center gap-2">
                                                {groups > 0 && <div className="badge">{groups} grp</div>}
                                                <button type="button" className="btn btn-xs btn-ghost" onClick={() => toggleModule(row.ref_module_id)} title="Retirer du catalogue">Retirer</button>
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

            {/* Tabs Modules */}
            {includedModules.length === 0 ? (
                <div className="alert alert-info">Sélectionne au moins un module pour commencer à créer des groupes.</div>
            ) : (
                <div className="tabs tabs-lift mt-2">
                    {includedModules.map((m, i) => {
                        const checked = activeModuleId ? activeModuleId === m.id : i === 0
                        const rows = groupes.filter(g => g.catalogue_id === catalogueId && g.ref_module_id === m.id)
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
                                    <ModulePanel
                                        module={m}
                                        groupes={rows}
                                        membersByGroup={membersByGroup}
                                        memberOrderByGroup={memberOrderByGroup}
                                        niveaux={refNiveau}
                                        categoriesByModule={categoriesByModule}
                                        actsByCategory={actsByCategory}
                                        gvaleurs={gvaleurs}
                                        setGvaleurs={setGvaleurs}
                                        onCreate={() => openCreate(m.id)}
                                        onEdit={openEdit}
                                        onDelete={requestDelete}
                                    />
                                </div>
                            </Fragment>
                        )
                    })}
                </div>
            )}

            {/* Modal */}
            {modalPayload && (
                <GroupeModal
                    dialogRef={upsertDialogRef}
                    initial={modalPayload}
                    onSubmit={handleSubmit}
                    onCancel={() => { upsertDialogRef.current?.close(); setModalPayload(null) }}
                    niveaux={refNiveau}
                    categoriesByModule={categoriesByModule}
                    actsByCategory={actsByCategory}
                />
            )}

            {/* Toast */}
            {toast && (
                <div className="toast">
                    <div className={`alert ${toast.type === 'success' ? 'alert-success' : toast.type === 'error' ? 'alert-error' : 'alert-info'}`}>
                        <span>{toast.msg}</span>
                    </div>
                </div>
            )}
        </div>
    )
}

/* === Sous-composants identiques à ta version === */
function ModulePanel({
                         module,
                         groupes,
                         membersByGroup,
                         memberOrderByGroup,
                         niveaux,
                         categoriesByModule,
                         actsByCategory,
                         gvaleurs,
                         setGvaleurs,
                         onCreate,
                         onEdit,
                         onDelete,
                     }) {
    const niveauxEnabled = useMemo(
        () => (niveaux || []).filter(n => !!n.is_enabled).sort((a, b) => (a.ordre || 0) - (b.ordre || 0)),
        [niveaux]
    )

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Module: {module?.code} — {module?.libelle}</h2>
                <button className="btn btn-primary" onClick={onCreate}>+ Nouveau groupe</button>
            </div>

            {groupes.length === 0 && (
                <div className="alert alert-info">Aucun groupe pour ce module. Cliquez sur « Nouveau groupe ».</div>
            )}

            {groupes.map(g => (
                <GroupMatrix
                    key={g.id}
                    group={g}
                    module={module}
                    niveaux={niveauxEnabled}
                    membersSet={membersByGroup.get(g.id) || new Set()}
                    categoriesByModule={categoriesByModule}
                    actsByCategory={actsByCategory}
                    gvaleurs={gvaleurs}
                    setGvaleurs={setGvaleurs}
                    memberOrderByGroup={memberOrderByGroup}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}
        </div>
    )
}

function GroupMatrix({
                         group,
                         module,
                         niveaux,
                         membersSet,
                         categoriesByModule,
                         actsByCategory,
                         gvaleurs,
                         setGvaleurs,
                         memberOrderByGroup,
                         onEdit,
                         onDelete,
                     }) {
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState({ value: '', expression: '' })

    function startEdit(actId, nivId, kind) {
        const cur = cellVal(actId, nivId, kind)
        setEditing({ actId, nivId, kind })
        setForm({ value: cur.value || '', expression: cur.expression || '' })
    }
    function cancelEdit() { setEditing(null); setForm({ value: '', expression: '' }) }
    function saveEdit() {
        if (!editing) return;
        const { actId, nivId, kind } = editing;
        const v = { ...form };
        const hasContent = (v.value?.trim()?.length || 0) > 0 || (v.expression?.trim()?.length || 0) > 0;

        const next = (gvaleurs || []).filter(
            x => !(x.groupe_id===group.id && x.act_id===actId && x.niveau_id===nivId && x.kind===kind)
        );
        if (hasContent) next.push(normalizeCell(group.id, actId, nivId, kind, v));
        setGvaleurs(next);
        cancelEdit();
    }
    function onKeyDown(e){ if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); } if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); } }
    function normalizeCell(gid, actId, nivId, kind, mini){
        return {
            id: crypto?.randomUUID ? crypto.randomUUID() : 'id-'+Math.random().toString(36).slice(2)+Date.now().toString(36),
            groupe_id: gid, act_id: actId, niveau_id: nivId, kind,
            mode: 'texte_libre', base: 'inconnu', taux: null, montant: null, unite: 'inconnu',
            plafond_montant: null, plafond_unite: null, periodicite: null, condition_json: null,
            expression: mini?.expression || '', commentaire: mini?.value || '',
        };
    }

    const valMap = useMemo(() => {
        const m = new Map()
        for (const v of gvaleurs || []) {
            if (v.groupe_id !== group.id) continue
            const key = `${v.act_id}::${v.niveau_id}::${v.kind}`
            m.set(key, { value: v?.commentaire || '', expression: v?.expression || '' })
        }
        return m
    }, [gvaleurs, group.id])
    function cellVal(actId, nivId, kind) { return valMap.get(`${actId}::${nivId}::${kind}`) || {value: '', expression: ''} }

    const cats = useMemo(
        () => (categoriesByModule.get(module.id) || []).slice().sort(
            (a, b) => (a.ordre || 0) - (b.ordre || 0) || a.code.localeCompare(b.code)),
        [categoriesByModule, module.id]
    )
    const orderMap = useMemo(() => memberOrderByGroup.get(group.id) || new Map(), [memberOrderByGroup, group.id])

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

    return (
        <div className="card bg-base-100 shadow-md">
            <div className="card-body p-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="text-lg font-semibold">Groupe : {group.nom}</div>
                    <div className="badge">Priorité {group.priorite}</div>
                    <div className="ml-auto join">
                        <button className="btn btn-sm join-item" onClick={() => onEdit(group)}>Modifier</button>
                        <button className="btn btn-sm btn-error join-item" onClick={() => onDelete(group)}>Supprimer</button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="table">
                        <thead className="table-pin-rows">
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
                        <tbody className="table-pin-rows">
                        {cats.map(cat => {
                            const acts = (actsByCategory.get(cat.id) || [])
                                .filter(a => membersSet.has(a.id))
                                .sort((a, b) => {
                                    const oa = (orderMap.get(a.id) ?? 1e9)
                                    const ob = (orderMap.get(b.id) ?? 1e9)
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
                                                        <td onDoubleClick={() => startEdit(a.id, n.id, 'base')} title="Double-cliquez pour éditer">
                                                            {(editing && editing.actId===a.id && editing.nivId===n.id && editing.kind==='base')
                                                                ? (
                                                                    <div className="space-y-2" onKeyDown={onKeyDown}>
                                                                        <input className="input input-sm input-bordered w-full font-mono" placeholder="value" autoFocus value={form.value} onKeyDown={onKeyDown} onChange={e=> setForm(f=> ({...f, value: e.target.value}))}/>
                                                                        <input className="input input-sm input-bordered w-full" placeholder="expression" value={form.expression} onKeyDown={onKeyDown} onChange={e=> setForm(f=> ({...f, expression: e.target.value}))}/>
                                                                        <div className="join">
                                                                            <button type="button" className="btn btn-xs btn-primary join-item" onClick={saveEdit}>Enregistrer</button>
                                                                            <button type="button" className="btn btn-xs join-item" onClick={cancelEdit}>Annuler</button>
                                                                        </div>
                                                                    </div>
                                                                )
                                                                : <RenderVal v={base} />
                                                            }
                                                        </td>
                                                        <td onDoubleClick={() => startEdit(a.id, n.id, 'surco')} title="Double-cliquez pour éditer">
                                                            {(editing && editing.actId===a.id && editing.nivId===n.id && editing.kind==='surco')
                                                                ? (
                                                                    <div className="space-y-2" onKeyDown={onKeyDown}>
                                                                        <input className="input input-sm input-bordered w-full font-mono" placeholder="value" autoFocus value={form.value} onKeyDown={onKeyDown} onChange={e=> setForm(f=> ({...f, value: e.target.value}))}/>
                                                                        <input className="input input-sm input-bordered w-full" placeholder="expression" value={form.expression} onKeyDown={onKeyDown} onChange={e=> setForm(f=> ({...f, expression: e.target.value}))}/>
                                                                        <div className="join">
                                                                            <button type="button" className="btn btn-xs btn-primary join-item" onClick={saveEdit}>Enregistrer</button>
                                                                            <button type="button" className="btn btn-xs join-item" onClick={cancelEdit}>Annuler</button>
                                                                        </div>
                                                                    </div>
                                                                )
                                                                : <RenderVal v={surc} />
                                                            }
                                                        </td>
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
            </div>
        </div>
    )
}
