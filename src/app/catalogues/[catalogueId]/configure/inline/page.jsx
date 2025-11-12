'use client'

import {useCallback, useEffect, useMemo, useState} from 'react'
import {useParams, useSearchParams, useRouter} from 'next/navigation'
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
} from '@/providers/AppDataProvider'

import {useGroupStore, uuid} from '@/hooks/useGroupData'
import CatalogueHeader from '@/components/catalogues/CatalogueHeader'
import ModulesSelector from '@/components/catalogues/ModulesSelector'
import ModuleOrderList from '@/components/catalogues/ModuleOrderList'
import ModuleTabs from '@/components/catalogues/ModuleTabs'
import ToastInline from '@/components/common/ToastInline'
import ModulePanelContainer from '@/components/catalogues/ModulePanelContainer'
import { normalizeRisk } from '@/lib/utils/StringUtil'
import { buildVirtualCategory } from '@/lib/utils/categoryUtils'

export default function ConfigurerCatalogueInlinePage() {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

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
    const {refNiveauSets} = useRefNiveauSets()
    const {catModules, setCatModules} = useCatModules()
    const {refCatPersonnel} = useRefCatPersonnel()

    // Maps
    const offerMap = useMemo(() => new Map(refOffers.map(o => [o.id, o])), [refOffers])
    const catalogueMap = useMemo(() => new Map(refCatalogues.map(c => [c.id, c])), [refCatalogues])
    const headerCat = catalogueMap.get(catalogueId)
    const offerId = headerCat?.offre_id || ''
    const headerOffer = offerMap.get(offerId)

    // redirections/erreurs simples
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

    const catalogueRisk = normalizeRisk(headerCat?.risque)
    const allowMultipleNiveaux = headerCat?.allow_multiple_niveaux !== false
    const forcedSetId = headerCat?.default_niveau_set_id || null

    const modulesForRisk = useMemo(() => {
        const target = catalogueRisk
        return (refModules || []).filter((m) => normalizeRisk(m.risque) === target)
    }, [refModules, catalogueRisk])

    const moduleMap = useMemo(() => new Map(modulesForRisk.map((m) => [m.id, m])), [modulesForRisk])
    const catPersonnelOrdered = useMemo(() => {
        const arr = Array.isArray(refCatPersonnel) ? [...refCatPersonnel] : []
        return arr.sort(
            (a, b) =>
                (a.ordre ?? 0) - (b.ordre ?? 0) ||
                String(a.libelle || a.code || '').localeCompare(String(b.libelle || b.code || ''))
        )
    }, [refCatPersonnel])
    const enabledCatPersonnel = useMemo(
        () => catPersonnelOrdered.filter((c) => c.is_enabled !== false),
        [catPersonnelOrdered]
    )
    const catPersonnelIdSet = useMemo(() => new Set(catPersonnelOrdered.map((c) => c.id)), [catPersonnelOrdered])
    const catPersonnelOrderIndex = useMemo(() => {
        const map = new Map()
        catPersonnelOrdered.forEach((cat, idx) => map.set(cat.id, idx))
        return map
    }, [catPersonnelOrdered])
    const catPersonnelMap = useMemo(
        () => new Map(catPersonnelOrdered.map((c) => [c.id, c])),
        [catPersonnelOrdered]
    )
    const cleanCatalogueCatIds = useCallback(
        (rawIds) => {
            const input = Array.isArray(rawIds) ? rawIds : []
            const next = []
            const seen = new Set()
            for (const id of input) {
                if (!catPersonnelIdSet.has(id) || seen.has(id)) continue
                next.push(id)
                seen.add(id)
            }
            next.sort(
                (a, b) =>
                    (catPersonnelOrderIndex.get(a) ?? 1e6) -
                    (catPersonnelOrderIndex.get(b) ?? 1e6)
            )
            return next
        },
        [catPersonnelIdSet, catPersonnelOrderIndex]
    )
    const headerCatIds = useMemo(() => {
        const ids = cleanCatalogueCatIds(headerCat?.cat_personnel_ids)
        if (ids.length > 0) return ids
        if (enabledCatPersonnel.length > 0) return enabledCatPersonnel.map((c) => c.id)
        return []
    }, [headerCat?.cat_personnel_ids, cleanCatalogueCatIds, enabledCatPersonnel])
    const headerCatMeta = useMemo(
        () => headerCatIds.map((id) => catPersonnelMap.get(id)).filter(Boolean),
        [headerCatIds, catPersonnelMap]
    )

    const categoriesForRisk = useMemo(() => {
        const target = catalogueRisk
        const allowedModules = new Set(modulesForRisk.map((m) => m.id))
        const map = new Map()
        for (const c of refCategories || []) {
            if (!allowedModules.has(c.ref_module_id)) continue
            if (normalizeRisk(c.risque) !== target) continue
            map.set(c.id, c)
        }
        for (const mod of modulesForRisk) {
            const virtual = buildVirtualCategory(mod)
            if (virtual && normalizeRisk(virtual.risque ?? mod.risque) === target) {
                map.set(virtual.id, virtual)
            }
        }
        return Array.from(map.values())
    }, [refCategories, modulesForRisk, catalogueRisk])

    const categoriesByModule = useMemo(() => {
        const by = new Map(modulesForRisk.map((m) => [m.id, []]))
        for (const c of categoriesForRisk) {
            if (!by.has(c.ref_module_id)) by.set(c.ref_module_id, [])
            by.get(c.ref_module_id).push(c)
        }
        for (const [, arr] of by) {
            arr.sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || a.code.localeCompare(b.code))
        }
        return by
    }, [categoriesForRisk, modulesForRisk])

    const categoryIdsForRisk = useMemo(() => new Set(categoriesForRisk.map((c) => c.id)), [categoriesForRisk])

    const actsForRisk = useMemo(() => {
        const target = catalogueRisk
        return (refActs || []).filter(
            (a) => categoryIdsForRisk.has(a.ref_categorie_id) && normalizeRisk(a.risque) === target
        )
    }, [refActs, categoryIdsForRisk, catalogueRisk])

    const actsByCategory = useMemo(() => {
        const by = new Map(Array.from(categoryIdsForRisk).map((id) => [id, []]))
        for (const act of actsForRisk) {
            const arr = by.get(act.ref_categorie_id)
            if (arr) arr.push(act)
        }
        for (const [, arr] of by) {
            arr.sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || a.code.localeCompare(b.code))
        }
        return by
    }, [actsForRisk, categoryIdsForRisk])

    const actMap = useMemo(() => new Map(actsForRisk.map((a) => [a.id, a])), [actsForRisk])

    const niveauSetsForCatalogue = useMemo(() => {
        const target = catalogueRisk
        const enabled = (refNiveauSets || [])
            .filter((s) => s && s.is_enabled !== false && normalizeRisk(s.risque) === target)
            .sort(
                (a, b) =>
                    (a.ordre ?? 0) - (b.ordre ?? 0) ||
                    (String(a.code || '').localeCompare(String(b.code || '')))
            )

        let list = enabled
        if (forcedSetId) {
            const forced = (refNiveauSets || []).find((s) => s.id === forcedSetId)
            if (forced) {
                list = [forced, ...list]
            }
        }

        const dedup = []
        const seen = new Set()
        for (const s of list) {
            if (!seen.has(s.id)) {
                seen.add(s.id)
                dedup.push(s)
            }
        }
        return dedup
    }, [refNiveauSets, catalogueRisk, forcedSetId])

    const allowedSetIds = useMemo(() => new Set(niveauSetsForCatalogue.map((s) => s.id)), [niveauSetsForCatalogue])

    const niveauxForCatalogue = useMemo(() => {
        if (!allowedSetIds.size) return []
        return (refNiveau || []).filter(
            (n) =>
                n &&
                n.is_enabled &&
                allowedSetIds.has(n.ref_set_id) &&
                normalizeRisk(n.risque) === catalogueRisk
        )
    }, [refNiveau, allowedSetIds, catalogueRisk])

    const firstEnabledSet = useMemo(
        () => niveauSetsForCatalogue[0] || null,
        [niveauSetsForCatalogue]
    )

    const defaultNiveauSetId = useMemo(() => {
        if (forcedSetId && allowedSetIds.has(forcedSetId)) return forcedSetId
        return firstEnabledSet?.id || null
    }, [forcedSetId, allowedSetIds, firstEnabledSet])

    const hasAvailableModules = modulesForRisk.length > 0
    const hasAvailableNiveaux = niveauSetsForCatalogue.length > 0 && niveauxForCatalogue.length > 0

    function getSetIdForModule(modId) {
        const row = (catModules || []).find(
            (cm) => cm.catalogue_id === catalogueId && cm.ref_module_id === modId
        )
        const candidate = row?.niveau_set_id || null
        if (candidate && allowedSetIds.has(candidate)) return candidate
        return defaultNiveauSetId
    }
    function setSetIdForModule(modId, setId) {
        if (!setId || !allowedSetIds.has(setId)) return
        setCatModules((prev) =>
            prev.map((cm) =>
                cm.catalogue_id === catalogueId && cm.ref_module_id === modId
                    ? {...cm, niveau_set_id: setId}
                    : cm
            )
        )
    }
    function getSurcoSetIdForModule(modId) {
        if (!allowMultipleNiveaux) return null
        const row = (catModules || []).find(
            (cm) => cm.catalogue_id === catalogueId && cm.ref_module_id === modId
        )
        const candidate = row?.niveau_set_id_surco || null
        if (candidate && allowedSetIds.has(candidate)) return candidate
        return null
    }
    function setSurcoSetIdForModule(modId, setIdOrNull) {
        if (!allowMultipleNiveaux) return
        if (setIdOrNull && !allowedSetIds.has(setIdOrNull)) return
        setCatModules((prev) =>
            prev.map((cm) =>
                cm.catalogue_id === catalogueId && cm.ref_module_id === modId
                    ? {...cm, niveau_set_id_surco: setIdOrNull || null}
                    : cm
            )
        )
    }

    function getOptionDepthForModule(modId) {
        const row = (catModules || []).find(
            (cm) => cm.catalogue_id === catalogueId && cm.ref_module_id === modId
        )
        const raw = Number(row?.option_depth)
        if (Number.isInteger(raw) && raw >= 0) return raw
        return null
    }
    function setOptionDepthForModule(modId, depth) {
        const safe = Math.max(0, Math.floor(Number(depth) || 0))
        setCatModules((prev) =>
            prev.map((cm) =>
                cm.catalogue_id === catalogueId && cm.ref_module_id === modId
                    ? {...cm, option_depth: safe}
                    : cm
            )
        )
    }

    // Stores groupements : objet stable pour éviter la réinit
    const storeRefs = useMemo(() => ({catalogueMap, moduleMap}), [catalogueMap, moduleMap])
    const {groupes} = useGroupStore(storeRefs)
    // Modules inclus
    const includedRows = useMemo(() => {
        if (!catalogueId) return []
        return (catModules || [])
            .filter((cm) => cm.catalogue_id === catalogueId && moduleMap.has(cm.ref_module_id))
            .sort(
                (a, b) =>
                    (a.ordre ?? 0) - (b.ordre ?? 0) ||
                    (moduleMap.get(a.ref_module_id)?.code || '').localeCompare(
                        moduleMap.get(b.ref_module_id)?.code || ''
                    )
            )
    }, [catModules, catalogueId, moduleMap])

    const selectedModuleIds = useMemo(
        () => new Set(includedRows.map((r) => r.ref_module_id)),
        [includedRows]
    )

    const includedModules = useMemo(
        () => includedRows.map((r) => moduleMap.get(r.ref_module_id)).filter(Boolean),
        [includedRows, moduleMap]
    )

    const groupsCountByModule = useMemo(() => {
        const map = new Map()
        for (const g of groupes) {
            if (g.catalogue_id !== catalogueId) continue
            if (!moduleMap.has(g.ref_module_id)) continue
            map.set(g.ref_module_id, 1 + (map.get(g.ref_module_id) || 0))
        }
        return map
    }, [groupes, catalogueId, moduleMap])

    // Tab actif
    const [activeModuleId, setActiveModuleId] = useState('')
    useEffect(() => {
        if (!catalogueId) return
        if (includedModules.length === 0) {
            setActiveModuleId('')
            return
        }
        if (!includedModules.find((m) => m.id === activeModuleId)) {
            setActiveModuleId(includedModules[0].id)
        }
    }, [catalogueId, includedModules, activeModuleId])

    // Toast
    const [toast, setToast] = useState(null)

    function showToast(type, msg) {
        setToast({type, msg})
        setTimeout(() => setToast(null), 2200)
    }

    // Helpers catModules
    function reindexCatModules(nextAll) {
        const [kept, rows] = nextAll.reduce(
            (acc, cm) => {
                if (cm.catalogue_id === catalogueId) acc[1].push(cm)
                else acc[0].push(cm)
                return acc
            },
            [[], []]
        )
        const filteredRows = rows.filter((cm) => moduleMap.has(cm.ref_module_id))
        const reindexed = filteredRows
            .slice()
            .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
            .map((r, i) => ({...r, ordre: i + 1}))
        return [...kept, ...reindexed]
    }

    function moveModule(modId, dir) {
        if (!catalogueId) return
        const idx = includedRows.findIndex((r) => r.ref_module_id === modId)
        const target = dir === 'up' ? idx - 1 : idx + 1
        if (idx < 0 || target < 0 || target >= includedRows.length) return
        const a = includedRows[idx], b = includedRows[target]
        setCatModules((prev) =>
            reindexCatModules(
                prev.map((cm) => {
                    if (cm.id === a.id) return {...cm, ordre: b.ordre}
                    if (cm.id === b.id) return {...cm, ordre: a.ordre}
                    return cm
                })
            )
        )
    }

    function nextOrdreForCatalogue() {
        return includedRows.length + 1
    }

    function toggleModule(modId) {
        if (!catalogueId) return
        const isSelected = selectedModuleIds.has(modId)
        if (isSelected) {
            const cnt = groupsCountByModule.get(modId) || 0
            if (cnt > 0 && !confirm(`Des groupes (${cnt}) existent sur ce module. Le masquer ?`)) return
            const next = (catModules || []).filter(
                (cm) => !(cm.catalogue_id === catalogueId && cm.ref_module_id === modId)
            )
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
                niveau_set_id: defaultNiveauSetId || null,
                niveau_set_id_surco: null,
                option_depth: null,
            }
            setCatModules(reindexCatModules([...(catModules || []), row]))
            if (!activeModuleId) setActiveModuleId(modId)
        }
    }

    function selectAllModules() {
        if (!catalogueId) return
        setCatModules((prev) => {
            const selected = new Set(
                prev.filter((x) => x.catalogue_id === catalogueId).map((x) => x.ref_module_id)
            )
            const adds = modulesForRisk
                .filter((m) => !selected.has(m.id))
                .map((m, i) => ({
                    id: uuid(),
                    catalogue_id: catalogueId,
                    ref_module_id: m.id,
                    code: m.code,
                    libelle: m.libelle || '',
                    ordre: selected.size + i + 1,
                    is_enabled: true,
                    niveau_set_id: defaultNiveauSetId || null,
                    niveau_set_id_surco: null,
                    option_depth: null,
                }))
            return reindexCatModules([...prev, ...adds])
        })
    }

    function clearAllModules() {
        if (!catalogueId) return
        const totalGroups = (groupes || []).filter((g) => g.catalogue_id === catalogueId).length
        if (
            totalGroups > 0 &&
            !confirm(
                `Ce catalogue contient ${totalGroups} groupe(s). Les modules seront masqués dans l'UI (données conservées). Continuer ?`
            )
        )
            return
        setCatModules((catModules || []).filter((cm) => cm.catalogue_id !== catalogueId))
        setActiveModuleId('')
    }

    useEffect(() => {
        console.log('storeRefs identity (should not change)', storeRefs)
    }, [storeRefs])

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
            <CatalogueHeader
                offer={headerOffer}
                catalogue={headerCat}
                catPersonnel={headerCatMeta}
                onBack={() => router.push('/catalogues')}
                onSwitchMode={() => router.push(`/catalogues/${catalogueId}/configurer`)}
                onVisualise={() => router.push(`/catalogues/${catalogueId}/visualiser`)}
            />

            {!hasAvailableModules && (
                <div className="alert alert-warning">
                    <span>Aucun module n’est disponible pour ce risque. Ajoutez-en dans le référentiel Modules en choisissant le risque « Prévoyance ».</span>
                </div>
            )}

            {!hasAvailableNiveaux && (
                <div className="alert alert-warning">
                    <span>Ce risque n’a pas encore de groupe de niveaux actif. Rendez-vous dans « Référentiel — Groupes de niveaux » et « Référentiel — Niveaux » pour en créer au moins un.</span>
                </div>
            )}

            <ModulesSelector
                modules={modulesForRisk}
                selectedSet={selectedModuleIds}
                groupsCountByModule={groupsCountByModule}
                onToggle={toggleModule}
                onSelectAll={selectAllModules}
                onClearAll={clearAllModules}
            />

            <ModuleOrderList
                includedRows={includedRows}
                moduleMap={moduleMap}
                groupsCountByModule={groupsCountByModule}
                onMove={moveModule}
            />

            <ModuleTabs
                modules={includedModules}
                activeId={activeModuleId}
                onChange={setActiveModuleId}
                renderPanel={(m) => (
                    <ModulePanelContainer
                        module={m}
                        catalogueId={catalogueId}
                        refNiveau={niveauxForCatalogue}
                        refNiveauSets={niveauSetsForCatalogue}
                        allowMultipleNiveaux={allowMultipleNiveaux}
                        selectedNiveauSetIdBase={getSetIdForModule(m.id)}
                        selectedNiveauSetIdSurco={allowMultipleNiveaux ? getSurcoSetIdForModule(m.id) : null}
                        onChangeNiveauSetBase={(setId) => setSetIdForModule(m.id, setId)}
                        onChangeNiveauSetSurco={(setIdOrNull) => setSurcoSetIdForModule(m.id, setIdOrNull)}  // null => suit Base
                        optionDepth={getOptionDepthForModule(m.id)}
                        onChangeOptionDepth={(depth) => setOptionDepthForModule(m.id, depth)}
                        categoriesByModule={categoriesByModule}
                        actsByCategory={actsByCategory}
                        actMap={actMap}
                        showToast={showToast}
                        refs={storeRefs}                  // <-- NEW OBJ à chaque render
                    />
                )}
            />

            <ToastInline toast={toast}/>
        </div>
    )
}
