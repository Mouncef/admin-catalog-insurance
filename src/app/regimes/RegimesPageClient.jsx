"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { SquarePen, Trash2 } from "lucide-react";
import { useRefRegimes } from '@/providers/AppDataProvider'
import { sanitizeUpperKeep } from '@/lib/utils/StringUtil'
import {useAuth, usePermissions} from '@/providers/AuthProvider';
import {applyCreateAudit, applyDeleteAudit, applyUpdateAudit, ensureAuditFields} from '@/lib/utils/audit';

export default function RegimesPageClient() {
    const { refRegimes, setRefRegimes } = useRefRegimes()

    const [mounted, setMounted] = useState(false)
    const [query, setQuery] = useState('')
    const [sortAsc, setSortAsc] = useState(true)
    const [toast, setToast] = useState(null)
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    const upsertDialogRef = useRef(null)
    const deleteDialogRef = useRef(null)

    const [editing, setEditing] = useState(null)
    const [candidateDelete, setCandidateDelete] = useState(null)
    const {canCreate, canUpdate, canDelete} = usePermissions();
    const {user} = useAuth();
    const formDisabled = editing ? (editing.id ? !canUpdate : !canCreate) : false;

    useEffect(() => { setMounted(true) }, [])
    useEffect(() => {
        if (!mounted) return
        const needsMigration = (refRegimes || []).some((r) => !r?.createdAt)
        if (needsMigration) {
            setRefRegimes((prev) => sanitizeList(prev || []))
        }
    }, [mounted, refRegimes, setRefRegimes])

    function uuid() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
        return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    }
    function showToast(type, msg) { setToast({ type, msg }); setTimeout(() => setToast(null), 2200) }

    function sanitizeList(arr) {
        const list = (arr || []).map(raw => ensureAuditFields({
            id: raw?.id || uuid(),
            code: String(raw?.code || '').trim(),
            libelle: String(raw?.libelle || '').trim(),
            ordre: Number.isFinite(Number(raw?.ordre)) ? Number(raw.ordre) : undefined,
            is_enabled: typeof raw?.is_enabled === 'boolean' ? raw.is_enabled : true,
            createdAt: raw?.createdAt,
            createdBy: raw?.createdBy,
            updatedAt: raw?.updatedAt,
            updatedBy: raw?.updatedBy,
            deletedAt: raw?.deletedAt ?? null,
            deletedBy: raw?.deletedBy ?? null,
        }))
        const seen = new Set(), out = []
        for (const it of list) {
            if (!it.code) continue
            let code = it.code, k = code.toLowerCase()
            if (seen.has(k)) {
                let n = 2; let cand = `${code}-${n}`
                while (seen.has(cand.toLowerCase())) { n++; cand = `${code}-${n}` }
                code = cand; k = code.toLowerCase()
            }
            seen.add(k); out.push({ ...it, code })
        }
        out.sort((a, b) => (a.ordre ?? 1e9) - (b.ordre ?? 1e9) || a.code.localeCompare(b.code))
        return out.map((it, i) => ({ ...it, ordre: i + 1 }))
    }
    const regimesRaw = useMemo(() => sanitizeList(refRegimes || []), [refRegimes])
    const regimes = useMemo(() => regimesRaw.filter((regime) => !regime.deletedAt), [regimesRaw])

    const nextOrdre = () => (regimes.length || 0) + 1

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        let base = [...regimes].sort((a, b) =>
            (sortAsc ? 1 : -1) * ((a.ordre || 0) - (b.ordre || 0) || a.code.localeCompare(b.code))
        )
        if (!q) return base
        return base.filter(x => x.code.toLowerCase().includes(q) || (x.libelle || '').toLowerCase().includes(q))
    }, [regimes, query, sortAsc])

    const totalItems = filtered.length
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    const clamp = (p) => Math.max(1, Math.min(p, totalPages))
    const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
    const to = Math.min(totalItems, page * pageSize)
    const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)
    useEffect(() => { setPage(1) }, [query, sortAsc])
    useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages, page])

    function openCreate() {
        if (!canCreate) {
            showToast('error', 'Création non autorisée pour votre rôle.')
            return
        }
        setEditing({ id: null, code: '', libelle: '', ordre: nextOrdre(), is_enabled: true })
        upsertDialogRef.current?.showModal()
    }
    function openEdit(item) {
        if (!canUpdate) {
            showToast('error', 'Modification non autorisée pour votre rôle.')
            return
        }
        setEditing({ ...item }); upsertDialogRef.current?.showModal()
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
        const code = (editing.code || '').trim()
        if (!code) return showToast('error', 'Code requis')
        const exists = regimes.find(x => x.code.toLowerCase() === code.toLowerCase() && x.id !== editing.id)
        if (exists) return showToast('error', `Le code "${code}" existe déjà`)

        const libelle = (editing.libelle || '').trim()
        const is_enabled = !!editing.is_enabled
        const ordre = Number.isFinite(Number(editing.ordre)) ? Number(editing.ordre) : nextOrdre()

        if (!editing.id) {
            const created = applyCreateAudit({ id: uuid(), code, libelle, ordre, is_enabled, deletedAt: null, deletedBy: null }, user)
            setRefRegimes(sanitizeList([...(regimesRaw || []), created]))
            showToast('success', 'Régime créé')
        } else {
            const next = (regimesRaw || []).map(it => it.id === editing.id
                ? applyUpdateAudit({ ...it, code, libelle, ordre, is_enabled }, user)
                : it
            )
            setRefRegimes(sanitizeList(next))
            showToast('success', 'Régime mis à jour')
        }
        upsertDialogRef.current?.close(); setEditing(null)
    }
    function requestDelete(item) {
        if (!canDelete) {
            showToast('error', 'Suppression non autorisée pour votre rôle.')
            return
        }
        setCandidateDelete(item); deleteDialogRef.current?.showModal()
    }
    function confirmDelete() {
        if (!candidateDelete) return
        if (!canDelete) {
            showToast('error', 'Suppression non autorisée pour votre rôle.')
            return
        }
        const next = (regimesRaw || []).map((x) => x.id === candidateDelete.id ? applyDeleteAudit(x, user) : x)
        setRefRegimes(sanitizeList(next))
        showToast('success', 'Régime supprimé')
        deleteDialogRef.current?.close(); setCandidateDelete(null)
    }
    function cancelDelete() { deleteDialogRef.current?.close(); setCandidateDelete(null) }
    function move(item, dir) {
        if (!canUpdate) {
            showToast('error', 'Modification non autorisée pour votre rôle.')
            return
        }
        const ids = [...regimes].sort((a, b) => a.ordre - b.ordre).map(x => x.id)
        const i = ids.indexOf(item.id); const j = dir === 'up' ? i - 1 : i + 1
        if (i < 0 || j < 0 || j >= ids.length) return
        const a = regimesRaw.find(x => x.id === ids[i])
        const b = regimesRaw.find(x => x.id === ids[j])
        if (!a || !b) return
        const next = (regimesRaw || []).map((entry) => {
            if (entry.id === a.id) return applyUpdateAudit({ ...entry, ordre: b.ordre }, user)
            if (entry.id === b.id) return applyUpdateAudit({ ...entry, ordre: a.ordre }, user)
            return entry
        })
        setRefRegimes(sanitizeList(next))
    }
    function toggleEnabled(item) {
        if (!canUpdate) {
            showToast('error', 'Modification non autorisée pour votre rôle.')
            return
        }
        const next = (regimesRaw || []).map(x => x.id === item.id ? applyUpdateAudit({ ...x, is_enabled: !x.is_enabled }, user) : x)
        setRefRegimes(sanitizeList(next))
    }
    function resetAll() {
        if (!canDelete) {
            showToast('error', 'Suppression non autorisée pour votre rôle.')
            return
        }
        if (!confirm('Vider tous les régimes ?')) return
        const next = (regimesRaw || []).map((regime) => regime.deletedAt ? regime : applyDeleteAudit(regime, user))
        setRefRegimes(sanitizeList(next))
        showToast('info', 'Liste vidée')
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
            <div className="flex items-center justify-between gap-2">
                <h1 className="text-2xl font-bold">Référentiel — Régimes</h1>
                <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={openCreate}>+ Nouveau régime</button>
                    <button className="btn btn-ghost" onClick={resetAll}>Réinitialiser</button>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row xl:items-center gap-2">
                <label className="floating-label w-full xl:w-96">
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
                    <input type="checkbox" className="toggle" checked={sortAsc} onChange={() => setSortAsc(v => !v)} />
                </div>
            </div>

            <div className="card bg-base-100 shadow-md">
                <div className="card-body p-0">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead>
                            <tr>
                                <th style={{ width: 90 }}>Ordre</th>
                                <th>Code</th>
                                <th>Libellé</th>
                                <th style={{ width: 130 }}>Activé ?</th>
                                <th className="text-right" style={{ width: 200 }}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {pageRows.length === 0 && (
                                <tr><td colSpan={5}><div className="p-6 text-center opacity-70">Aucune entrée.</div></td></tr>
                            )}
                            {pageRows.map((it) => (
                                <tr key={it.id}>
                                    <td>
                                        <div className="join">
                                            <button className="btn btn-xs join-item" onClick={() => move(it, 'up')}>▲</button>
                                            <span className="join-item btn btn-xs btn-ghost">{it.ordre}</span>
                                            <button className="btn btn-xs join-item" onClick={() => move(it, 'down')}>▼</button>
                                        </div>
                                    </td>
                                    <td><div className="font-mono font-medium">{it.code}</div></td>
                                    <td className="max-w-[520px]"><div className="truncate" title={it.libelle}>{it.libelle || <span className="opacity-50">—</span>}</div></td>
                                    <td><input type="checkbox" className="toggle" checked={!!it.is_enabled} onChange={() => toggleEnabled(it)} disabled={!canUpdate} /></td>
                                    <td className="text-right">
                                        <div className="join justify-end">
                                            <button className="btn btn-sm join-item" onClick={() => openEdit(it)} disabled={!canUpdate}><SquarePen size={16} /></button>
                                            {canDelete && (
                                                <button className="btn btn-sm btn-error join-item" onClick={() => requestDelete(it)}><Trash2 size={16} /></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>

                        <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                            <div className="text-sm opacity-80">
                                {totalItems === 0 ? 'Aucun résultat'
                                    : <>Affichage <span className="font-mono">{from}</span>–<span className="font-mono">{to}</span> sur <span className="font-mono">{totalItems}</span></>}
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2">
                                    <span className="text-sm opacity-80">Lignes / page</span>
                                    <select className="select select-bordered select-sm" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}>
                                        {[5, 10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </label>
                                <div className="join">
                                    <button className="btn btn-sm join-item" onClick={() => setPage(1)} disabled={page <= 1}>«</button>
                                    <button className="btn btn-sm join-item" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>‹</button>
                                    <span className="join-item btn btn-sm btn-ghost">Page {page} / {totalPages}</span>
                                    <button className="btn btn-sm join-item" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>›</button>
                                    <button className="btn btn-sm join-item" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>»</button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Upsert */}
            <dialog ref={upsertDialogRef} className="modal">
                <div className="modal-box w-11/12 max-w-3xl">
                    <h3 className="font-bold text-lg">{editing?.id ? 'Modifier le régime' : 'Nouveau régime'}</h3>
                    <form className="mt-4" onSubmit={submitUpsert}>
                        <fieldset disabled={formDisabled} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            <label className="floating-label md:col-span-8">
                                <span>Libellé</span>
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    value={editing?.libelle ?? ''}
                                    onChange={(e) => setEditing(v => ({ ...v, libelle: e.target.value, code: sanitizeUpperKeep(e.target.value) }))}
                                    placeholder="Ex: Base, Province, Alsace-Moselle…"
                                />
                            </label>
                            <label className="floating-label md:col-span-4">
                                <span>Ordre</span>
                                <input
                                    type="number"
                                    min={1}
                                    className="input input-bordered w-full"
                                    value={editing?.ordre ?? ''}
                                    onChange={(e) => setEditing(v => ({ ...v, ordre: e.target.value === '' ? '' : Number(e.target.value) }))}
                                    placeholder="1"
                                />
                            </label>
                            <label className="floating-label md:col-span-8">
                                <span>Code *</span>
                                <input
                                    type="text"
                                    className="input input-bordered w-full font-mono"
                                    value={editing?.code ?? ''}
                                    onChange={(e) => setEditing(v => ({ ...v, code: e.target.value }))}
                                    placeholder="EX: BASE, PROVINCE, ALS_MOSELLE…"
                                    maxLength={80}
                                    required
                                />
                            </label>
                            <div className="md:col-span-4">
                                <label className="label h-12 px-3 border border-base-300 rounded-box bg-base-100 flex justify-between items-center">
                                    <span className="label-text">Activé</span>
                                    <input type="checkbox" className="toggle" checked={!!editing?.is_enabled} onChange={(e) => setEditing(v => ({ ...v, is_enabled: e.target.checked }))} disabled={!canUpdate}/>
                                </label>
                            </div>
                        </div>
                        </fieldset>
                        <div className="modal-action mt-6">
                            <button type="button" className="btn btn-ghost" onClick={() => { upsertDialogRef.current?.close(); setEditing(null) }}>Annuler</button>
                            <button type="submit" className="btn btn-primary" disabled={formDisabled}>Enregistrer</button>
                        </div>
                    </form>
                </div>
                <form method="dialog" className="modal-backdrop"><button>close</button></form>
            </dialog>

            {/* Delete */}
            <dialog ref={deleteDialogRef} className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Supprimer le régime ?</h3>
                    <p className="py-2">Cette action est irréversible.</p>
                    <div className="bg-base-200 rounded p-3 font-mono">
                        {candidateDelete ? (<><div><span className="opacity-70">Code:</span> {candidateDelete.code}</div><div><span className="opacity-70">Libellé:</span> {candidateDelete.libelle || '—'}</div></>) : '—'}
                    </div>
                    <div className="modal-action">
                        <button className="btn" onClick={() => { deleteDialogRef.current?.close(); setCandidateDelete(null) }}>Annuler</button>
                        <button className="btn btn-error" onClick={confirmDelete} disabled={!canDelete}>Supprimer</button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop"><button>close</button></form>
            </dialog>

            {toast && (
                <div className="toast">
                    <div className={`alert ${toast.type === 'success' ? 'alert-success' : toast.type === 'error' ? 'alert-error' : 'alert-info'}`}>
                        <span>{toast.msg}</span>
                    </div>
                </div>
            )}

            <div className="opacity-60 text-xs">
                Clé <span className="font-mono">app:ref_regimes_v1</span> — {regimes.length} éléments actifs
            </div>
        </div>
    )
}
