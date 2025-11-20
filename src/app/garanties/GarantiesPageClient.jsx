"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRefModules, useRefCategories, useRefActs } from '@/providers/AppDataProvider'
import { sanitizeUpperKeep, normalizeRisk } from '@/lib/utils/StringUtil'
import { SquarePen, Trash2, Info } from "lucide-react";
import { buildVirtualCategory, makeUngroupedCategoryId, isUngroupedCategoryId } from '@/lib/utils/categoryUtils'
import {useAuth, usePermissions} from '@/providers/AuthProvider';
import {applyCreateAudit, applyUpdateAudit, applyDeleteAudit, ensureAuditFields} from '@/lib/utils/audit';

/**
 * Page Next.js (JSX) — Référentiel des ACTES
 * Schéma: ref_acte { id, ref_categorie_id, code, libelle, allow_surco (bool), ordre }
 * Dépend des catégories (et donc modules).
 *
 * Persistance via AppDataProvider (localStorage sous-jacent):
 *   - Modules:      'app:ref_modules_v1'
 *   - Catégories:   'app:ref_categories_v1'
 *   - Actes:        'app:ref_acts_v1'
 *
 * Emplacement suggéré: app/acts/page.jsx
 */
export default function GarantiesPageClient() {
    const LS_MODS = 'app:ref_modules_v1'
    const LS_CATS = 'app:ref_categories_v1'
    const LS_ACTS = 'app:ref_acts_v1'

    const { refModules } = useRefModules()
    const { refCategories } = useRefCategories()
    const { refActs, setRefActs } = useRefActs()

    const [mounted, setMounted] = useState(false)
    const [moduleFilter, setModuleFilter] = useState('all') // 'all' | moduleId
    const [categoryFilter, setCategoryFilter] = useState('all') // 'all' | categoryId
    const [query, setQuery] = useState('')
    const [sortAsc, setSortAsc] = useState(true)
    const [riskFilter, setRiskFilter] = useState('all')
    const [toast, setToast] = useState(null) // {type:'success'|'error'|'info', msg}
    // Pagination
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    const RISK_OPTIONS = [
        { value: 'sante', label: 'Santé' },
        { value: 'prevoyance', label: 'Prévoyance' },
    ]

    const upsertDialogRef = useRef(null)
    const deleteDialogRef = useRef(null)
    const importInputRef = useRef(null)

    const [editing, setEditing] = useState(null) // acte en édition
    const [candidateDelete, setCandidateDelete] = useState(null)
    const {canCreate, canUpdate, canDelete} = usePermissions();
    const {user} = useAuth();
    const formDisabled = editing ? (editing.id ? !canUpdate : !canCreate) : false;

    useEffect(() => { setMounted(true) }, [])
    useEffect(() => {
        if (!mounted) return;
        const needsMigration = (refActs || []).some((act) => !act?.createdAt);
        if (needsMigration) {
            setRefActs(sanitizeActs(refActs || []));
        }
    }, [mounted, refActs, setRefActs, moduleMap, categoryMap])

    useEffect(() => {
        if (riskFilter === 'all') return
        if (moduleFilter === 'all') return
        const mod = moduleMap.get(moduleFilter)
        if (!mod || normalizeRisk(mod?.risque) !== riskFilter) {
            setModuleFilter('all')
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [riskFilter, moduleFilter])

    // ===== Utils =====
    function uuid() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
        return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    }

    function showToast(type, msg) {
        setToast({ type, msg })
        setTimeout(() => setToast(null), 2500)
    }

    const moduleMap = useMemo(() => new Map(refModules.map((m) => [m.id, m])), [refModules])
    const modulesForRisk = useMemo(() => {
        if (riskFilter === 'all') return refModules
        return refModules.filter((m) => normalizeRisk(m.risque) === riskFilter)
    }, [refModules, riskFilter])
    const baseCategoryMap = useMemo(() => new Map(refCategories.map((c) => [c.id, c])), [refCategories])
    const categoryMap = useMemo(() => {
        const map = new Map(baseCategoryMap)
        for (const mod of refModules) {
            const virtual = buildVirtualCategory(mod)
            if (virtual) {
                map.set(virtual.id, virtual)
            }
        }
        return map
    }, [baseCategoryMap, refModules])
    const categoriesByModule = useMemo(() => {
        const by = new Map()
        for (const mod of refModules) by.set(mod.id, [])
        for (const c of refCategories) {
            if (!by.has(c.ref_module_id)) by.set(c.ref_module_id, [])
            by.get(c.ref_module_id).push(c)
        }
        for (const mod of refModules) {
            const list = by.get(mod.id) || []
            list.sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || a.code.localeCompare(b.code))
            const virtual = buildVirtualCategory(mod)
            if (virtual && !list.some((c) => c.id === virtual.id)) {
                list.push(virtual)
            }
            by.set(mod.id, list)
        }
        return by
    }, [refCategories, refModules])

    // keeps code unique per category + reindex ordre per category
    function sanitizeActs(arr) {
        const byCat = new Map()
        for (const raw of arr || []) {
            if (!raw) continue
            const explicitModuleId = raw.ref_module_id && moduleMap.has(raw.ref_module_id) ? raw.ref_module_id : null
            const cat = raw.ref_categorie_id ? categoryMap.get(raw.ref_categorie_id) : null
            const moduleId = explicitModuleId || cat?.ref_module_id
            if (!moduleId || !moduleMap.has(moduleId)) continue
            const module = moduleMap.get(moduleId)
            const resolvedCategoryId = cat
                ? cat.id
                : makeUngroupedCategoryId(moduleId)
            const resolvedCategory = categoryMap.get(resolvedCategoryId) || buildVirtualCategory(module)
            const risque = normalizeRisk(raw.risque ?? resolvedCategory?.risque ?? module?.risque)
            const allowSurco = risque === 'prevoyance' ? false : (typeof raw.allow_surco === 'boolean' ? raw.allow_surco : true)
            const item = ensureAuditFields({
                id: raw.id || uuid(),
                ref_module_id: moduleId,
                ref_categorie_id: resolvedCategoryId,
                code: String(raw.code || '').trim(),
                libelle: String(raw.libelle || '').trim(),
                libelle_long: String(raw.libelle_long || '').trim(),
                allow_surco: allowSurco,
                ordre: Number.isFinite(Number(raw.ordre)) ? Number(raw.ordre) : undefined,
                risque,
                createdAt: raw.createdAt,
                createdBy: raw.createdBy,
                updatedAt: raw.updatedAt,
                updatedBy: raw.updatedBy,
                deletedAt: raw.deletedAt ?? null,
                deletedBy: raw.deletedBy ?? null,
            })
            if (!byCat.has(item.ref_categorie_id)) byCat.set(item.ref_categorie_id, [])
            byCat.get(item.ref_categorie_id).push(item)
        }

        const result = []
        for (const [catId, list] of byCat) {
            const seen = new Set()
            list.sort((a, b) => (a.ordre ?? 1e9) - (b.ordre ?? 1e9) || a.code.localeCompare(b.code))
            const cleaned = []
            for (const it of list) {
                if (!it.code) continue
                let code = it.code
                let k = code.toLowerCase()
                if (seen.has(k)) {
                    let n = 2
                    let cand = `${code}-${n}`
                    while (seen.has(cand.toLowerCase())) { n++; cand = `${code}-${n}` }
                    code = cand; k = code.toLowerCase()
                }
                seen.add(k)
                cleaned.push({ ...it, code })
            }
            cleaned.forEach((a, i) => result.push({ ...a, ordre: i + 1 }))
        }
        return result
    }

    function nextOrdreForCategory(catId) {
        if (!catId) return 1
        const count = actsRaw.filter((a) => a.ref_categorie_id === catId && !a.deletedAt).length
        return count + 1
    }

    // ===== Sélecteurs =====
    // Ajuster le filtre catégorie lorsqu'on change de module
    useEffect(() => {
        if (moduleFilter === 'all') {
            if (categoryFilter === 'all') return
            const cat = categoryMap.get(categoryFilter)
            const catRisk = normalizeRisk(cat?.risque ?? moduleMap.get(cat?.ref_module_id)?.risque)
            if (!cat || (riskFilter !== 'all' && catRisk !== riskFilter)) {
                setCategoryFilter('all')
            }
            return
        }
        const cats = (categoriesByModule.get(moduleFilter) || []).filter((c) => riskFilter === 'all' || normalizeRisk(c.risque ?? moduleMap.get(moduleFilter)?.risque) === riskFilter)
        if (cats.length === 0) setCategoryFilter('all')
        else if (categoryFilter !== 'all' && cats.every(c => c.id !== categoryFilter)) setCategoryFilter('all')
    }, [moduleFilter, categoriesByModule, categoryFilter, riskFilter, categoryMap, moduleMap])

    const actsRaw = useMemo(() => sanitizeActs(refActs || []), [refActs, moduleMap, categoryMap])
    const acts = useMemo(() => actsRaw.filter((a) => !a.deletedAt), [actsRaw])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()

        let base = acts
            .filter((a) => {
                const cat = categoryMap.get(a.ref_categorie_id || '')
                const moduleId = a.ref_module_id || cat?.ref_module_id
                if (!moduleId) return false
                if (moduleFilter !== 'all' && moduleId !== moduleFilter) return false
                if (categoryFilter !== 'all' && (a.ref_categorie_id || makeUngroupedCategoryId(moduleId)) !== categoryFilter) return false
                const risk = normalizeRisk(a.risque ?? cat?.risque ?? moduleMap.get(moduleId)?.risque)
                if (riskFilter !== 'all' && risk !== riskFilter) return false
                return true
            })
        // tri multi-niveaux
        base = base.sort((a, b) => {
            const ca = categoryMap.get(a.ref_categorie_id || '')
            const cb = categoryMap.get(b.ref_categorie_id || '')
            const ma = moduleMap.get(a.ref_module_id || ca?.ref_module_id)
            const mb = moduleMap.get(b.ref_module_id || cb?.ref_module_id)

            if (moduleFilter === 'all') {
                const sMod = (ma?.code || '').localeCompare(mb?.code || '')
                if (sMod !== 0) return sMod
            }
            if (categoryFilter === 'all') {
                const sCat = (ca?.ordre || 0) - (cb?.ordre || 0) || (ca?.code || '').localeCompare(cb?.code || '')
                if (sCat !== 0) return sCat
            }
            return (sortAsc ? 1 : -1) * ((a.ordre || 0) - (b.ordre || 0) || a.code.localeCompare(b.code))
        })

        if (!q) return base
        return base.filter((a) => (
            a.code.toLowerCase().includes(q) || (a.libelle || '').toLowerCase().includes(q)   || (a.libelle_long || '').toLowerCase().includes(q) // NEW
        ))
    }, [refActs, moduleFilter, categoryFilter, query, sortAsc, categoryMap, moduleMap, riskFilter])

    // ======= Pagination dérivées =======
    const totalItems = filtered.length
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    const clamp = (p) => Math.max(1, Math.min(p, totalPages))
    const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
    const to = Math.min(totalItems, page * pageSize)
    const pageRows = filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)

    // Reset/clamp page quand filtres changent
    useEffect(() => { setPage(1) }, [moduleFilter, categoryFilter, query, sortAsc, riskFilter])
    useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages, page])


    // ===== CRUD =====
    function openCreate() {
        if (!canCreate) {
            showToast('error', 'Création non autorisée pour votre rôle.')
            return
        }
        // Pré-sélection en fonction des filtres
        const availableModules = modulesForRisk.length ? modulesForRisk : refModules
        let defaultModuleId = moduleFilter !== 'all' ? moduleFilter : (availableModules[0]?.id || '')
        let defaultCategoryId = categoryFilter !== 'all' ? categoryFilter : ''
        if (!defaultCategoryId) {
            const cats = (categoriesByModule.get(defaultModuleId) || []).filter((c) => riskFilter === 'all' || normalizeRisk(c.risque ?? moduleMap.get(defaultModuleId)?.risque) === riskFilter)
            defaultCategoryId = cats[0]?.id || ''
        }
        const cat = categoryMap.get(defaultCategoryId)
        const mod = moduleMap.get(cat?.ref_module_id || defaultModuleId)
        const fallbackCategoryId = defaultCategoryId || makeUngroupedCategoryId(defaultModuleId)
        const risque = normalizeRisk(cat?.risque ?? mod?.risque)
        const allowSurco = risque !== 'prevoyance'
        setEditing({
            id: null,
            ref_module_id: defaultModuleId,
            ref_categorie_id: defaultCategoryId || fallbackCategoryId,
            code: '',
            libelle: '',
            allow_surco: allowSurco,
            ordre: nextOrdreForCategory(defaultCategoryId || fallbackCategoryId),
            risque,
        })
        upsertDialogRef.current?.showModal()
    }

    function openEdit(act) {
        if (!canUpdate) {
            showToast('error', 'Modification non autorisée pour votre rôle.')
            return
        }
        const cat = categoryMap.get(act.ref_categorie_id || '')
        const moduleId = act.ref_module_id || cat?.ref_module_id
        const mod = moduleMap.get(moduleId || '')
        const risque = normalizeRisk(act.risque ?? cat?.risque ?? mod?.risque)
        setEditing({ ...act, ref_module_id: moduleId, risque, allow_surco: risque === 'prevoyance' ? false : act.allow_surco })
        upsertDialogRef.current?.showModal()
    }

    function submitUpsert(e) {
        e?.preventDefault?.()
        if (!editing) return
        const creating = !editing.id
        if (creating && !canCreate) {
            showToast('error', 'Création non autorisée pour votre rôle.')
            return
        }
        if (!creating && !canUpdate) {
            showToast('error', 'Modification non autorisée pour votre rôle.')
            return
        }

        const moduleId = editing.ref_module_id || categoryMap.get(editing.ref_categorie_id || '')?.ref_module_id
        if (!moduleId) return showToast('error', 'Module requis')
        const ref_categorie_id = editing.ref_categorie_id || makeUngroupedCategoryId(moduleId)
        const cat = categoryMap.get(ref_categorie_id) || buildVirtualCategory(moduleMap.get(moduleId))
        if (!cat) return showToast('error', 'Catégorie invalide')

        const code = (editing.code || '').trim()
        if (!code) return showToast('error', 'Le code est requis')
        if (code.length > 80) return showToast('error', 'Code ≤ 80 caractères')

        const existsSameCode = acts.some((a) =>
            a.ref_categorie_id === ref_categorie_id && a.code.toLowerCase() === code.toLowerCase() && a.id !== editing.id
        )
        if (existsSameCode) return showToast('error', `Le code "${code}" existe déjà dans cette catégorie`)

        const libelle = (editing.libelle || '').trim()
        const libelle_long = (editing.libelle_long || '').trim() // NEW
        const risque = normalizeRisk(editing.risque ?? cat?.risque ?? moduleMap.get(moduleId)?.risque)
        const allow_surco = risque === 'prevoyance' ? false : Boolean(editing.allow_surco)
        const ordre = Number.isFinite(Number(editing.ordre)) ? Number(editing.ordre) : nextOrdreForCategory(ref_categorie_id)

        if (!editing.id) {
            const created = applyCreateAudit({
                id: uuid(),
                ref_module_id: moduleId,
                ref_categorie_id,
                code,
                libelle,
                libelle_long,
                allow_surco,
                ordre,
                risque,
                deletedAt: null,
                deletedBy: null,
            }, user)
            const next = sanitizeActs([...actsRaw, created])
            setRefActs(next)
            showToast('success', 'Acte créé')
        } else {
            const nextArr = actsRaw.map((a) =>
                a.id === editing.id ? applyUpdateAudit({ ...a, ref_module_id: moduleId, ref_categorie_id, code, libelle, libelle_long, allow_surco, ordre, risque }, user) : a
            )
            const next = sanitizeActs(nextArr)
            setRefActs(next)
            showToast('success', 'Acte mis à jour')
        }

        upsertDialogRef.current?.close()
        setEditing(null)
    }

    function requestDelete(act) {
        if (!canDelete) {
            showToast('error', 'Suppression non autorisée pour votre rôle.')
            return
        }
        setCandidateDelete(act)
        deleteDialogRef.current?.showModal()
    }

    function confirmDelete() {
        if (!candidateDelete) return
        if (!canDelete) {
            showToast('error', 'Suppression non autorisée pour votre rôle.')
            return
        }
        const nextRaw = (actsRaw || []).map((a) =>
            a.id === candidateDelete.id ? applyDeleteAudit(a, user) : a
        )
        setRefActs(sanitizeActs(nextRaw))
        showToast('success', 'Acte supprimé')
        deleteDialogRef.current?.close()
        setCandidateDelete(null)
    }

    function cancelDelete() {
        deleteDialogRef.current?.close()
        setCandidateDelete(null)
    }

    function move(act, dir) {
        if (!canUpdate) {
            showToast('error', 'Modification non autorisée pour votre rôle.')
            return
        }
        // Réordonne uniquement à l'intérieur de la même catégorie
        const currentCat = act.ref_categorie_id
        const siblings = filtered.filter((a) => a.ref_categorie_id === currentCat).sort((a, b) => a.ordre - b.ordre)
        const ids = siblings.map((s) => s.id)
        const idx = ids.indexOf(act.id)
        if (idx < 0) return
        const targetIdx = dir === 'up' ? idx - 1 : idx + 1
        if (targetIdx < 0 || targetIdx >= ids.length) return

        const idA = ids[idx]
        const idB = ids[targetIdx]
        const a = actsRaw.find((x) => x.id === idA)
        const b = actsRaw.find((x) => x.id === idB)
        if (!a || !b) return
        if (a.ref_categorie_id !== b.ref_categorie_id) return

        const next = (actsRaw || []).map((entry) => {
            if (entry.id === a.id) return applyUpdateAudit({ ...entry, ordre: b.ordre }, user)
            if (entry.id === b.id) return applyUpdateAudit({ ...entry, ordre: a.ordre }, user)
            return entry
        })
        setRefActs(sanitizeActs(next))
    }

    // ===== Import/Export (optionnels) =====
    function exportJSON() {
        const data = JSON.stringify(refActs, null, 2)
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'ref_acts.json'
        a.click()
        URL.revokeObjectURL(url)
    }

    function triggerImport() {
        if (!canUpdate) {
            showToast('error', 'Import non autorisé pour votre rôle.')
            return
        }
        importInputRef.current?.click()
    }

    function onImportFileChange(e) {
        if (!canUpdate) {
            showToast('error', 'Import non autorisé pour votre rôle.')
            return
        }
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
            try {
                const incoming = JSON.parse(String(reader.result))
                if (!Array.isArray(incoming)) throw new Error('JSON attendu: tableau d\'actes')
                const merged = mergeKeepingUniquePerCategory(refActs, incoming)
                setRefActs(sanitizeActs(merged))
                showToast('success', 'Import réussi')
            } catch (err) {
                console.error(err)
                showToast('error', 'Import invalide: ' + (err?.message || 'erreur inconnue'))
            } finally {
                e.target.value = ''
            }
        }
        reader.readAsText(file)
    }

    function mergeKeepingUniquePerCategory(existing, incoming) {
        // key = catId::codeLower
        const keyOf = (a) => `${a.ref_categorie_id || ''}::${String(a.code || '').trim().toLowerCase()}`
        const map = new Map((existing || []).map((a) => [keyOf(a), ensureAuditFields(a)]))
        for (const raw of incoming || []) {
            if (!raw) continue
            const item = {
                id: raw.id || uuid(),
                ref_module_id: raw.ref_module_id,
                ref_categorie_id: raw.ref_categorie_id,
                code: String(raw.code || '').trim(),
                libelle: String(raw.libelle || '').trim(),
                libelle_long: String(raw.libelle_long || '').trim(), // NEW
                allow_surco: typeof raw.allow_surco === 'boolean' ? raw.allow_surco : true,
                ordre: Number.isFinite(Number(raw.ordre)) ? Number(raw.ordre) : undefined,
                risque: normalizeRisk(raw.risque),
                createdAt: raw.createdAt,
                createdBy: raw.createdBy,
                updatedAt: raw.updatedAt,
                updatedBy: raw.updatedBy,
                deletedAt: raw.deletedAt ?? null,
                deletedBy: raw.deletedBy ?? null,
            }
            if (!item.ref_categorie_id || !categoryMap.has(item.ref_categorie_id) || !item.code) continue
            const prev = map.get(keyOf(item))
            const merged = ensureAuditFields({
                ...prev,
                ...item,
                createdAt: item.createdAt || prev?.createdAt,
                createdBy: item.createdBy || prev?.createdBy,
                updatedAt: item.updatedAt || prev?.updatedAt,
                updatedBy: item.updatedBy || prev?.updatedBy,
                deletedAt: item.deletedAt ?? prev?.deletedAt ?? null,
                deletedBy: item.deletedBy ?? prev?.deletedBy ?? null,
            })
            map.set(keyOf(item), merged)
        }
        return Array.from(map.values())
    }

    function resetAll() {
        if (!canDelete) {
            showToast('error', 'Suppression non autorisée pour votre rôle.')
            return
        }
        if (!confirm('Supprimer tous les actes stockés ?')) return
        const next = (actsRaw || []).map((act) => act.deletedAt ? act : applyDeleteAudit(act, user))
        setRefActs(sanitizeActs(next))
        showToast('info', 'Liste vidée')
    }

    // Catégories visibles en fonction du filtre module
    const allCategoriesWithVirtual = useMemo(() => {
        const acc = []
        for (const mod of refModules) {
            const list = categoriesByModule.get(mod.id) || []
            acc.push(...list)
        }
        return acc
    }, [categoriesByModule, refModules])

    const visibleCategories = ((moduleFilter === 'all'
        ? allCategoriesWithVirtual
        : (categoriesByModule.get(moduleFilter) || [])
    ).filter((c) => riskFilter === 'all' || normalizeRisk(c.risque ?? moduleMap.get(c.ref_module_id)?.risque) === riskFilter)).sort((a, b) => {
        const ma = moduleMap.get(a.ref_module_id)
        const mb = moduleMap.get(b.ref_module_id)
        const modCompare = (ma?.code || ma?.libelle || '').localeCompare(mb?.code || mb?.libelle || '')
        if (moduleFilter === 'all' && modCompare !== 0) return modCompare
        const orderCompare = (a.ordre || 0) - (b.ordre || 0)
        if (orderCompare !== 0) return orderCompare
        return getCategoryLabel(a).localeCompare(getCategoryLabel(b))
    })

    const editingCategory = editing ? categoryMap.get(editing.ref_categorie_id || '') : null
    const editingModuleId = editing?.ref_module_id || editingCategory?.ref_module_id || (moduleFilter !== 'all' ? moduleFilter : (modulesForRisk[0]?.id || ''))
    const editingModule = moduleMap.get(editingModuleId)
    const categoriesForEditingModule = (categoriesByModule.get(editingModuleId) || []).filter((c) => riskFilter === 'all' || normalizeRisk(c.risque ?? editingModule?.risque) === riskFilter)
    const editingRisk = editing ? normalizeRisk(editing.risque ?? editingModule?.risque) : 'sante'
    const getCategoryLabel = (cat) => {
        if (!cat) return '—'
        if (cat.isVirtual || isUngroupedCategoryId(cat.id)) {
            const mod = moduleMap.get(cat.ref_module_id)
            const suffix = mod ? ` (${mod.libelle || mod.code || ''})` : ''
            return `Sans groupe${suffix}`
        }
        return cat.libelle || cat.code || '—'
    }

    if (!mounted) {
        return (
            <div className="p-6">
                <div className="skeleton h-8 w-64 mb-4"></div>
                <div className="skeleton h-5 w-96 mb-2"></div>
                <div className="skeleton h-5 w-80"></div>
            </div>
        )
    }

    if (refModules.length === 0) {
        return (
            <div className="p-6">
                <div className="alert alert-warning max-w-2xl">
                    <span>Aucun module trouvé. Crée d'abord des modules (<span className="font-mono">{LS_MODS}</span>), puis des catégories (<span className="font-mono">{LS_CATS}</span>), avant d'ajouter des actes.</span>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <h1 className="text-2xl font-bold">Référentiel — Garanties</h1>
                <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={openCreate} disabled={!canCreate}>+ Nouvelle garantie</button>
                    <div className="join">
                        {/* <button className="btn join-item" onClick={exportJSON}>Export JSON</button> */}
                        {/* <button className="btn join-item" onClick={triggerImport} disabled={!canUpdate}>Import JSON</button> */}
                        {/* <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={onImportFileChange} /> */}
                    </div>
                    <button className="btn btn-ghost" onClick={resetAll} disabled={!canDelete}>Réinitialiser</button>
                </div>
            </div>
            {refCategories.length === 0 && (
                <div className="alert alert-info">
                    <span>Aucun groupe de garanties n'est défini. Tu peux tout de même créer des garanties « Sans groupe » puis les rattacher plus tard.</span>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-col xl:flex-row xl:items-center gap-2">
                <label className="floating-label w-full sm:w-64">
                    <span>Filtrer par module</span>
                    <select className="select select-bordered" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
                        <option value="all">Tous les modules</option>
                        {(modulesForRisk.length ? modulesForRisk : refModules).map((m) => (
                            <option key={m.id} value={m.id}>{m.libelle || m.code || '—'}</option>
                        ))}
                    </select>
                </label>

                <label className="floating-label w-full sm:w-56">
                    <span>Filtrer par risque</span>
                    <select className="select select-bordered" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
                        <option value="all">Tous</option>
                        {RISK_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </label>

                <label className="floating-label w-full sm:w-72">
                    <span>Filtrer par groupe de garanties</span>
                    <select className="select select-bordered" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                        <option value="all">Tout les groupes</option>
                        {visibleCategories.map((c) => (
                            <option key={c.id} value={c.id}>{getCategoryLabel(c)}</option>
                        ))}
                    </select>
                </label>

                <label className="floating-label w-full xl:w-96 xl:ml-2">
                    <span>Rechercher</span>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        type="text"
                        className="input input-bordered w-full font-mono"
                    />
                </label>

                <div className="xl:ml-auto flex items-center gap-2">
                    <span className="text-sm opacity-70">Tri par ordre</span>
                    <input type="checkbox" className="toggle" checked={sortAsc} onChange={() => setSortAsc((v) => !v)} />
                </div>
            </div>

            {/* Content */}
            <div className="card bg-base-100 shadow-md">
                <div className="card-body p-0">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead>
                            <tr>
                                <th style={{ width: 250 }}>Module</th>
                                <th style={{ width: 200 }}>Groupe de garantie</th>
                                <th style={{ width: 90 }}>Ordre</th>
                                <th>Code</th>
                                <th>Libellé</th>
                                <th className="hidden xl:table-cell">Libellé long</th>
                                <th style={{ width: 130 }}>Risque</th>
                                <th style={{ width: 110 }}>Surco ?</th>
                                <th className="text-right" style={{ width: 220 }}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {pageRows.length === 0 && (
                                <tr>
                                    <td colSpan={9}>
                                        <div className="p-6 text-center opacity-70">Aucune garantie. Cliquez sur « Nouvelle garantie » pour commencer.</div>
                                    </td>
                                </tr>
                            )}
                            {pageRows.map((a) => {
                                const cat = categoryMap.get(a.ref_categorie_id || '')
                                const mod = moduleMap.get(a.ref_module_id || cat?.ref_module_id)
                                const risk = normalizeRisk(a.risque ?? cat?.risque ?? mod?.risque)
                                const allowSurcoValue = risk !== 'prevoyance' && a.allow_surco
                                return (
                                    <tr key={a.id + "-" + a.ref_categorie_id}>
                                        <td>
                                            <div className="badge badge-outline">{mod ? (mod.libelle || mod.code || '—') : '—'}</div>
                                        </td>
                                        <td>
                                            <div className="badge badge-ghost">{getCategoryLabel(cat)}</div>
                                        </td>
                                        <td>
                                            <div className="join">
                                                <button className="btn btn-xs join-item" onClick={() => move(a, 'up')} title="Monter" disabled={!canUpdate}>▲</button>
                                                <span className="join-item btn btn-xs btn-ghost">{a.ordre}</span>
                                                <button className="btn btn-xs join-item" onClick={() => move(a, 'down')} title="Descendre" disabled={!canUpdate}>▼</button>
                                            </div>
                                        </td>
                                        <td><div className="font-mono font-medium">{a.code}</div></td>
                                        <td className="max-w-[520px]"><div className="truncate" title={a.libelle}>{a.libelle || <span className="opacity-50">—</span>}</div></td>
                                        <td className="hidden xl:table-cell max-w-[520px]">
                                            {
                                                a.libelle_long !== "" ?
                                                    (<div className="tooltip" data-tip={a.libelle_long}>
                                                        <div className="badge badge-soft badge-info">
                                                            <Info size={16} />
                                                        </div>
                                                    </div>)
                                                    :
                                                    (<span className="opacity-50">—</span>)
                                            }

                                        </td>
                                        <td>
                                            <span className="badge badge-outline">
                                                {risk === 'prevoyance' ? 'Prévoyance' : 'Santé'}
                                            </span>
                                        </td>
                                        <td>
                                            {risk === 'prevoyance' ? (
                                                <span className="badge">N/A</span>
                                            ) : allowSurcoValue ? (
                                                <span className="badge badge-success">Oui</span>
                                            ) : (
                                                <span className="badge">Non</span>
                                            )}
                                        </td>
                                        <td className="text-right">
                                            <div className="join justify-end">
                                                <button className="btn btn-sm join-item" onClick={() => openEdit(a)} disabled={!canUpdate}>
                                                    <SquarePen size={16} />
                                                </button>
                                                {canDelete && (
                                                    <button className="btn btn-sm btn-error join-item" onClick={() => requestDelete(a)}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            </tbody>
                        </table>
                        <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                            <div className="text-sm opacity-80">
                                {totalItems === 0
                                    ? 'Aucun résultat'
                                    : <>Affichage <span className="font-mono">{from}</span>–<span className="font-mono">{to}</span> sur <span className="font-mono">{totalItems}</span></>}
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2">
                                    <span className="text-sm opacity-80">Lignes / page</span>
                                    <select
                                        className="select select-bordered select-sm"
                                        value={pageSize}
                                        onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
                                    >
                                        {[5, 10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </label>
                                <div className="join">
                                    <button className="btn btn-sm join-item" onClick={() => setPage(1)} disabled={page <= 1}>«</button>
                                    <button className="btn btn-sm join-item" onClick={() => setPage(clamp(page - 1))} disabled={page <= 1}>‹</button>
                                    <span className="join-item btn btn-sm btn-ghost">Page {page} / {totalPages}</span>
                                    <button className="btn btn-sm join-item" onClick={() => setPage(clamp(page + 1))} disabled={page >= totalPages}>›</button>
                                    <button className="btn btn-sm join-item" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>»</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dialog: Create/Update */}
            <dialog ref={upsertDialogRef} className="modal">
                <div className="modal-box w-11/12 max-w-4xl">
                    <h3 className="font-bold text-lg">{editing?.id ? 'Modifier une garantie' : 'Nouvelle garantie'}</h3>
                    <fieldset className="fieldset bg-base-200 border-base-300 rounded-box border p-4" disabled={formDisabled}>
                        <form className="mt-4" onSubmit={submitUpsert}>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">

                                {/* Row 1 */}
                                <label className="floating-label md:col-span-4">
                                    <span>Module <span className="text-error">*</span></span>
                                    <select
                                        className="select select-bordered w-full"
                                        value={editingModuleId || ''}
                                        onChange={(e) => {
                                            const newModId = e.target.value
                                            const cats = (categoriesByModule.get(newModId) || []).filter((c) => riskFilter === 'all' || normalizeRisk(c.risque ?? moduleMap.get(newModId)?.risque) === riskFilter)
                                            const newCatId = cats[0]?.id || ''
                                            const fallbackCatId = newCatId || makeUngroupedCategoryId(newModId)
                                            const mod = moduleMap.get(newModId)
                                            setEditing((v) => ({
                                                ...v,
                                                ref_module_id: newModId,
                                                ref_categorie_id: fallbackCatId,
                                                ordre: nextOrdreForCategory(fallbackCatId),
                                                risque: normalizeRisk(mod?.risque),
                                            }))
                                        }}
                                        required
                                    >
                                        <option value="" disabled>Choisir un module…</option>
                                        {(modulesForRisk.length ? modulesForRisk : refModules).map((m) => (
                                            <option key={m.id} value={m.id}>{m.code} — {m.libelle || '—'}</option>
                                        ))}
                                    </select>
                                </label>

                                <label className="floating-label md:col-span-4">
                                    <span>Risque</span>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        value={editingRisk === 'prevoyance' ? 'Prévoyance' : 'Santé'}
                                        readOnly
                                        disabled
                                    />
                                </label>

                                <label className="floating-label md:col-span-4">
                                    <span>Catégorie <span className="text-error">*</span></span>
                                    <select
                                        className="select select-bordered w-full"
                                        value={editing?.ref_categorie_id ?? ''}
                                        onChange={(e) => {
                                            const newCatId = e.target.value
                                            const cat = categoryMap.get(newCatId)
                                            const mod = moduleMap.get(cat?.ref_module_id)
                                            setEditing((v) => ({
                                                ...v,
                                                ref_module_id: cat?.ref_module_id || v?.ref_module_id,
                                                ref_categorie_id: newCatId,
                                                ordre: nextOrdreForCategory(newCatId),
                                                risque: normalizeRisk(cat?.risque ?? mod?.risque),
                                            }))
                                        }}
                                        required
                                    >
                                        {categoriesForEditingModule.map((c) => (
                                            <option key={c.id} value={c.id}>{getCategoryLabel(c)}</option>
                                        ))}
                                    </select>
                                </label>

                                {/* Row 2 */}
                                <label className="floating-label md:col-span-8">
                                    <span>Libellé</span>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        value={editing?.libelle ?? ''}
                                        onChange={(e) =>
                                            setEditing((v) => ({ ...v, libelle: e.target.value })) //, code: sanitizeUpperKeep(e.target.value)
                                        }
                                    />
                                </label>

                                <label className="floating-label md:col-span-12"> {/* NEW */}
                                    <span>Libellé long</span>
                                    <textarea
                                        className="textarea textarea-bordered w-full min-h-24"
                                        value={editing?.libelle_long ?? ''}
                                        onChange={(e) => setEditing((v) => ({ ...v, libelle_long: e.target.value }))}
                                        maxLength={2000}
                                    />
                                </label>

                                <label className="floating-label md:col-span-4">
                                    <span>Ordre</span>
                                    <input
                                        type="number"
                                        min={1}
                                        className="input input-bordered w-full"
                                        value={editing?.ordre ?? ''}
                                        onChange={(e) =>
                                            setEditing((v) => ({ ...v, ordre: e.target.value === '' ? '' : Number(e.target.value) }))
                                        }
                                        placeholder="1"
                                    />
                                </label>

                                {/* Row 3 */}
                                <label className="floating-label md:col-span-8">
                                    <span>Code <span className="text-error">*</span></span>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full font-mono"
                                        value={editing?.code ?? ''}
                                        onChange={(e) => setEditing((v) => ({ ...v, code: e.target.value }))}
                                        placeholder="EX: DETARTRAGE, COURONNE_CM…"
                                        maxLength={80}
                                        required
                                    />
                                </label>

                                <div className="md:col-span-4">
                                    {/* Toggle compact, aligné à droite */}
                                    <label className="label h-12 px-3 border border-base-300 rounded-box bg-base-100 flex justify-between items-center">
                                        <span className="label-text">Autoriser surcomplémentaire</span>
                                        <input
                                            type="checkbox"
                                            className="toggle"
                                            checked={editingRisk === 'prevoyance' ? false : !!editing?.allow_surco}
                                            disabled={editingRisk === 'prevoyance' || !canUpdate}
                                            onChange={(e) => setEditing((v) => ({ ...v, allow_surco: e.target.checked }))}
                                        />
                                    </label>
                                    {editingRisk === 'prevoyance' && (
                                        <p className="text-xs opacity-70 mt-1">Les garanties prévoyance n’acceptent pas de surcomplémentaire.</p>
                                    )}
                                </div>

                            </div>

                            <div className="modal-action mt-6">
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => { upsertDialogRef.current?.close(); setEditing(null) }}
                                >
                                    Annuler
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={formDisabled}>Enregistrer</button>
                            </div>
                        </form>
                    </fieldset>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>

            {/* Dialog: Delete confirm */}
            <dialog ref={deleteDialogRef} className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Supprimer la garantie ?</h3>
                    <p className="py-2">Cette action est irréversible.</p>
                    <div className="bg-base-200 rounded p-3 font-mono">
                        {candidateDelete ? (
                            <>
                                <div><span className="opacity-70">Groupe de garantie:</span> {categoryMap.get(candidateDelete.ref_categorie_id)?.code || '—'}</div>
                                <div><span className="opacity-70">Code:</span> {candidateDelete.code}</div>
                                <div><span className="opacity-70">Libellé:</span> {candidateDelete.libelle || '—'}</div>
                            </>
                        ) : '—'}
                    </div>
                    <div className="modal-action">
                        <button className="btn" onClick={cancelDelete}>Annuler</button>
                        <button className="btn btn-error" onClick={confirmDelete} disabled={!canDelete}>Supprimer</button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>

            {/* Toast */}
            {toast && (
                <div className="toast">
                    <div className={`alert ${toast.type === 'success' ? 'alert-success' : toast.type === 'error' ? 'alert-error' : 'alert-info'}`}>
                        <span>{toast.msg}</span>
                    </div>
                </div>
            )}

            {/* Footer helper */}
            <div className="opacity-60 text-xs">
                <span className="font-mono">localStorage</span> clés: <span className="font-mono">{LS_MODS}</span> (modules), <span className="font-mono">{LS_CATS}</span> (catégories), <span className="font-mono">{LS_ACTS}</span> (actes) — {refActs.length} actes
            </div>
        </div>
    )
}
