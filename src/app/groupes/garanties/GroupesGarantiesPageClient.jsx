"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRefModules, useRefCategories } from '@/providers/AppDataProvider'
import { sanitizeUpperKeep, normalizeRisk } from "@/lib/utils/StringUtil"
import { SquarePen, Trash2 } from "lucide-react"

export default function GroupesGarantiesPageClient() {
    const RISK_OPTIONS = [
        { value: 'sante', label: 'Santé' },
        { value: 'prevoyance', label: 'Prévoyance' },
    ]
    const LS_MODS = 'app:ref_modules_v1'
    const LS_CATS = 'app:ref_categories_v1'

    // données depuis le provider (persisté en localStorage)
    const { refModules } = useRefModules()
    const { refCategories, setRefCategories } = useRefCategories()

    const [mounted, setMounted] = useState(false)
    const [moduleFilter, setModuleFilter] = useState('all') // 'all' | moduleId
    const [riskFilter, setRiskFilter] = useState('all')
    const [query, setQuery] = useState('')
    const [sortAsc, setSortAsc] = useState(true)
    const [toast, setToast] = useState(null) // {type:'success'|'error'|'info', msg:string}

    // Pagination
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    const upsertDialogRef = useRef(null)
    const deleteDialogRef = useRef(null)
    const importInputRef = useRef(null)

    const [editing, setEditing] = useState(null)
    const [candidateDelete, setCandidateDelete] = useState(null)

    useEffect(() => { setMounted(true) }, [])

    function uuid() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
        return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    }

    function showToast(type, msg) {
        setToast({ type, msg })
        setTimeout(() => setToast(null), 2500)
    }

    function sanitizeModules(arr) {
        return (arr || [])
            .filter(Boolean)
            .map((m, i) => ({
                id: m.id || uuid(),
                code: String(m.code || '').trim(),
                libelle: String(m.libelle || '').trim(),
                ordre: Number.isFinite(Number(m.ordre)) ? Number(m.ordre) : i + 1,
                risque: normalizeRisk(m.risque),
            }))
            .sort((a, b) => a.ordre - b.ordre || a.code.localeCompare(b.code))
            .map((m, idx) => ({ ...m, ordre: idx + 1 }))
    }

    function sanitizeCategories(arr, mods) {
        const modSet = new Set((mods || []).map((m) => m.id))
        const moduleRiskMap = new Map((mods || []).map((m) => [m.id, normalizeRisk(m.risque)]))
        // group by module to reindex ordre par module
        const byMod = new Map()
        for (const raw of arr || []) {
            if (!raw) continue
            const item = {
                id: raw.id || uuid(),
                ref_module_id: raw.ref_module_id,
                code: String(raw.code || '').trim(),
                libelle: String(raw.libelle || '').trim(),
                ordre: Number.isFinite(Number(raw.ordre)) ? Number(raw.ordre) : undefined,
                risque: normalizeRisk(raw.risque ?? moduleRiskMap.get(raw.ref_module_id)),
            }
            if (!item.ref_module_id || !modSet.has(item.ref_module_id)) continue // ignorer catégories orphelines
            if (!byMod.has(item.ref_module_id)) byMod.set(item.ref_module_id, [])
            byMod.get(item.ref_module_id).push(item)
        }
        const result = []
        for (const [modId, list] of byMod) {
            // unicité code (insensible à la casse) à l'intérieur d'un module
            const seen = new Set()
            // tri initial
            list.sort((a, b) => (a.ordre ?? 1e9) - (b.ordre ?? 1e9) || a.code.localeCompare(b.code))
            const cleaned = []
            for (const it of list) {
                let code = it.code
                if (!code) continue
                let k = code.toLowerCase()
                if (seen.has(k)) {
                    let n = 2
                    let candidate = `${code}-${n}`
                    while (seen.has(candidate.toLowerCase())) { n++; candidate = `${code}-${n}` }
                    code = candidate; k = code.toLowerCase()
                }
                seen.add(k)
                cleaned.push({ ...it, code })
            }
            // réindex par module
            cleaned.forEach((c, i) => result.push({ ...c, ordre: i + 1 }))
        }
        return result
    }

    const modulesNormalized = useMemo(() => sanitizeModules(refModules || []), [refModules])
    const moduleMap = useMemo(() => new Map(modulesNormalized.map((m) => [m.id, m])), [modulesNormalized])
    const modulesForRisk = useMemo(() => {
        if (riskFilter === 'all') return modulesNormalized
        return modulesNormalized.filter((m) => normalizeRisk(m.risque) === riskFilter)
    }, [modulesNormalized, riskFilter])

    useEffect(() => {
        if (riskFilter === 'all') return
        if (moduleFilter === 'all') return
        const mod = moduleMap.get(moduleFilter)
        if (!mod || normalizeRisk(mod?.risque) !== riskFilter) {
            setModuleFilter('all')
        }
    }, [riskFilter, moduleFilter, moduleMap])

    const editingRisk = editing ? normalizeRisk(editing.risque ?? moduleMap.get(editing.ref_module_id)?.risque) : 'sante'

    // ======= Sélecteurs =======
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        let base = refCategories.filter((c) => moduleFilter === 'all' ? true : c.ref_module_id === moduleFilter)
        if (riskFilter !== 'all') {
            base = base.filter((c) => normalizeRisk(c.risque ?? moduleMap.get(c.ref_module_id)?.risque) === riskFilter)
        }
        // trier par (module code, ordre) pour "all", sinon juste ordre
        base = base.sort((a, b) => {
            if (moduleFilter === 'all') {
                const ma = moduleMap.get(a.ref_module_id)?.code || ''
                const mb = moduleMap.get(b.ref_module_id)?.code || ''
                const s = ma.localeCompare(mb)
                if (s !== 0) return s
            }
            return (sortAsc ? 1 : -1) * (a.ordre - b.ordre || a.code.localeCompare(b.code))
        })
        if (!q) return base
        return base.filter(
            (c) => c.code.toLowerCase().includes(q) || (c.libelle || '').toLowerCase().includes(q)
        )
    }, [refCategories, moduleFilter, query, sortAsc, moduleMap, riskFilter])

    // ======= Pagination dérivées =======
    const totalItems = filtered.length
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    const clamp = (p) => Math.max(1, Math.min(p, totalPages))
    const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
    const to = Math.min(totalItems, page * pageSize)
    const pageRows = filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)

    // Reset/clamp page quand filtres changent
    useEffect(() => { setPage(1) }, [moduleFilter, query, sortAsc, riskFilter])
    useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages, page])

    // ======= CRUD =======
    function openCreate() {
        const availableModules = modulesForRisk.length ? modulesForRisk : modulesNormalized
        const defaultModuleId = moduleFilter !== 'all' ? moduleFilter : (availableModules[0]?.id || '')
        const moduleRow = moduleMap.get(defaultModuleId)
        const risque = normalizeRisk(moduleRow?.risque)
        setEditing({
            id: null,
            ref_module_id: defaultModuleId,
            code: '',
            libelle: '',
            ordre: nextOrdreForModule(defaultModuleId),
            risque,
        })
        upsertDialogRef.current?.showModal()
    }

    function nextOrdreForModule(modId) {
        if (!modId) return 1
        const count = refCategories.filter((c) => c.ref_module_id === modId).length
        return count + 1
    }

    function openEdit(cat) {
        const mod = moduleMap.get(cat.ref_module_id)
        const risque = normalizeRisk(cat.risque ?? mod?.risque)
        setEditing({ ...cat, risque })
        upsertDialogRef.current?.showModal()
    }

    function submitUpsert(e) {
        e?.preventDefault?.()
        if (!editing) return
        const ref_module_id = String(editing.ref_module_id || '')
        if (!ref_module_id || !moduleMap.has(ref_module_id)) return showToast('error', 'Module requis')

        const code = (editing.code || '').trim()
        if (!code) return showToast('error', 'Le code est requis')
        if (code.length > 60) return showToast('error', 'Code ≤ 60 caractères')

        const existsSameCode = refCategories.find((c) =>
            c.ref_module_id === ref_module_id && c.code.toLowerCase() === code.toLowerCase() && c.id !== editing.id
        )
        if (existsSameCode) return showToast('error', `Le code "${code}" existe déjà dans ce module`)

        const libelle = (editing.libelle || '').trim()
        const ordre = Number.isFinite(Number(editing.ordre)) ? Number(editing.ordre) : nextOrdreForModule(ref_module_id)
        const moduleRow = moduleMap.get(ref_module_id)
        const risque = normalizeRisk(editing.risque ?? moduleRow?.risque)

        if (!editing.id) {
            const created = { id: uuid(), ref_module_id, code, libelle, ordre, risque }
            const next = sanitizeCategories([...refCategories, created], modulesNormalized)
            setRefCategories(next)
            showToast('success', 'Catégorie créée')
        } else {
            const nextArr = refCategories.map((c) => (c.id === editing.id ? { ...c, ref_module_id, code, libelle, ordre, risque } : c))
            const next = sanitizeCategories(nextArr, modulesNormalized)
            setRefCategories(next)
            showToast('success', 'Catégorie mise à jour')
        }
        upsertDialogRef.current?.close()
        setEditing(null)
    }

    function requestDelete(cat) {
        setCandidateDelete(cat)
        deleteDialogRef.current?.showModal()
    }

    function confirmDelete() {
        if (!candidateDelete) return
        const next = sanitizeCategories(refCategories.filter((c) => c.id !== candidateDelete.id), modulesNormalized)
        setRefCategories(next)
        showToast('success', 'Catégorie supprimée')
        deleteDialogRef.current?.close()
        setCandidateDelete(null)
    }

    function cancelDelete() {
        deleteDialogRef.current?.close()
        setCandidateDelete(null)
    }

    // Réordonne **dans le module**, pas limité à la page courante
    function move(cat, dir) {
        const currentMod = cat.ref_module_id
        const siblings = refCategories
            .filter((c) => c.ref_module_id === currentMod)
            .sort((a, b) => a.ordre - b.ordre || a.code.localeCompare(b.code))
        const ids = siblings.map((c) => c.id)
        const idx = ids.indexOf(cat.id)
        if (idx < 0) return
        const targetIdx = dir === 'up' ? idx - 1 : idx + 1
        if (targetIdx < 0 || targetIdx >= ids.length) return

        const idA = ids[idx]
        const idB = ids[targetIdx]
        const next = [...refCategories]
        const a = next.find((c) => c.id === idA)
        const b = next.find((c) => c.id === idB)
        if (!a || !b) return

        const tmp = a.ordre
        a.ordre = b.ordre
        b.ordre = tmp
        setRefCategories(sanitizeCategories(next, modulesNormalized))
    }

    // ======= Import/Export (optionnels) =======
    function exportJSON() {
        const data = JSON.stringify(refCategories, null, 2)
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'ref_categories.json'
        a.click()
        URL.revokeObjectURL(url)
    }

    function triggerImport() { importInputRef.current?.click() }

    function onImportFileChange(e) {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
            try {
                const incoming = JSON.parse(String(reader.result))
                if (!Array.isArray(incoming)) throw new Error('JSON attendu: tableau de catégories')
                const merged = mergeKeepingUniquePerModule(refCategories, incoming)
                setRefCategories(sanitizeCategories(merged, modulesNormalized))
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

    function mergeKeepingUniquePerModule(existing, incoming) {
        // clé = moduleId::codeLower
        const keyOf = (c) => `${c.ref_module_id || ''}::${String(c.code || '').trim().toLowerCase()}`
        const map = new Map(existing.map((c) => [keyOf(c), c]))
        for (const raw of incoming) {
            if (!raw) continue
            const item = {
                id: raw.id || uuid(),
                ref_module_id: raw.ref_module_id,
                code: String(raw.code || '').trim(),
                libelle: String(raw.libelle || '').trim(),
                ordre: Number.isFinite(Number(raw.ordre)) ? Number(raw.ordre) : undefined,
            }
            if (!item.ref_module_id || !moduleMap.has(item.ref_module_id) || !item.code) continue
            map.set(keyOf(item), { ...map.get(keyOf(item)), ...item })
        }
        return Array.from(map.values())
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

    // Si pas de modules => invite à en créer
    if (refModules.length === 0) {
        return (
            <div className="p-6">
                <div className="alert alert-warning max-w-2xl">
                    <span>Aucun module trouvé. Crée d'abord des modules (clé <span className="font-mono">{LS_MODS}</span>) avant d'ajouter des catégories.</span>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <h1 className="text-2xl font-bold">Référentiel — Groupes de garanties</h1>
                <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={openCreate}>+ Nouveau groupe de garanties</button>
                    <div className="join">
                        {/* <button className="btn join-item" onClick={exportJSON}>Export JSON</button>
            <button className="btn join-item" onClick={triggerImport}>Import JSON</button>
            <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={onImportFileChange} /> */}
                    </div>
                    <button className="btn btn-ghost" onClick={() => { setRefCategories([]); showToast('info', 'Référentiel vidé') }}>Réinitialiser</button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-2">
                <label className="floating-label w-full lg:w-64">
                    <span>Filtrer par module</span>
                    <select className="select select-bordered" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
                        <option value="all">Tous les modules</option>
                        {(modulesForRisk.length ? modulesForRisk : modulesNormalized).map((m) => (
                            <option key={m.id} value={m.id}>{m.code} — {m.libelle || '—'}</option>
                        ))}
                    </select>
                </label>
                <label className="floating-label w-full lg:w-48">
                    <span>Filtrer par risque</span>
                    <select className="select select-bordered" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
                        <option value="all">Tous</option>
                        {RISK_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </label>
                <label className="floating-label w-full lg:w-96 lg:ml-2">
                    <span>Rechercher</span>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        type="text"
                        className="input input-bordered w-full font-mono"
                    />
                </label>
                <div className="lg:ml-auto flex items-center gap-2">
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
                                <th style={{ width: 160 }}>Module</th>
                                <th style={{ width: 120 }}>Risque</th>
                                <th style={{ width: 100 }}>Ordre</th>
                                <th>Code</th>
                                <th>Libellé</th>
                                <th className="text-right" style={{ width: 220 }}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {pageRows.length === 0 && (
                                <tr>
                                    <td colSpan={6}>
                                        <div className="p-6 text-center opacity-70">Aucune catégorie. Cliquez sur « Nouvelle catégorie » pour commencer.</div>
                                    </td>
                                </tr>
                            )}
                            {pageRows.map((c) => {
                                const mod = moduleMap.get(c.ref_module_id)
                                const riskLabel = normalizeRisk(c.risque ?? mod?.risque) === 'prevoyance' ? 'Prévoyance' : 'Santé'
                                return (
                                    <tr key={c.id}>
                                        <td>
                                            <div className="badge badge-outline">
                                                {mod ? (mod.code || '—') : '—'}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge badge-soft">
                                                {riskLabel}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="join">
                                                <button
                                                    className="btn btn-xs join-item"
                                                    onClick={() => move(c, 'up')}
                                                    title="Monter"
                                                >▲</button>
                                                <span className="join-item btn btn-xs btn-ghost">{c.ordre}</span>
                                                <button
                                                    className="btn btn-xs join-item"
                                                    onClick={() => move(c, 'down')}
                                                    title="Descendre"
                                                >▼</button>
                                            </div>
                                        </td>
                                        <td><div className="font-mono font-medium">{c.code}</div></td>
                                        <td className="max-w-[520px]"><div className="truncate" title={c.libelle}>{c.libelle || <span className="opacity-50">—</span>}</div></td>
                                        <td className="text-right">
                                            <div className="join justify-end">
                                                <button className="btn btn-sm join-item" onClick={() => openEdit(c)}>
                                                    <SquarePen size={16} />
                                                </button>
                                                <button className="btn btn-sm btn-error join-item" onClick={() => requestDelete(c)}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination footer */}
                    <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                        <div className="text-sm opacity-80">
                            {totalItems === 0 ? 'Aucun résultat' : <>Affichage <span className="font-mono">{from}</span>–<span className="font-mono">{to}</span> sur <span className="font-mono">{totalItems}</span></>}
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

            {/* Dialog: Create/Update */}
            <dialog ref={upsertDialogRef} className="modal">
                <div className="modal-box w-11/12 max-w-3xl">
                    <h3 className="font-bold text-lg">{editing?.id ? 'Modifier un groupe de garanties' : 'Nouveau groupe de garanties'}</h3>
                    <fieldset className="fieldset bg-base-200 border-base-300 rounded-box border p-4">
                        <form className="mt-4 space-y-4" onSubmit={submitUpsert}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <label className="floating-label">
                                    <span className="label-text">Module <span className="text-error">*</span></span>
                                    <select
                                        className="select select-bordered"
                                        value={editing?.ref_module_id ?? ''}
                                        onChange={(e) => {
                                            const newModuleId = e.target.value
                                            const mod = moduleMap.get(newModuleId)
                                            setEditing((v) => ({
                                                ...v,
                                                ref_module_id: newModuleId,
                                                ordre: nextOrdreForModule(newModuleId),
                                                risque: normalizeRisk(mod?.risque),
                                            }))
                                        }}
                                        required
                                    >
                                        <option value="" disabled>Choisir un module…</option>
                                        {(modulesForRisk.length ? modulesForRisk : modulesNormalized).map((m) => (
                                            <option key={m.id} value={m.id}>{m.code} — {m.libelle || '—'}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="floating-label">
                                    <span className="label-text">Risque</span>
                                    <input
                                        type="text"
                                        className="input input-bordered"
                                        value={editingRisk === 'prevoyance' ? 'Prévoyance' : 'Santé'}
                                        readOnly
                                        disabled
                                    />
                                </label>
                                <label className="floating-label">
                                    <span className="label-text">Ordre</span>
                                    <input
                                        type="number"
                                        min={1}
                                        value={editing?.ordre ?? ''}
                                        onChange={(e) => setEditing((v) => ({ ...v, ordre: e.target.value === '' ? '' : Number(e.target.value) }))}
                                        className="input input-bordered"
                                        placeholder="1"
                                    />
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <label className="floating-label">
                                    <span className="label-text">Libellé</span>
                                    <input
                                        type="text"
                                        value={editing?.libelle ?? ''}
                                        onChange={(e) => setEditing((v) => ({
                                            ...v,
                                            libelle: e.target.value,

                                        }))} //code: sanitizeUpperKeep(e.target.value),s
                                        className="input input-bordered"
                                    />
                                </label>
                                <label className="floating-label">
                                    <span className="label-text">Code <span className="text-error">*</span></span>
                                    <input
                                        type="text"
                                        value={editing?.code ?? ''}
                                        onChange={(e) => setEditing((v) => ({ ...v, code: e.target.value }))}
                                        className="input input-bordered font-mono"
                                        required
                                    />
                                </label>
                            </div>

                            <div className="modal-action">
                                <button type="button" className="btn btn-ghost" onClick={() => { upsertDialogRef.current?.close(); setEditing(null) }}>Annuler</button>
                                <button type="submit" className="btn btn-primary">Enregistrer</button>
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
                    <h3 className="font-bold text-lg">Supprimer le groupe de garanties ?</h3>
                    <p className="py-2">Cette action est irréversible.</p>
                    <div className="bg-base-200 rounded p-3 font-mono">
                        {candidateDelete ? (
                            <>
                                <div><span className="opacity-70">Module:</span> {moduleMap.get(candidateDelete.ref_module_id)?.code || '—'}</div>
                                <div><span className="opacity-70">Code:</span> {candidateDelete.code}</div>
                                <div><span className="opacity-70">Libellé:</span> {candidateDelete.libelle || '—'}</div>
                            </>
                        ) : '—'}
                    </div>
                    <div className="modal-action">
                        <button className="btn" onClick={cancelDelete}>Annuler</button>
                        <button className="btn btn-error" onClick={confirmDelete}>Supprimer</button>
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
                <span className="font-mono">localStorage</span> clés: <span className="font-mono">{LS_MODS}</span> (modules), <span className="font-mono">{LS_CATS}</span> (catégories) — {refCategories.length} catégories
            </div>
        </div>
    )
}
