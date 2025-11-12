'use client'

import {useEffect, useMemo, useState} from 'react'
import {useSearchParams, useRouter} from 'next/navigation'
import {
    useRefOffers, useRefCatalogues, useRefModules, useRefCategories,
    useRefActs, useRefNiveau, useRefNiveauSets, useCatModules
} from '@/providers/AppDataProvider'
import {useGroupStore, uuid} from '@/hooks/useGroupData'
import CatalogueHeader from '@/components/catalogues/CatalogueHeader'
import ModulesSelector from '@/components/catalogues/ModulesSelector'
import ModuleOrderList from '@/components/catalogues/ModuleOrderList'
import ModuleTabs from '@/components/catalogues/ModuleTabs'
import ToastInline from '@/components/common/ToastInline'
import ModulePanelContainer from '@/components/catalogues/ModulePanelContainer'

// 👉 place your current component code here
// Only change how you get catalogueId:
//   const catalogueId = String(searchParams.get('catalogueId') || initialCatalogueId || '')
//
// And remove any use of useParams().

export default function ClientInlinePage({ initialCatalogueId = '' }) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    const router = useRouter()
    const searchParams = useSearchParams()

    // ⚠️ on reste en statique: l’ID vient de la querystring, avec fallback depuis le wrapper server
    const catalogueId = String(searchParams.get('catalogueId') || initialCatalogueId || '')

// Référentiels
    const {refOffers} = useRefOffers()
    const {refCatalogues} = useRefCatalogues()
    const {refModules} = useRefModules()
    const {refCategories} = useRefCategories()
    const {refActs} = useRefActs()
    const {refNiveau} = useRefNiveau()
    const {refNiveauSets} = useRefNiveauSets()
    const {catModules, setCatModules} = useCatModules()

    // petit helper: premier set activé
    const firstEnabledSet = useMemo(
        () => (refNiveauSets || []).filter(s => s.is_enabled !== false).sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))[0] || null,
        [refNiveauSets]
    )

    function getSetIdForModule(modId) {
        const row = (catModules || []).find(cm => cm.catalogue_id === catalogueId && cm.ref_module_id === modId);
        return row?.niveau_set_id || firstEnabledSet?.id || null;
    }

    function setSetIdForModule(modId, setId) {
        setCatModules(prev => prev.map(cm =>
            (cm.catalogue_id === catalogueId && cm.ref_module_id === modId)
                ? {...cm, niveau_set_id: setId}
                : cm
        ));
    }

    // Maps
    const offerMap = useMemo(() => new Map(refOffers.map(o => [o.id, o])), [refOffers])
    const catalogueMap = useMemo(() => new Map(refCatalogues.map(c => [c.id, c])), [refCatalogues])
    const moduleMap = useMemo(() => new Map(refModules.map(m => [m.id, m])), [refModules])
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

    // Catégories/Actes indexés (tri référentiel)
    const categoriesByModule = useMemo(() => {
        const by = new Map()
        for (const c of refCategories) {
            if (!by.has(c.ref_module_id)) by.set(c.ref_module_id, [])
            by.get(c.ref_module_id).push(c)
        }
        for (const [, arr] of by)
            arr.sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || a.code.localeCompare(b.code))
        return by
    }, [refCategories])

    const actsByCategory = useMemo(() => {
        const by = new Map()
        for (const a of refActs) {
            if (!by.has(a.ref_categorie_id)) by.set(a.ref_categorie_id, [])
            by.get(a.ref_categorie_id).push(a)
        }
        for (const [, arr] of by)
            arr.sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || a.code.localeCompare(b.code))
        return by
    }, [refActs])

    const actMap = useMemo(() => new Map(refActs.map(a => [a.id, a])), [refActs])

    // Stores groupements : objet stable pour éviter la réinit
    const storeRefs = useMemo(() => ({catalogueMap, moduleMap}), [catalogueMap, moduleMap])
    const {groupes} = useGroupStore(storeRefs)
    // Modules inclus
    const includedRows = useMemo(() => {
        if (!catalogueId) return []
        return (catModules || [])
            .filter((cm) => cm.catalogue_id === catalogueId)
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
            map.set(g.ref_module_id, 1 + (map.get(g.ref_module_id) || 0))
        }
        return map
    }, [groupes, catalogueId])

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
        const reindexed = rows
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
                niveau_set_id: firstEnabledSet?.id || null,
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
            const adds = refModules
                .filter((m) => !selected.has(m.id))
                .map((m, i) => ({
                    id: uuid(),
                    catalogue_id: catalogueId,
                    ref_module_id: m.id,
                    code: m.code,
                    libelle: m.libelle || '',
                    ordre: selected.size + i + 1,
                    is_enabled: true,
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

    console.log(storeRefs)
    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-4">
            <CatalogueHeader
                offer={headerOffer}
                catalogue={headerCat}
                onBack={() => router.push('/catalogues')}
                onSwitchMode={() => router.push(`/catalogues/${catalogueId}/configurer`)}
            />

            <ModulesSelector
                modules={refModules}
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
                        refNiveau={refNiveau}
                        refNiveauSets={refNiveauSets}
                        selectedNiveauSetId={getSetIdForModule(m.id)}
                        onChangeNiveauSet={(setId) => setSetIdForModule(m.id, setId)}
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
