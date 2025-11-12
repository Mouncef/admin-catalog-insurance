'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRefOffers } from '@/providers/AppDataProvider'
import { sanitizeUpperKeep } from '@/lib/utils/StringUtil'
import { SquarePen, Trash2 } from "lucide-react";

/**
 * Page Next.js (JSX) — Administration des OFFRES
 * Schéma: offre { id, code (≤40, unique, not null), libelle }
 * Persistance via AppDataProvider (localStorage sous-jacent):
 *   - Offres: 'app:offres_v1'
 *
 * Emplacement suggéré: app/offres/page.jsx
 */
export default function OffersPage() {
    const LS_OFFRES = 'app:offres_v1'

    const { refOffers, setRefOffers } = useRefOffers()
    const [mounted, setMounted] = useState(false)
    const [query, setQuery] = useState('')
    const [sortAsc, setSortAsc] = useState(true)
    const [toast, setToast] = useState(null) // {type:'success'|'error'|'info', msg}

    // Pagination
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    const upsertDialogRef = useRef(null)
    const deleteDialogRef = useRef(null)
    // const importInputRef = useRef(null) // (optionnel)

    const [editing, setEditing] = useState(null) // offre en édition
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

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        let base = [...refOffers]
        base.sort((a, b) =>
            (sortAsc ? 1 : -1) * (a.code.localeCompare(b.code) || (a.libelle || '').localeCompare(b.libelle || ''))
        )
        if (!q) return base
        return base.filter((o) => o.code.toLowerCase().includes(q) || (o.libelle || '').toLowerCase().includes(q))
    }, [refOffers, query, sortAsc])

    // ======= Pagination dérivées =======
    const totalItems = filtered.length
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    const clamp = (p) => Math.max(1, Math.min(p, totalPages))
    const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
    const to = Math.min(totalItems, page * pageSize)
    const pageRows = filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)

    // Reset/clamp page quand filtres changent
    useEffect(() => { setPage(1) }, [query, sortAsc])
    useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages, page])

    // ===== CRUD =====
    function openCreate() {
        setEditing({ id: null, code: '', libelle: '' })
        upsertDialogRef.current?.showModal()
    }

    function openEdit(offre) {
        setEditing({ ...offre })
        upsertDialogRef.current?.showModal()
    }

    function submitUpsert(e) {
        e?.preventDefault?.()
        if (!editing) return

        const code = (editing.code || '').trim()
        if (!code) return showToast('error', 'Le code est requis')
        if (code.length > 40) return showToast('error', 'Code ≤ 40 caractères')

        const existsSameCode = refOffers.find((o) => o.code.toLowerCase() === code.toLowerCase() && o.id !== editing.id)
        if (existsSameCode) return showToast('error', `Le code "${code}" existe déjà`)

        const libelle = (editing.libelle || '').trim()

        if (!editing.id) {
            const created = { id: uuid(), code, libelle }
            setRefOffers([...refOffers, created])
            // setPage(1) // (optionnel) revenir à la page 1 après création
            showToast('success', 'Offre créée')
        } else {
            const nextArr = refOffers.map((o) => (o.id === editing.id ? { ...o, code, libelle } : o))
            setRefOffers(nextArr)
            showToast('success', 'Offre mise à jour')
        }

        upsertDialogRef.current?.close()
        setEditing(null)
    }

    function requestDelete(offre) {
        setCandidateDelete(offre)
        deleteDialogRef.current?.showModal()
    }

    function confirmDelete() {
        if (!candidateDelete) return
        setRefOffers(refOffers.filter((o) => o.id !== candidateDelete.id))
        showToast('success', 'Offre supprimée')
        deleteDialogRef.current?.close()
        setCandidateDelete(null)
    }

    function cancelDelete() {
        deleteDialogRef.current?.close()
        setCandidateDelete(null)
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
                <h1 className="text-2xl font-bold">Administration — Offres</h1>
                <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={openCreate}>+ Nouvelle offre</button>
                    <div className="join">
                        {/* Export/Import optionnels */}
                    </div>
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
                <div className="lg:ml-auto flex items-center gap-2">
                    <span className="text-sm opacity-70">Tri par code</span>
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
                                <th style={{ width: 260 }}>Code</th>
                                <th>Libellé</th>
                                <th className="text-right" style={{ width: 220 }}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {pageRows.length === 0 && (
                                <tr>
                                    <td colSpan={3}>
                                        <div className="p-6 text-center opacity-70">Aucune offre. Cliquez sur « Nouvelle offre » pour commencer.</div>
                                    </td>
                                </tr>
                            )}
                            {pageRows.map((o) => (
                                <tr key={o.id}>
                                    <td><div className="font-mono font-medium">{o.code}</div></td>
                                    <td className="max-w-[620px]"><div className="truncate" title={o.libelle}>{o.libelle || <span className="opacity-50">—</span>}</div></td>
                                    <td className="text-right">
                                        <div className="join justify-end">
                                            <button className="btn btn-sm join-item" onClick={() => openEdit(o)}>
                                                <SquarePen size={16} />
                                            </button>
                                            <button className="btn btn-sm btn-error join-item" onClick={() => requestDelete(o)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

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

            {/* Dialog: Create/Update */}
            <dialog ref={upsertDialogRef} className="modal">
                <div className="modal-box w-11/12 max-w-2xl">
                    <h3 className="font-bold text-lg">{editing?.id ? 'Modifier une offre' : 'Nouvelle offre'}</h3>
                    <fieldset className="fieldset bg-base-200 border-base-300 rounded-box border p-4">
                        <form className="mt-4" onSubmit={submitUpsert}>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                <label className="floating-label md:col-span-8">
                                    <span>Libellé</span>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        value={editing?.libelle ?? ''}
                                        onChange={(e) => setEditing((v) => ({ ...v, libelle: e.target.value, code: sanitizeUpperKeep(e.target.value) }))}
                                        placeholder="Ex: Offre Standard, Offre Premium…"
                                    />
                                </label>
                                <label className="floating-label md:col-span-4">
                                    <span>Code <span className="text-error">*</span></span>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full font-mono"
                                        value={editing?.code ?? ''}
                                        onChange={(e) => setEditing((v) => ({ ...v, code: e.target.value }))}
                                        placeholder="EX: STD, PREMIUM…"
                                        maxLength={40}
                                        required
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
                    <h3 className="font-bold text-lg">Supprimer l'offre ?</h3>
                    <p className="py-2">Cette action est irréversible.</p>
                    <div className="bg-base-200 rounded p-3 font-mono">
                        {candidateDelete ? (
                            <>
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
                <span className="font-mono">localStorage</span> clé: <span className="font-mono">{LS_OFFRES}</span> (offres) — {refOffers.length} offres
            </div>
        </div>
    )
}
