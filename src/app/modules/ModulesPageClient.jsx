"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRefModules } from '@/providers/AppDataProvider'
import { sanitizeUpperKeep, normalizeRisk } from "@/lib/utils/StringUtil"
import { SquarePen, Trash2 } from "lucide-react"
import {usePermissions, useAuth} from '@/providers/AuthProvider';
import {applyCreateAudit, applyUpdateAudit, applyDeleteAudit, ensureAuditFields} from '@/lib/utils/audit';

const RISK_OPTIONS = [
    { value: 'sante', label: 'Santé' },
    { value: 'prevoyance', label: 'Prévoyance' },
]

export default function ModulesPageClient() {
    const LS_KEY = 'app:ref_modules_v1'

    // données depuis le provider (persisté en localStorage)
    const { refModules, setRefModules } = useRefModules()

    const [mounted, setMounted] = useState(false)
    const [query, setQuery] = useState('')
    const [riskFilter, setRiskFilter] = useState('all')
    const [sortAsc, setSortAsc] = useState(true)
    const [toast, setToast] = useState(null) // {type:'success'|'error'|'info', msg:string}
    // Pagination
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    const upsertDialogRef = useRef(null)
    const deleteDialogRef = useRef(null)
    const importInputRef = useRef(null)

    const [editing, setEditing] = useState(null) // module en édition
    const [candidateDelete, setCandidateDelete] = useState(null)
    const {canCreate, canUpdate, canDelete} = usePermissions();
    const {user} = useAuth();
    const formDisabled = editing ? (editing.id ? !canUpdate : !canCreate) : false;

    useEffect(() => { setMounted(true) }, [])

    // ======= Utils =======
    function uuid() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
        return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    }

    function sanitizeModules(arr) {
        return (arr ?? [])
            .filter(Boolean)
            .map((m) => ({
                ...m,
                id: m.id || uuid(),
                code: (m.code || '').trim(),
                libelle: (m.libelle || '').trim(),
                risque: normalizeRisk(m.risque),
                createdAt: m.createdAt,
                createdBy: m.createdBy,
                updatedAt: m.updatedAt,
                updatedBy: m.updatedBy,
                deletedAt: m.deletedAt ?? null,
                deletedBy: m.deletedBy ?? null,
            }))
            .filter((m) => !!m.code)
    }

    function showToast(type, msg) {
        setToast({ type, msg })
        setTimeout(() => setToast(null), 2500)
    }

    // ======= Sélecteurs/mémos =======
    const modulesRaw = useMemo(() => sanitizeModules(refModules || []), [refModules])
    const modules = useMemo(() => modulesRaw.filter((m) => !m.deletedAt), [modulesRaw])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        let base = [...modules].sort((a, b) =>
            (sortAsc ? 1 : -1) * a.code.localeCompare(b.code)
        )
        if (riskFilter !== 'all') {
            base = base.filter((m) => normalizeRisk(m.risque) === riskFilter)
        }
        if (!q) return base
        return base.filter(
            (m) => m.code.toLowerCase().includes(q) || (m.libelle || '').toLowerCase().includes(q)
        )
    }, [modules, query, sortAsc, riskFilter])

    // ======= Pagination dérivées =======
    const totalItems = filtered.length
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    const clamp = (p) => Math.max(1, Math.min(p, totalPages))
    const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
    const to = Math.min(totalItems, page * pageSize)
    const pageRows = filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)

    // Reset/clamp page quand filtres changent
    useEffect(() => { setPage(1) }, [query, sortAsc, riskFilter])
    useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages, page])
    useEffect(() => {
        if (!mounted) return;
        const needsMigration = (refModules || []).some((m) => !m.createdAt);
        if (needsMigration) {
            setRefModules((prev) => (prev || []).map((m) => ensureAuditFields(m)));
        }
    }, [mounted, refModules, setRefModules])

    // ======= CRUD =======
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

        const code = (editing.code || '').trim()
        if (!code) return showToast('error', 'Le code est requis')
        if (code.length > 40) return showToast('error', 'Code ≤ 40 caractères')

        const duplicate = modulesRaw.some(
            (m) => !m.deletedAt && m.code.toLowerCase() === code.toLowerCase() && m.id !== editing.id
        )
        if (duplicate) return showToast('error', `Le code "${code}" existe déjà`)

        const libelle = (editing.libelle || '').trim()
        const risque = normalizeRisk(editing.risque)

        if (!editing.id) {
            const created = applyCreateAudit({ id: uuid(), code, libelle, risque, deletedAt: null, deletedBy: null }, user)
            const next = sanitizeModules([...modulesRaw, created])
            setRefModules(next)
            showToast('success', 'Module créé')
        } else {
            const next = sanitizeModules(
                modulesRaw.map((m) => (m.id === editing.id ? applyUpdateAudit({ ...m, code, libelle, risque }, user) : m))
            )
            setRefModules(next)
            showToast('success', 'Module mis à jour')
        }

        upsertDialogRef.current?.close()
        setEditing(null)
    }

    function requestDelete(mod) {
        if (!canDelete) {
            showToast('error', 'Suppression non autorisée pour votre rôle.')
            return
        }
        setCandidateDelete(mod)
        deleteDialogRef.current?.showModal()
    }

    function confirmDelete() {
        if (!candidateDelete) return
        if (!canDelete) {
            showToast('error', 'Suppression non autorisée pour votre rôle.')
            return
        }
        const next = sanitizeModules(
            modulesRaw.map((m) => (m.id === candidateDelete.id ? applyDeleteAudit(m, user) : m))
        )
        setRefModules(next)
        showToast('success', 'Module supprimé')
        deleteDialogRef.current?.close()
        setCandidateDelete(null)
    }

    function cancelDelete() {
        deleteDialogRef.current?.close()
        setCandidateDelete(null)
    }

    // ======= Import/Export =======
    function exportJSON() {
        const data = JSON.stringify(modulesRaw, null, 2)
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'ref_modules.json'
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
                const parsed = JSON.parse(String(reader.result))
                if (!Array.isArray(parsed)) throw new Error('JSON attendu: tableau de modules')
                const merged = mergeKeepingUniqueCodes(modulesRaw, parsed)
                setRefModules(sanitizeModules(merged))
                showToast('success', 'Import réussi')
            } catch (err) {
                console.error(err)
                showToast('error', 'Import invalide: ' + (err?.message || 'erreur inconnue'))
            } finally {
                e.target.value = '' // reset input
            }
        }
        reader.readAsText(file)
    }

    function mergeKeepingUniqueCodes(existing, incoming) {
        // merge par code (case-insensitive), ignore "ordre"
        const byCode = new Map((existing || []).map((m) => [String(m.code || '').toLowerCase(), m]))
        for (const raw of incoming) {
            if (!raw) continue
            const item = {
                id: raw.id || uuid(),
                code: String(raw.code || '').trim(),
                libelle: String(raw.libelle || '').trim(),
                risque: normalizeRisk(raw.risque),
                createdAt: raw.createdAt,
                createdBy: raw.createdBy,
                updatedAt: raw.updatedAt,
                updatedBy: raw.updatedBy,
                deletedAt: raw.deletedAt ?? null,
                deletedBy: raw.deletedBy ?? null,
            }
            if (!item.code) continue
            const k = item.code.toLowerCase()
            const existing = byCode.get(k) || {}
            const merged = ensureAuditFields({ ...existing, ...item })
            merged.risque = normalizeRisk(item.risque ?? existing.risque)
            byCode.set(k, merged)
        }
        return Array.from(byCode.values())
    }

    function resetAll() {
        if (!canDelete) {
            showToast('error', 'Suppression non autorisée pour votre rôle.')
            return
        }
        if (!confirm('Supprimer tous les modules stockés ?')) return
        setRefModules((prev) => sanitizeModules((prev || []).map((m) => applyDeleteAudit(m, user))))
        showToast('info', 'Référentiel vidé')
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

    // ======= UI =======
    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-4">
            {/* Header actions */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-xl font-semibold">Référentiel — Modules</div>
                <div className="flex gap-2">
                    {/* <button className="btn btn-outline" onClick={exportJSON}>Exporter JSON</button>
          <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={onImportFileChange}/>
          <button className="btn btn-outline" onClick={triggerImport}>Importer JSON</button> */}
                    <button className="btn btn-error btn-outline" onClick={resetAll} disabled={!canDelete}>Vider</button>
                    <button
                        className="btn btn-primary"
                        disabled={!canCreate}
                        onClick={() => {
                            const riskDefault = riskFilter !== 'all' ? riskFilter : 'sante'
                            if (!canCreate) {
                                showToast('error', 'Création non autorisée pour votre rôle.')
                                return
                            }
                            setEditing({ id: null, code: '', libelle: '', risque: riskDefault })
                            upsertDialogRef.current?.showModal()
                        }}
                    >
                        Nouveau
                    </button>
                </div>
            </div>

            {/* Search + sort */}
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                <label className="input input-bordered flex items-center gap-2 w-full md:w-96">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70" viewBox="0 0 24 24" fill="currentColor"><path d="M10 2a8 8 0 015.292 13.708l4 4a1 1 0 01-1.414 1.414l-4-4A8 8 0 1110 2zm0 2a6 6 0 100 12A6 6 0 0010 4z"/></svg>
                    <input
                        type="text"
                        className="grow"
                        placeholder="Rechercher (code, libellé)"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </label>
                <label className="floating-label w-full sm:w-35 form-control">
                    <span className="label-text mb-1">Risque</span>
                    <select
                        className="select select-bordered"
                        value={riskFilter}
                        onChange={(e) => setRiskFilter(e.target.value)}
                    >
                        <option value="all">Tous</option>
                        {RISK_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </label>
                <div className="form-control">
                    <label className="label cursor-pointer gap-3">
                        <span className="label-text">Tri A→Z</span>
                        <input
                            type="checkbox"
                            className="toggle"
                            checked={sortAsc}
                            onChange={() => setSortAsc((v) => !v)}
                        />
                    </label>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="table">
                    <thead>
                    <tr>
                        <th>Code</th>
                        <th>Libellé</th>
                        <th>Risque</th>
                        <th style={{width: 180}}>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {pageRows.map((m) => (
                        <tr key={m.id}>
                            <td className="font-mono">{m.code}</td>
                            <td>{m.libelle || <span className="opacity-50">(sans libellé)</span>}</td>
                            <td>
                                <span className="badge badge-outline">
                                    {normalizeRisk(m.risque) === 'prevoyance' ? 'Prévoyance' : 'Santé'}
                                </span>
                            </td>
                            <td className="flex gap-2">
                                <button className="btn btn-xs btn-outline" onClick={() => { if (!canUpdate) { showToast('error', 'Modification non autorisée pour votre rôle.'); return; } setEditing({ ...m, risque: normalizeRisk(m.risque) }); upsertDialogRef.current?.showModal() }} disabled={!canUpdate}>
                                    <SquarePen size={16} />
                                </button>
                                {canDelete && (
                                    <button className="btn btn-xs btn-error btn-outline" onClick={() => requestDelete(m)}>
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {pageRows.length === 0 && (
                        <tr><td colSpan={4} className="opacity-60 italic">Aucun module</td></tr>
                    )}
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

            {/* Dialog: Create/Update */}
            <dialog ref={upsertDialogRef} className="modal sm:modal-middle">
                <div className="modal-box">
                    <h3 className="font-bold text-lg">
                        {editing?.id ? 'Modifier un module' : 'Nouveau module'}
                    </h3>
                    <fieldset className="fieldset bg-base-200 border-base-300 rounded-box border p-4" disabled={formDisabled}>
                        <form className="mt-4 space-y-4" onSubmit={submitUpsert}>

                            <label className="floating-label block w-full">
                                <span className="block mb-1">Libellé <span className="text-error">*</span></span>
                                <input
                                    type="text"
                                    value={editing?.libelle ?? ''}
                                    onChange={(e) => setEditing((v) => ({
                                        ...v,
                                        libelle: e.target.value,
                                        //code: sanitizeUpperKeep(e.target.value)
                                    }))}
                                    className="input input-bordered w-full font-mono"
                                    maxLength={40}
                                    required
                                />
                            </label>

                            <label className="floating-label block w-full">
                                <span className="block mb-1">Code <span className="text-error">*</span></span>
                                <input
                                    type="text"
                                    value={editing?.code ?? ''}
                                    onChange={(e) => setEditing((v) => ({ ...v, code: e.target.value }))}
                                    className="input input-bordered w-full font-mono"
                                    maxLength={40}
                                    required
                                />
                            </label>

                            <label className="floating-label block w-full">
                                <span className="block mb-1">Risque <span className="text-error">*</span></span>
                                <select
                                    className="select select-bordered w-full"
                                    value={normalizeRisk(editing?.risque)}
                                    onChange={(e) => setEditing((v) => ({ ...v, risque: e.target.value }))}
                                    disabled={!!editing?.id}
                                    required
                                >
                                    {RISK_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                {editing?.id && (
                                    <p className="text-xs opacity-70 mt-1">Le risque d’un module existant est verrouillé.</p>
                                )}
                            </label>

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
                    <h3 className="font-bold text-lg">Supprimer le module ?</h3>
                    <p className="py-2">Cette action est irréversible.</p>
                    <div className="bg-base-200 rounded p-3 font-mono">
                        {candidateDelete?.code} — {candidateDelete?.libelle || 'sans libellé'}
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
                <span className="font-mono">localStorage</span> clé: <span className="font-mono">{LS_KEY}</span> — {modules.length} modules
            </div>
        </div>
    )
}
