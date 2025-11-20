"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRefValueTypes } from '@/providers/AppDataProvider';
import { SquarePen, Trash2 } from 'lucide-react';
import {useAuth, usePermissions} from '@/providers/AuthProvider';
import {applyCreateAudit, applyDeleteAudit, applyUpdateAudit, ensureAuditFields} from '@/lib/utils/audit';

/**
 * Page Next.js — Référentiel des "types de valeur"
 * Schéma:
 *  - type: { id, code, libelle, fields: Field[] }
 *  - Field (discriminé par kind):
 *      - common: { name, kind: 'text'|'number'|'enum', required?: boolean }
 *      - number: { min?: number, max?: number, step?: number, suffix?: string }
 *      - text:   { placeholder?: string }
 *      - enum:   { options: {id:string,label:string}[] }
 *
 * Persistance via AppDataProvider (localStorage):
 *   - 'app:ref_value_types_v1'
 */

export default function ValueTypePageClient() {
    const LS_KEY = 'app:ref_value_types_v1';
    const { refValueTypes, setRefValueTypes } = useRefValueTypes();

    const [mounted, setMounted] = useState(false);
    const [query, setQuery] = useState('');
    const [sortAsc, setSortAsc] = useState(true);
    const [toast, setToast] = useState(null); // {type,msg}

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Dialogs / states
    const upsertDialogRef = useRef(null);
    const deleteDialogRef = useRef(null);
    const fieldDialogRef = useRef(null);
    const importInputRef = useRef(null);

    const [editingType, setEditingType] = useState(null);          // type en édition
    const [candidateDelete, setCandidateDelete] = useState(null);  // type à supprimer
    const [editingFieldIdx, setEditingFieldIdx] = useState(null);  // index du champ en édition (ou null)
    const [fieldDraft, setFieldDraft] = useState(null);            // brouillon champ
    const {canCreate, canUpdate, canDelete} = usePermissions();
    const {user} = useAuth();
    const formDisabled = editingType ? (editingType.id ? !canUpdate : !canCreate) : false;
    const allowWrite = canUpdate;

    useEffect(() => setMounted(true), []);
    useEffect(() => {
        if (!mounted) return;
        const needsMigration = (refValueTypes || []).some((t) => !t?.createdAt);
        if (needsMigration) {
            setRefValueTypes((prev) => sanitizeTypes(prev || []));
        }
    }, [mounted, refValueTypes, setRefValueTypes]);

    // ===== Utils =====
    const uuid = () => (crypto?.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 2200); };
    const slug = (s) => String(s || '').trim().toLowerCase().replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);

    // ===== Sanitize helpers =====
    function sanitizeTypes(arr) {
        const result = [];
        const seenCode = new Set();

        for (const t of arr || []) {
            if (!t) continue;
            let id = t.id || uuid();
            let code = String(t.code || '').trim();
            let libelle = String(t.libelle || '').trim();
            const fields = Array.isArray(t.fields) ? t.fields : [];

            // unicité de code (CI)
            let k = code.toLowerCase();
            if (seenCode.has(k)) {
                let n = 2; let cand = `${code}-${n}`;
                while (seenCode.has(cand.toLowerCase())) { n++; cand = `${code}-${n}`; }
                code = cand; k = code.toLowerCase();
            }
            seenCode.add(k);

            // Fields cleaning
            const cleanedFields = sanitizeFields(fields);

            const entry = ensureAuditFields({
                id,
                code,
                libelle,
                fields: cleanedFields,
                createdAt: t.createdAt,
                createdBy: t.createdBy,
                updatedAt: t.updatedAt,
                updatedBy: t.updatedBy,
                deletedAt: t.deletedAt ?? null,
                deletedBy: t.deletedBy ?? null,
            });
            result.push(entry);
        }
        return result;
    }

    function sanitizeFields(fields) {
        const out = [];
        const seenNames = new Set();

        const coerceNum = (v) => (v === '' || v == null ? undefined : Number(v));
        for (const f of fields || []) {
            if (!f) continue;
            let name = String(f.name || '').trim() || 'field';
            // unicité name
            let nk = name.toLowerCase();
            if (seenNames.has(nk)) {
                let n = 2; let cand = `${name}_${n}`;
                while (seenNames.has(cand.toLowerCase())) { n++; cand = `${name}_${n}`; }
                name = cand; nk = name.toLowerCase();
            }
            seenNames.add(nk);

            const kind = (f.kind === 'number' || f.kind === 'enum' || f.kind === 'text') ? f.kind : 'text';
            const required = !!f.required;

            if (kind === 'number') {
                out.push({
                    name, kind, required,
                    min: coerceNum(f.min),
                    max: coerceNum(f.max),
                    step: coerceNum(f.step),
                    suffix: f.suffix ? String(f.suffix) : undefined,
                });
            } else if (kind === 'enum') {
                const opts = Array.isArray(f.options) ? f.options : [];
                const cleanedOpts = sanitizeOptions(opts);
                out.push({ name, kind, required, options: cleanedOpts });
            } else {
                out.push({ name, kind, required, placeholder: f.placeholder ? String(f.placeholder) : undefined });
            }
        }
        return out;
    }

    function sanitizeOptions(options) {
        const out = [];
        const seen = new Set();
        for (const o of options || []) {
            if (!o) continue;
            let id = String(o.id || slug(o.label) || 'opt').trim() || 'opt';
            let k = id.toLowerCase();
            if (seen.has(k)) {
                let n = 2; let cand = `${id}_${n}`;
                while (seen.has(cand.toLowerCase())) { n++; cand = `${id}_${n}`; }
                id = cand; k = id.toLowerCase();
            }
            seen.add(k);
            out.push({ id, label: String(o.label || '').trim() || id.toUpperCase() });
        }
        return out;
    }

    const valueTypesRaw = useMemo(() => sanitizeTypes(refValueTypes || []), [refValueTypes]);
    const valueTypes = useMemo(() => valueTypesRaw.filter((t) => !t.deletedAt), [valueTypesRaw]);

    // ===== Derived / filters =====
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        let base = valueTypes.slice().sort((a, b) =>
            (sortAsc ? 1 : -1) * ((a.code || '').localeCompare(b.code || '') || (a.libelle || '').localeCompare(b.libelle || ''))
        );
        if (!q) return base;
        return base.filter((t) =>
            (t.code || '').toLowerCase().includes(q) ||
            (t.libelle || '').toLowerCase().includes(q) ||
            (t.fields || []).some(f => (f.name || '').toLowerCase().includes(q) || (f.kind || '').toLowerCase().includes(q))
        );
    }, [valueTypes, query, sortAsc]);

    // Pagination derived
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const clamp = (p) => Math.max(1, Math.min(p, totalPages));
    const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(totalItems, page * pageSize);
    const pageRows = filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
    useEffect(() => { setPage(1); }, [query, sortAsc]);
    useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

    // ===== CRUD Types =====
    function openCreateType() {
        if (!canCreate) {
            showToast('error', 'Création non autorisée pour votre rôle.');
            return;
        }
        setEditingType({ id: null, code: '', libelle: '', fields: [] });
        upsertDialogRef.current?.showModal();
    }

    function openEditType(t) {
        if (!canUpdate) {
            showToast('error', 'Modification non autorisée pour votre rôle.');
            return;
        }
        setEditingType(JSON.parse(JSON.stringify(t)));
        upsertDialogRef.current?.showModal();
    }

    function submitType(e) {
        e?.preventDefault?.();
        if (!editingType) return;
        const creating = !editingType.id;
        if (creating && !canCreate) {
            showToast('error', 'Création non autorisée pour votre rôle.');
            return;
        }
        if (!creating && !canUpdate) {
            showToast('error', 'Modification non autorisée pour votre rôle.');
            return;
        }

        const code = String(editingType.code || '').trim();
        if (!code) return showToast('error', 'Le code est requis');

        const libelle = String(editingType.libelle || '').trim();
        const cleanedFields = sanitizeFields(editingType.fields || []);

        // unicité code globale (CI)
        const conflict = valueTypes.find(t => t.code.toLowerCase() === code.toLowerCase() && t.id !== editingType.id);
        if (conflict) return showToast('error', `Le code "${code}" existe déjà`);

        if (!editingType.id) {
            const created = applyCreateAudit({ id: uuid(), code, libelle, fields: cleanedFields, deletedAt: null, deletedBy: null }, user);
            setRefValueTypes(sanitizeTypes([...(valueTypesRaw || []), created]));
            showToast('success', 'Type créé');
        } else {
            const next = (valueTypesRaw || []).map(t =>
                t.id === editingType.id ? applyUpdateAudit({ ...t, code, libelle, fields: cleanedFields }, user) : t
            );
            setRefValueTypes(sanitizeTypes(next));
            showToast('success', 'Type mis à jour');
        }
        upsertDialogRef.current?.close();
        setEditingType(null);
    }

    function requestDeleteType(t) {
        if (!canDelete) {
            showToast('error', 'Suppression non autorisée pour votre rôle.');
            return;
        }
        setCandidateDelete(t);
        deleteDialogRef.current?.showModal();
    }
    function confirmDeleteType() {
        if (!candidateDelete) return;
        if (!canDelete) {
            showToast('error', 'Suppression non autorisée pour votre rôle.');
            return;
        }
        const next = (valueTypesRaw || []).map((t) => t.id === candidateDelete.id ? applyDeleteAudit(t, user) : t);
        setRefValueTypes(sanitizeTypes(next));
        showToast('success', 'Type supprimé');
        deleteDialogRef.current?.close();
        setCandidateDelete(null);
    }
    function cancelDeleteType() {
        deleteDialogRef.current?.close();
        setCandidateDelete(null);
    }

    // ===== Fields management (dans le modal Type) =====
    function addField() {
        if (!allowWrite) {
            showToast('error', 'Modification non autorisée pour votre rôle.');
            return;
        }
        setEditingFieldIdx(null);
        setFieldDraft({ name: '', kind: 'text', required: false });
        fieldDialogRef.current?.showModal();
    }
    function editField(index) {
        if (!allowWrite) {
            showToast('error', 'Modification non autorisée pour votre rôle.');
            return;
        }
        setEditingFieldIdx(index);
        setFieldDraft(JSON.parse(JSON.stringify(editingType.fields[index])));
        fieldDialogRef.current?.showModal();
    }
    function removeField(index) {
        if (!allowWrite) {
            showToast('error', 'Modification non autorisée pour votre rôle.');
            return;
        }
        setEditingType((cur) => {
            const arr = [...(cur.fields || [])];
            arr.splice(index, 1);
            return { ...cur, fields: arr };
        });
    }
    function moveField(index, dir) {
        if (!allowWrite) {
            showToast('error', 'Modification non autorisée pour votre rôle.');
            return;
        }
        setEditingType((cur) => {
            const arr = [...(cur.fields || [])];
            const tgt = dir === 'up' ? index - 1 : index + 1;
            if (index < 0 || tgt < 0 || tgt >= arr.length) return cur;
            [arr[index], arr[tgt]] = [arr[tgt], arr[index]];
            return { ...cur, fields: arr };
        });
    }

    // ===== Field Dialog (add/edit) =====
    function submitField(e) {
        e?.preventDefault?.();
        if (!fieldDraft || !editingType) return;
        if (!allowWrite) {
            showToast('error', 'Modification non autorisée pour votre rôle.');
            return;
        }

        // validation basique
        const name = String(fieldDraft.name || '').trim();
        if (!name) return showToast('error', 'Le nom du champ est requis');

        const kind = fieldDraft.kind || 'text';
        let cleaned = { name, kind, required: !!fieldDraft.required };

        if (kind === 'number') {
            const min = fieldDraft.min === '' ? undefined : Number(fieldDraft.min);
            const max = fieldDraft.max === '' ? undefined : Number(fieldDraft.max);
            const step = fieldDraft.step === '' ? undefined : Number(fieldDraft.step);
            cleaned = { ...cleaned, min, max, step, suffix: fieldDraft.suffix || undefined };
        } else if (kind === 'enum') {
            const options = sanitizeOptions(fieldDraft.options || []);
            if (options.length === 0) return showToast('error', 'Ajoute au moins une option');
            cleaned = { ...cleaned, options };
        } else {
            cleaned = { ...cleaned, placeholder: fieldDraft.placeholder || undefined };
        }

        setEditingType((cur) => {
            const arr = [...(cur.fields || [])];
            if (editingFieldIdx == null) arr.push(cleaned);
            else arr[editingFieldIdx] = cleaned;
            return { ...cur, fields: sanitizeFields(arr) };
        });

        fieldDialogRef.current?.close();
        setFieldDraft(null);
        setEditingFieldIdx(null);
    }

    function cancelField() {
        fieldDialogRef.current?.close();
        setFieldDraft(null);
        setEditingFieldIdx(null);
    }

    // ===== Import/Export/Reset =====
    function exportJSON() {
        const data = JSON.stringify(valueTypesRaw || [], null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'ref_value_types.json'; a.click();
        URL.revokeObjectURL(url);
    }
    function triggerImport() {
        if (!allowWrite) {
            showToast('error', 'Import non autorisé pour votre rôle.');
            return;
        }
        importInputRef.current?.click();
    }
    function onImportFileChange(e) {
        if (!allowWrite) {
            showToast('error', 'Import non autorisé pour votre rôle.');
            return;
        }
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const incoming = JSON.parse(String(reader.result));
                if (!Array.isArray(incoming)) throw new Error('JSON attendu: tableau de types');
                const merged = mergeByCode(valueTypesRaw || [], incoming);
                setRefValueTypes(sanitizeTypes(merged));
                showToast('success', 'Import réussi');
            } catch (err) {
                console.error(err);
                showToast('error', 'Import invalide: ' + (err?.message || 'erreur inconnue'));
            } finally {
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    }
    function mergeByCode(existing, incoming) {
        const keyOf = (t) => String(t.code || '').trim().toLowerCase();
        const map = new Map((existing || []).map((t) => [keyOf(t), ensureAuditFields(t)]));
        for (const raw of incoming || []) {
            if (!raw) continue;
            const code = String(raw.code || '').trim();
            if (!code) continue;
            const key = code.toLowerCase();
            const prev = map.get(key);
            const merged = ensureAuditFields({
                ...(prev || { id: raw.id || uuid(), code }),
                code,
                libelle: raw.libelle ?? prev?.libelle ?? '',
                fields: sanitizeFields(raw.fields || prev?.fields || []),
                createdAt: raw.createdAt || prev?.createdAt,
                createdBy: raw.createdBy || prev?.createdBy,
                updatedAt: raw.updatedAt || prev?.updatedAt,
                updatedBy: raw.updatedBy || prev?.updatedBy,
                deletedAt: raw.deletedAt ?? prev?.deletedAt ?? null,
                deletedBy: raw.deletedBy ?? prev?.deletedBy ?? null,
            });
            map.set(key, merged);
        }
        return Array.from(map.values());
    }
    function resetAll() {
        if (!canDelete) {
            showToast('error', 'Suppression non autorisée pour votre rôle.');
            return;
        }
        if (!confirm('Supprimer tous les types de valeur stockés ?')) return;
        const next = (valueTypesRaw || []).map((type) => type.deletedAt ? type : applyDeleteAudit(type, user));
        setRefValueTypes(sanitizeTypes(next));
        showToast('info', 'Liste vidée');
    }

    if (!mounted) {
        return (
            <div className="p-6">
                <div className="skeleton h-8 w-64 mb-4" />
                <div className="skeleton h-5 w-96 mb-2" />
                <div className="skeleton h-5 w-80" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <h1 className="text-2xl font-bold">Référentiel — Types de valeur</h1>
                <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={openCreateType} disabled={!canCreate}>+ Nouveau type</button>
                    <div className="join">
                        <button className="btn join-item" onClick={exportJSON}>Export JSON</button>
                        <button className="btn join-item" onClick={triggerImport} disabled={!allowWrite}>Import JSON</button>
                        <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={onImportFileChange} />
                    </div>
                    <button className="btn btn-ghost" onClick={resetAll} disabled={!canDelete}>Réinitialiser</button>
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
                                <th style={{ width: 160 }}>Code</th>
                                <th>Libellé</th>
                                <th style={{ width: 140 }}>Champs</th>
                                <th className="hidden md:table-cell">Aperçu des champs</th>
                                <th className="text-right" style={{ width: 180 }}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {pageRows.length === 0 && (
                                <tr><td colSpan={5}><div className="p-6 text-center opacity-70">Aucun type. Clique sur « Nouveau type » pour commencer.</div></td></tr>
                            )}
                            {pageRows.map((t) => (
                                <tr key={t.id}>
                                    <td><div className="font-mono font-medium">{t.code}</div></td>
                                    <td className="max-w-[520px]">
                                        <div className="truncate" title={t.libelle}>{t.libelle || <span className="opacity-50">—</span>}</div>
                                    </td>
                                    <td><span className="badge">{(t.fields || []).length}</span></td>
                                    <td className="hidden md:table-cell">
                                        <div className="flex flex-wrap gap-1 max-w-[800px]">
                                            {(t.fields || []).map((f, i) => (
                                                <div key={i} className="badge badge-ghost gap-1">
                                                    <span className="font-mono">{f.name}</span>
                                                    <span className="opacity-60">({f.kind})</span>
                                                    {f.required && <span className="ml-1 badge badge-info badge-xs">req</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="text-right">
                                        <div className="join justify-end">
                                            <button className="btn btn-sm join-item" onClick={() => openEditType(t)} disabled={!canUpdate}><SquarePen size={16} /></button>
                                            {canDelete && (
                                                <button className="btn btn-sm btn-error join-item" onClick={() => requestDeleteType(t)}><Trash2 size={16} /></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
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
                                        onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
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

            {/* Dialog: Create/Update Type */}
            <dialog ref={upsertDialogRef} className="modal">
                <div className="modal-box w-11/12 max-w-5xl">
                    <h3 className="font-bold text-lg">{editingType?.id ? 'Modifier un type' : 'Nouveau type'}</h3>
                    <form className="mt-4" onSubmit={submitType}>
                        <fieldset disabled={formDisabled} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            <label className="floating-label md:col-span-4">
                                <span>Code <span className="text-error">*</span></span>
                                <input
                                    type="text"
                                    className="input input-bordered w-full font-mono"
                                    value={editingType?.code ?? ''}
                                    onChange={(e) => setEditingType(v => ({ ...v, code: e.target.value }))}
                                    maxLength={40}
                                    required
                                />
                            </label>

                            <label className="floating-label md:col-span-8">
                                <span>Libellé</span>
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    value={editingType?.libelle ?? ''}
                                    onChange={(e) => setEditingType(v => ({ ...v, libelle: e.target.value }))}
                                />
                            </label>
                        </div>

                        {/* Fields list */}
                        <div className="mt-6">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold">Champs</h4>
                                <button type="button" className="btn btn-sm btn-primary" onClick={addField} disabled={!allowWrite}>+ Ajouter un champ</button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="table">
                                    <thead>
                                    <tr>
                                        <th style={{width: 56}}>Ordre</th>
                                        <th>Nom</th>
                                        <th style={{width: 120}}>Type</th>
                                        <th style={{width: 120}}>Requis ?</th>
                                        <th className="hidden lg:table-cell">Détails</th>
                                        <th className="text-right" style={{width: 200}}>Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {(editingType?.fields || []).length === 0 && (
                                        <tr><td colSpan={6}><div className="p-4 text-center opacity-60">Aucun champ</div></td></tr>
                                    )}
                                    {(editingType?.fields || []).map((f, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <div className="join">
                                                    <button type="button" className="btn btn-xs join-item" onClick={() => moveField(idx, 'up')} disabled={!allowWrite}>▲</button>
                                                    <span className="btn btn-xs join-item btn-ghost">{idx + 1}</span>
                                                    <button type="button" className="btn btn-xs join-item" onClick={() => moveField(idx, 'down')} disabled={!allowWrite}>▼</button>
                                                </div>
                                            </td>
                                            <td><span className="font-mono">{f.name}</span></td>
                                            <td><span className="badge">{f.kind}</span></td>
                                            <td>{f.required ? <span className="badge badge-success">Oui</span> : <span className="badge">Non</span>}</td>
                                            <td className="hidden lg:table-cell">
                                                {f.kind === 'number' && (
                                                    <div className="text-sm opacity-80">
                                                        min: {f.min ?? '—'} / max: {f.max ?? '—'} / step: {f.step ?? '—'} / suffix: {f.suffix || '—'}
                                                    </div>
                                                )}
                                                {f.kind === 'text' && (
                                                    <div className="text-sm opacity-80">placeholder: {f.placeholder || '—'}</div>
                                                )}
                                                {f.kind === 'enum' && (
                                                    <div className="text-sm opacity-80">
                                                        {Array.isArray(f.options) && f.options.length > 0
                                                            ? f.options.map(o => o.label).join(', ')
                                                            : '—'}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="text-right">
                                                <div className="join justify-end">
                                                    <button type="button" className="btn btn-sm join-item" onClick={() => editField(idx)} disabled={!allowWrite}><SquarePen size={16} /></button>
                                                    {allowWrite && (
                                                        <button type="button" className="btn btn-sm btn-error join-item" onClick={() => removeField(idx)}><Trash2 size={16} /></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="alert alert-info mt-2">
                                <span>Les noms de champs doivent être uniques dans un type. Le type <span className="font-mono">enum</span> nécessite au moins une option.</span>
                            </div>
                        </div>
                        </fieldset>

                        <div className="modal-action mt-4">
                            <button type="button" className="btn btn-ghost" onClick={() => { upsertDialogRef.current?.close(); setEditingType(null); }}>Annuler</button>
                            <button type="submit" className="btn btn-primary" disabled={formDisabled}>Enregistrer</button>
                        </div>
                    </form>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>

            {/* Dialog: Delete Type */}
            <dialog ref={deleteDialogRef} className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Supprimer le type ?</h3>
                    <p className="py-2">Cette action est irréversible.</p>
                    <div className="bg-base-200 rounded p-3 font-mono">
                        {candidateDelete ? (
                            <>
                                <div><span className="opacity-70">Code:</span> {candidateDelete.code}</div>
                                <div><span className="opacity-70">Libellé:</span> {candidateDelete.libelle || '—'}</div>
                                <div><span className="opacity-70">Champs:</span> {(candidateDelete.fields || []).length}</div>
                            </>
                        ) : '—'}
                    </div>
                    <div className="modal-action">
                        <button className="btn" onClick={cancelDeleteType}>Annuler</button>
                        <button className="btn btn-error" onClick={confirmDeleteType} disabled={!canDelete}>Supprimer</button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>

            {/* Dialog: Add/Edit Field */}
            <dialog ref={fieldDialogRef} className="modal">
                <div className="modal-box w-11/12 max-w-3xl">
                    <h3 className="font-bold text-lg">{editingFieldIdx == null ? 'Ajouter un champ' : 'Modifier le champ'}</h3>

                    <form className="mt-4 space-y-4" onSubmit={submitField}>
                        <fieldset disabled={!allowWrite} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            <label className="floating-label md:col-span-6">
                                <span>Nom du champ <span className="text-error">*</span></span>
                                <input
                                    type="text"
                                    className="input input-bordered w-full font-mono"
                                    value={fieldDraft?.name ?? ''}
                                    onChange={(e) => setFieldDraft(v => ({ ...v, name: e.target.value }))}
                                    required
                                />
                            </label>

                            <label className="floating-label md:col-span-4">
                                <span>Type</span>
                                <select
                                    className="select select-bordered w-full"
                                    value={fieldDraft?.kind ?? 'text'}
                                    onChange={(e) => {
                                        const k = e.target.value;
                                        // reset props spécifiques
                                        setFieldDraft(v => k === 'number'
                                            ? { name: v.name || '', kind: 'number', required: !!v.required, min: undefined, max: undefined, step: 1, suffix: '' }
                                            : k === 'enum'
                                                ? { name: v.name || '', kind: 'enum', required: !!v.required, options: [] }
                                                : { name: v.name || '', kind: 'text', required: !!v.required, placeholder: '' }
                                        );
                                    }}
                                >
                                    <option value="text">text</option>
                                    <option value="number">number</option>
                                    <option value="enum">enum</option>
                                </select>
                            </label>
                        </div>


                        {/* Zone spécifique selon le kind */}
                        {fieldDraft?.kind === 'number' && (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-3">
                                <label className="floating-label md:col-span-3">
                                    <span>Min</span>
                                    <input
                                        type="number" className="input input-bordered w-full"
                                        value={fieldDraft.min ?? ''} onChange={(e) => setFieldDraft(v => ({ ...v, min: e.target.value === '' ? '' : Number(e.target.value) }))}
                                        placeholder="0"
                                    />
                                </label>
                                <label className="floating-label md:col-span-3">
                                    <span>Max</span>
                                    <input
                                        type="number" className="input input-bordered w-full"
                                        value={fieldDraft.max ?? ''} onChange={(e) => setFieldDraft(v => ({ ...v, max: e.target.value === '' ? '' : Number(e.target.value) }))}
                                        placeholder="1000"
                                    />
                                </label>
                                <label className="floating-label md:col-span-3">
                                    <span>Step</span>
                                    <input
                                        type="number" className="input input-bordered w-full"
                                        value={fieldDraft.step ?? ''} onChange={(e) => setFieldDraft(v => ({ ...v, step: e.target.value === '' ? '' : Number(e.target.value) }))}
                                        placeholder="1"
                                    />
                                </label>
                                <label className="floating-label md:col-span-3">
                                    <span>Suffixe</span>
                                    <input
                                        type="text" className="input input-bordered w-full"
                                        value={fieldDraft.suffix ?? ''} onChange={(e) => setFieldDraft(v => ({ ...v, suffix: e.target.value }))}
                                        placeholder="% / € …"
                                    />
                                </label>
                            </div>
                        )}

                        {fieldDraft?.kind === 'text' && (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-3">
                                <label className="floating-label md:col-span-12">
                                    <span>Placeholder</span>
                                    <input
                                        type="text" className="input input-bordered w-full"
                                        value={fieldDraft.placeholder ?? ''} onChange={(e) => setFieldDraft(v => ({ ...v, placeholder: e.target.value }))}
                                    />
                                </label>
                            </div>
                        )}

                        {fieldDraft?.kind === 'enum' && (
                            <div className="mt-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="opacity-80">Options</span>
                                    <button
                                        type="button"
                                        className="btn btn-sm"
                                        onClick={() =>
                                            setFieldDraft(v => ({ ...v, options: [...(v.options || []), { id: `opt_${(v.options?.length || 0) + 1}`, label: `Option ${(v.options?.length || 0) + 1}` }] }))
                                        }
                                    >
                                        + Ajouter une option
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {(fieldDraft.options || []).length === 0 && <div className="opacity-60">— aucune option</div>}
                                    {(fieldDraft.options || []).map((o, i) => (
                                        <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2">
                                            <label className="floating-label md:col-span-4">
                                                <span>ID</span>
                                                <input
                                                    type="text" className="input input-bordered w-full font-mono"
                                                    value={o.id}
                                                    onChange={(e) => {
                                                        const id = e.target.value;
                                                        setFieldDraft(v => {
                                                            const arr = [...(v.options || [])];
                                                            arr[i] = { ...arr[i], id };
                                                            return { ...v, options: arr };
                                                        });
                                                    }}
                                                />
                                            </label>
                                            <label className="floating-label md:col-span-4">
                                                <span>Label</span>
                                                <input
                                                    type="text" className="input input-bordered w-full"
                                                    value={o.label}
                                                    onChange={(e) => {
                                                        const label = e.target.value;
                                                        setFieldDraft(v => {
                                                            const arr = [...(v.options || [])];
                                                            arr[i] = { ...arr[i], label };
                                                            return { ...v, options: arr };
                                                        });
                                                    }}
                                                />
                                            </label>
                                            <div className="md:col-span-3 flex items-end justify-end gap-2">
                                                <div className="join">
                                                    <button type="button" className="btn btn-xs join-item" onClick={() => {
                                                        setFieldDraft(v => {
                                                            const arr = [...(v.options || [])];
                                                            const tgt = i - 1;
                                                            if (tgt < 0) return v;
                                                            [arr[i], arr[tgt]] = [arr[tgt], arr[i]];
                                                            return { ...v, options: arr };
                                                        });
                                                    }}>▲</button>
                                                    <button type="button" className="btn btn-xs join-item" onClick={() => {
                                                        setFieldDraft(v => {
                                                            const arr = [...(v.options || [])];
                                                            const tgt = i + 1;
                                                            if (tgt >= arr.length) return v;
                                                            [arr[i], arr[tgt]] = [arr[tgt], arr[i]];
                                                            return { ...v, options: arr };
                                                        });
                                                    }}>▼</button>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn btn-xs btn-error"
                                                    onClick={() => setFieldDraft(v => {
                                                        const arr = [...(v.options || [])];
                                                        arr.splice(i, 1);
                                                        return { ...v, options: arr };
                                                    })}
                                                >
                                                    Supprimer
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className={"block w-30"}>
                            <label className="label h-12 px-3 border border-base-300 rounded-box bg-base-100 flex justify-between items-center">
                                <span className="label-text">Requis</span>
                                <input
                                    type="checkbox"
                                    className="toggle"
                                    checked={!!fieldDraft?.required}
                                    onChange={(e) => setFieldDraft(v => ({ ...v, required: e.target.checked }))}
                                />
                            </label>
                        </div>

                        <div className="modal-action mt-4">
                            <button type="button" className="btn btn-ghost" onClick={cancelField}>Annuler</button>
                            <button type="submit" className="btn btn-primary">OK</button>
                        </div>
                        </fieldset>
                        <div className="modal-action">
                            <button type="button" className="btn" onClick={cancelField}>Annuler</button>
                            <button type="submit" className="btn btn-primary" disabled={!allowWrite}>Enregistrer</button>
                        </div>
                    </form>
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
                <span className="font-mono">localStorage</span> clé: <span className="font-mono">{LS_KEY}</span> — {valueTypes.length} types actifs
            </div>
        </div>
    );
}
