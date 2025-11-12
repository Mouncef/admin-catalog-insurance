'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRefNiveau, useRefNiveauSets } from '@/providers/AppDataProvider'
import { sanitizeUpperKeep, normalizeRisk } from '@/lib/utils/StringUtil'
import { SquarePen, Trash2 } from "lucide-react";

const RISK_OPTIONS = [
    { value: 'sante', label: 'Santé' },
    { value: 'prevoyance', label: 'Prévoyance' },
]

/**
 * Référentiel GLOBAL des Niveaux
 * - Persistance: via provider useRefNiveau() → localStorage key: app:ref_niveau_v1
 * - Schéma (local): { id, code (≤20, unique, req), libelle, ordre, is_enabled }
 * - UI: DaisyUI (floating-label, modals, toasts)
 * - Règles: unicité du code (insensible à la casse), réindexation de l'ordre
 *
 * Emplacement suggéré: app/ref-niveaux/page.jsx
 */
export default function RefNiveauxPage() {
    const LS_LEVELS = 'app:ref_niveau_v1'
    const { refNiveau, setRefNiveau } = useRefNiveau()
    const { refNiveauSets } = useRefNiveauSets?.() || { refNiveauSets: [] } // safe if provider absent
    const [riskFilter, setRiskFilter] = useState('all')

    const [mounted, setMounted] = useState(false)
    const [query, setQuery] = useState('')
    const [sortAsc, setSortAsc] = useState(true)
    const [toast, setToast] = useState(null) // {type:'success'|'error'|'info', msg}
    const [selectedSetId, setSelectedSetId] = useState('') // '' = Tous, '__NOSET__' = Sans set

    // Pagination
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)



    const upsertDialogRef = useRef(null)
    const deleteDialogRef = useRef(null)
    const importInputRef = useRef(null)

    const [editing, setEditing] = useState(null)
    const [candidateDelete, setCandidateDelete] = useState(null)

    useEffect(() => { setMounted(true) }, [])

    // ===== Utils =====
    function uuid() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
        return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    }

    function showToast(type, msg) {
        setToast({ type, msg })
        setTimeout(() => setToast(null), 2500)
    }

    // Map des sets pour affichage (code/libellé) et filtres
    const setMap = useMemo(() => {
        const m = new Map()
        for (const s of refNiveauSets || []) m.set(s.id, s)
        return m
    }, [refNiveauSets])

    function sanitizeLevels(arr) {
        // nettoyage basique + on conserve ref_set_id
        const list = []
        const seen = new Set()
        for (const raw of arr || []) {
            if (!raw) continue
            let code = String(raw.code || '').trim()
            if (!code) continue
            const key = code.toLowerCase()
            if (seen.has(key)) continue
            seen.add(key)
            const refSetId = raw.ref_set_id ? String(raw.ref_set_id) : undefined
            const riskFromSet = refSetId ? setMap.get(refSetId)?.risque : undefined
            list.push({
                id: raw.id || uuid(),
                code,
                libelle: String(raw.libelle || '').trim(),
                ordre: Number.isFinite(Number(raw.ordre)) ? Number(raw.ordre) : undefined,
                is_enabled: typeof raw.is_enabled === 'boolean' ? raw.is_enabled : true,
                ref_set_id: refSetId,
                risque: normalizeRisk(raw.risque ?? riskFromSet),
            })
        }

        // ⬇️ groupage par set ('' = sans set)
        const groups = new Map()
        for (const item of list) {
            const k = item.ref_set_id ? String(item.ref_set_id) : ''
            if (!groups.has(k)) groups.set(k, [])
            groups.get(k).push(item)
        }

        // réindexation **dans chaque set**
        const out = []
        const sortedKeys = Array.from(groups.keys()).sort() // ordre des sets stable
        for (const k of sortedKeys) {
            const g = groups.get(k)
            g.sort((a, b) => (a.ordre ?? 1e9) - (b.ordre ?? 1e9) || a.code.localeCompare(b.code))
            g.forEach((x, i) => { x.ordre = i + 1; out.push(x) })
        }

        return out
    }

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        let base = [...refNiveau]

        // Tri: d’abord par set, puis ordre, puis code
        base.sort((a, b) => {
            const kA = a.ref_set_id || ''
            const kB = b.ref_set_id || ''
            const s = kA.localeCompare(kB)
            if (s !== 0) return s
            const cmp = ((a.ordre || 0) - (b.ordre || 0)) || a.code.localeCompare(b.code)
            return sortAsc ? cmp : -cmp
        })

        // Filtre set choisi
        if (selectedSetId) {
            if (selectedSetId === '__NOSET__') {
                base = base.filter(n => !n.ref_set_id)
            } else {
                base = base.filter(n => n.ref_set_id === selectedSetId)
            }
        }

        if (riskFilter !== 'all') {
            base = base.filter((n) => normalizeRisk(n.risque) === riskFilter)
        }

        // Filtre recherche
        if (!q) return base
        return base.filter((n) =>
            n.code.toLowerCase().includes(q) ||
            (n.libelle || '').toLowerCase().includes(q) ||
            (n.ref_set_id && String(n.ref_set_id).toLowerCase().includes(q))
        )
    }, [refNiveau, query, sortAsc, selectedSetId, riskFilter])

    // ======= Pagination dérivées =======
    const totalItems = filtered.length
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    const clamp = (p) => Math.max(1, Math.min(p, totalPages))
    const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
    const to = Math.min(totalItems, page * pageSize)
    const pageRows = filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)

    // Reset/clamp page quand filtres changent
    useEffect(() => { setPage(1) }, [query, sortAsc, selectedSetId])
    useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages, page])

    // ===== CRUD =====
    function openCreate() {
        const setId = selectedSetId && selectedSetId !== '__NOSET__' ? selectedSetId : undefined
        const riskFromSet = setId ? setMap.get(setId)?.risque : undefined
        const riskDefault = normalizeRisk(riskFromSet ?? (riskFilter !== 'all' ? riskFilter : 'sante'))
        setEditing({
            id: null,
            code: '',
            libelle: '',
            ref_set_id: setId,
            ordre: nextOrdreForSet(setId), // ⬅️ ordre par set (ou 1 si aucun)
            is_enabled: true,
            risque: riskDefault,
        })
        upsertDialogRef.current?.showModal()
    }

    function nextOrdre() {
        return (refNiveau.length || 0) + 1
    }

    function openEdit(row) {
        setEditing({ ...row, risque: normalizeRisk(row.risque ?? (row.ref_set_id ? setMap.get(row.ref_set_id)?.risque : undefined)) })
        upsertDialogRef.current?.showModal()
    }

    function submitUpsert(e) {
        e?.preventDefault?.()
        if (!editing) return

        const code = (editing.code || '').trim()
        if (!code) return showToast('error', 'Le code est requis')
        if (code.length > 20) return showToast('error', 'Code ≤ 20 caractères')

        const exists = refNiveau.find((n) => n.code.toLowerCase() === code.toLowerCase() && n.id !== editing.id)
        if (exists) return showToast('error', `Le code "${code}" existe déjà`)

        const libelle = (editing.libelle || '').trim()
        const ordre = Number.isFinite(Number(editing.ordre)) ? Number(editing.ordre) : nextOrdre()
        const is_enabled = !!editing.is_enabled
        const ref_set_id = editing?.ref_set_id ? String(editing.ref_set_id) : undefined
        const riskFromSet = ref_set_id ? setMap.get(ref_set_id)?.risque : undefined
        const risque = normalizeRisk(editing.risque ?? riskFromSet)

        if (!editing.id) {
            const created = { id: uuid(), code, libelle, ordre, is_enabled, ref_set_id, risque }
            setRefNiveau(sanitizeLevels([...refNiveau, created]))
            showToast('success', 'Niveau créé')
        } else {
            const nextArr = refNiveau.map((n) => (n.id === editing.id ? { ...n, code, libelle, ordre, is_enabled, ref_set_id, risque } : n))
            setRefNiveau(sanitizeLevels(nextArr))
            showToast('success', 'Niveau mis à jour')
        }

        upsertDialogRef.current?.close()
        setEditing(null)
    }

    function requestDelete(row) {
        setCandidateDelete(row)
        deleteDialogRef.current?.showModal()
    }

    function confirmDelete() {
        if (!candidateDelete) return
        setRefNiveau(sanitizeLevels(refNiveau.filter((n) => n.id !== candidateDelete.id)))
        showToast('success', 'Niveau supprimé')
        deleteDialogRef.current?.close()
        setCandidateDelete(null)
    }

    function cancelDelete() {
        deleteDialogRef.current?.close()
        setCandidateDelete(null)
    }

    /*function move(row, dir) {
        // Réordonne dans la liste complète, pas seulement le filtré
        const siblings = [...refNiveau].sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
        const ids = siblings.map((s) => s.id)
        const idx = ids.indexOf(row.id)
        if (idx < 0) return
        const targetIdx = dir === 'up' ? idx - 1 : idx + 1
        if (targetIdx < 0 || targetIdx >= ids.length) return

        const idA = ids[idx]
        const idB = ids[targetIdx]
        const next = [...refNiveau]
        const a = next.find((x) => x.id === idA)
        const b = next.find((x) => x.id === idB)
        if (!a || !b) return

        const tmp = a.ordre
        a.ordre = b.ordre
        b.ordre = tmp
        setRefNiveau(sanitizeLevels(next))
    }*/

    function toggleEnabled(row) {
        const next = refNiveau.map((n) => (n.id === row.id ? { ...n, is_enabled: !n.is_enabled } : n))
        setRefNiveau(sanitizeLevels(next))
    }

    // ===== Import / Export =====
    function exportJSON() {
        const data = JSON.stringify(refNiveau, null, 2)
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'ref_niveau.json'
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
                if (!Array.isArray(incoming)) throw new Error('JSON attendu: tableau de niveaux')
                const merged = mergeKeepingUniqueCode(refNiveau, incoming)
                setRefNiveau(sanitizeLevels(merged))
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

    function mergeKeepingUniqueCode(existing, incoming) {
        const keyOf = (n) => String(n.code || '').trim().toLowerCase()
        const map = new Map(existing.map((n) => [keyOf(n), n]))
        for (const raw of incoming) {
            if (!raw) continue
            const item = {
                id: raw.id || uuid(),
                code: String(raw.code || '').trim(),
                libelle: String(raw.libelle || '').trim(),
                ordre: Number.isFinite(Number(raw.ordre)) ? Number(raw.ordre) : undefined,
                is_enabled: typeof raw.is_enabled === 'boolean' ? raw.is_enabled : true,
                ref_set_id: raw.ref_set_id ? String(raw.ref_set_id) : undefined,
                risque: normalizeRisk(raw.risque),
            }
            if (!item.code) continue
            const prev = map.get(keyOf(item)) || {}
            const refSetId = item.ref_set_id ?? prev.ref_set_id
            const riskFromSet = refSetId ? setMap.get(refSetId)?.risque : undefined
            map.set(keyOf(item), {
                ...prev,
                ...item,
                ref_set_id: refSetId,
                risque: normalizeRisk(item.risque ?? prev.risque ?? riskFromSet),
            })
        }
        return Array.from(map.values())
    }

    function resetAll() {
        if (!confirm('Supprimer tous les niveaux du référentiel ?')) return
        setRefNiveau([])
        showToast('info', 'Référentiel vidé')
    }

    function nextOrdreForSet(setId) {
        // si pas de set sélectionné → ordre = 1
        if (!setId) return 1
        // max ordre dans CE set, puis +1
        let max = 0
        for (const n of refNiveau) {
            if (n.ref_set_id === setId) {
                const o = Number(n.ordre) || 0
                if (o > max) max = o
            }
        }
        return max + 1
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

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <h1 className="text-2xl font-bold">Référentiel — Niveaux</h1>
                <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={openCreate}>+ Nouveau niveau</button>
                    <div className="join">
                        <button className="btn join-item" onClick={exportJSON}>Export JSON</button>
                        <button className="btn join-item" onClick={triggerImport}>Import JSON</button>
                        <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={onImportFileChange} />
                    </div>
                    <button className="btn btn-ghost" onClick={resetAll}>Réinitialiser</button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-2">
                <label className="floating-label w-full lg:w-96">
                    <span>Rechercher</span>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        type="text"
                        className="input input-bordered w-full font-mono"
                    />
                </label>

                <label className="floating-label w-full lg:w-80">
                    <span>Filtrer par groupe de niveaux</span>
                    <select
                        className="select select-bordered w-full"
                        value={selectedSetId}
                        onChange={(e) => setSelectedSetId(e.target.value)}
                    >
                        <option value="">Tous les groupes</option>
                        <option value="__NOSET__">— Sans groupe</option>
                        {(refNiveauSets || []).map(s => (
                            <option key={s.id} value={s.id}>
                                {s.code || s.id}{s.libelle ? ` — ${s.libelle}` : ''}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="floating-label w-full lg:w-56">
                    <span>Filtrer par risque</span>
                    <select
                        className="select select-bordered w-full"
                        value={riskFilter}
                        onChange={(e) => { setRiskFilter(e.target.value); setPage(1) }}
                    >
                        <option value="all">Tous</option>
                        {RISK_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
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
                                <th style={{ width: 100 }}>Ordre</th>
                                <th style={{ width: 220 }}>Groupe de niveau</th>
                                <th style={{ width: 180 }}>Code</th>
                                <th>Libellé</th>
                                <th style={{ width: 140 }}>Risque</th>
                                <th style={{ width: 160 }}>Statut</th>
                                <th className="text-right" style={{ width: 220 }}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {pageRows.length === 0 && (
                                <tr>
                                    <td colSpan={7}>
                                        <div className="p-6 text-center opacity-70">Aucun niveau. Cliquez sur « Nouveau niveau » pour commencer.</div>
                                    </td>
                                </tr>
                            )}

                            {pageRows.map((n) => {
                                const setInfo = n.ref_set_id ? setMap.get(n.ref_set_id) : null
                                const setLabel = setInfo
                                    ? (setInfo.code || setInfo.id) + (setInfo.libelle ? ` — ${setInfo.libelle}` : '')
                                    : (n.ref_set_id || '—')

                                return (
                                <tr key={n.id}>
                                    <td>
                                        <div className="join">
                                            <button className="btn btn-xs join-item" onClick={() => move(n, 'up')} title="Monter">▲</button>
                                            <span className="join-item btn btn-xs btn-ghost">{n.ordre}</span>
                                            <button className="btn btn-xs join-item" onClick={() => move(n, 'down')} title="Descendre">▼</button>
                                        </div>
                                    </td>
                                    <td><div className="font-mono font-medium truncate" title={setLabel}>{setLabel}</div></td>
                                    <td><div className="font-mono font-medium">{n.code}</div></td>
                                    <td className="max-w-[520px]"><div className="truncate" title={n.libelle}>{n.libelle || <span className="opacity-50">—</span>}</div></td>
                                    <td>
                                        <span className="badge badge-outline">
                                            {normalizeRisk(n.risque) === 'prevoyance' ? 'Prévoyance' : 'Santé'}
                                        </span>
                                    </td>
                                    <td>
                                        <label className="label cursor-pointer gap-2 justify-start">
                                            <span className="label-text">{n.is_enabled ? 'Activé' : 'Désactivé'}</span>
                                            <input type="checkbox" className="toggle" checked={!!n.is_enabled} onChange={() => toggleEnabled(n)} />
                                        </label>
                                    </td>
                                    <td className="text-right">
                                        <div className="join justify-end">
                                            <button className="btn btn-sm join-item" onClick={() => openEdit(n)}>
                                                <SquarePen size={16} />
                                            </button>
                                            <button className="btn btn-sm btn-error join-item" onClick={() => requestDelete(n)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                            </tbody>
                        </table>
                        {/* Pagination footer */}
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
                <div className="modal-box w-11/12 max-w-3xl">
                    <h3 className="font-bold text-lg">{editing?.id ? 'Modifier un niveau' : 'Nouveau niveau'}</h3>
                    <fieldset className="fieldset bg-base-200 border-base-300 rounded-box border p-4">
                        <form className="mt-4 space-y-4" onSubmit={submitUpsert}>
                            <label className="floating-label block w-full">
                                <span>Ordre</span>
                                <input
                                    type="number"
                                    min={1}
                                    className="input input-bordered w-full"
                                    value={editing?.ordre ?? ''}
                                    onChange={(e) => setEditing((v) => ({ ...v, ordre: e.target.value === '' ? '' : Number(e.target.value) }))}
                                    placeholder="1"
                                />
                            </label>

                            <label className="floating-label block w-full">
                                <span>Libellé</span>
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    value={editing?.libelle ?? ''}
                                    onChange={(e) => setEditing((v) => ({ ...v, libelle: e.target.value }))} //, code: sanitizeUpperKeep(e.target.value)
                                />
                            </label>

                            <label className="floating-label block w-full">
                                <span>Groupe de niveau</span>
                                <select
                                    className="select select-bordered w-full"
                                    value={editing?.ref_set_id ?? ''}
                                    onChange={(e) => {
                                        const newSetId = e.target.value || undefined
                                        setEditing((v) => {
                                            const isNew = !v?.id // seulement pour un nouvel enregistrement
                                            const setRisk = newSetId ? setMap.get(newSetId)?.risque : undefined
                                            return {
                                                ...v,
                                                ref_set_id: newSetId,
                                                ordre: isNew ? nextOrdreForSet(newSetId) : v.ordre,
                                                risque: normalizeRisk(setRisk ?? v?.risque ?? 'sante'),
                                            }
                                        })
                                    }}
                                >
                                    <option value="">— Aucun</option>
                                    {(refNiveauSets || []).map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.code || s.id}{s.libelle ? ` — ${s.libelle}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="floating-label block w-full">
                                <span>Code <span className="text-error">*</span></span>
                                <input
                                    type="text"
                                    className="input input-bordered w-full font-mono"
                                    value={editing?.code ?? ''}
                                    onChange={(e) => setEditing((v) => ({ ...v, code: e.target.value }))}
                                    maxLength={20}
                                    required
                                />
                            </label>

                            <label className="floating-label block w-full">
                                <span>Risque <span className="text-error">*</span></span>
                                <select
                                    className="select select-bordered w-full"
                                    value={normalizeRisk(editing?.risque)}
                                    onChange={(e) => setEditing((v) => ({ ...v, risque: e.target.value }))}
                                    disabled={!!editing?.ref_set_id}
                                    required
                                >
                                    {RISK_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                {editing?.ref_set_id && (
                                    <p className="text-xs opacity-70 mt-1">Le risque provient du groupe de niveaux sélectionné.</p>
                                )}
                            </label>

                            <div className="block w-30">
                                <label className="label h-12 px-3 border border-base-300 rounded-box bg-base-100 flex justify-between items-center">
                                    <span className="label-text">Activer</span>
                                    <input
                                        type="checkbox"
                                        className="toggle"
                                        checked={!!editing?.is_enabled}
                                        onChange={(e) => setEditing((v) => ({ ...v, is_enabled: e.target.checked }))}
                                    />
                                </label>
                            </div>

                            <div className="modal-action mt-6">
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
                    <h3 className="font-bold text-lg">Supprimer le niveau ?</h3>
                    <p className="py-2">Cette action est irréversible.</p>
                    <div className="bg-base-200 rounded p-3 font-mono">
                        {candidateDelete ? (
                            <>
                                <div><span className="opacity-70">Code:</span> {candidateDelete.code}</div>
                                <div><span className="opacity-70">Libellé:</span> {candidateDelete.libelle || '—'}</div>
                                <div><span className="opacity-70">Groupe de niveau:</span> {candidateDelete.ref_set_id || '—'}</div>
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
                <span className="font-mono">localStorage</span> clé: <span className="font-mono">{LS_LEVELS}</span> (référentiel niveaux) — {refNiveau.length} niveaux
                {selectedSetId ? <> — filtre: <span className="font-mono">{selectedSetId === '__NOSET__' ? 'Sans set' : selectedSetId}</span></> : null}
            </div>
        </div>
    )
}
