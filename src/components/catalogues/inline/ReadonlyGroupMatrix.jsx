'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import ValueEditorTyped from '@/components/catalogues/inline/ValueEditorTyped';
import { coerceCellValue } from '@/lib/utils/CatalogueInline';

function CellView({ v }) {
    const hasV = (v?.value || '').trim().length > 0;
    const hasE = (v?.expression || '').trim().length > 0;
    if (!hasV && !hasE) return <span className="opacity-40">—</span>;
    return (
        <div className="min-h-8">
            {hasV && <div className="font-mono text-sm break-words">{v.value}</div>}
            {hasE && <div className="text-xs opacity-70 break-words" title={v.expression}>{v.expression}</div>}
        </div>
    );
}

export default function ReadonlyGroupMatrix({
                                                editable = false,
                                                group,
                                                module,
                                                niveaux,
                                                niveauxBase,
                                                niveauxSurco,
                                                separateSets = false,
                                                allowSurco = true,
                                                optionDepth: _optionDepth = 0,
                                                categoriesByModule,
                                                actsByCategory,
                                                membres,
                                                gvaleurs,
                                                onSave,
                                                onCancel,
                                            }) {
    const sortLevels = (list = []) =>
        list
            .slice()
            .sort(
                (a, b) =>
                    (a.ordre || 0) - (b.ordre || 0) ||
                    String(a.code || '').localeCompare(String(b.code || ''))
            );

    const fallbackLevels = useMemo(() => sortLevels(niveaux || []), [niveaux]);
    const baseLevels = useMemo(() => {
        if (Array.isArray(niveauxBase) && niveauxBase.length) return sortLevels(niveauxBase);
        return fallbackLevels;
    }, [niveauxBase, fallbackLevels]);
    const surcoLevels = useMemo(() => {
        if (!allowSurco) return [];
        if (Array.isArray(niveauxSurco) && niveauxSurco.length) return sortLevels(niveauxSurco);
        return baseLevels;
    }, [allowSurco, niveauxSurco, baseLevels]);
    const showSurcoColumns = allowSurco !== false && surcoLevels.length > 0;
    const useSeparateColumns = showSurcoColumns && separateSets;
    const combinedLevels = useMemo(() => {
        const map = new Map();
        for (const lv of baseLevels || []) map.set(lv.id, lv);
        if (showSurcoColumns) {
            for (const lv of surcoLevels || []) map.set(lv.id, lv);
        }
        return Array.from(map.values());
    }, [baseLevels, surcoLevels, showSurcoColumns]);
    const effectiveBaseLevels = baseLevels.length ? baseLevels : combinedLevels;
    const effectiveSurcoLevels = showSurcoColumns
        ? (surcoLevels.length ? surcoLevels : effectiveBaseLevels)
        : [];

    // ===== base data
    const catsBase = useMemo(
        () => (categoriesByModule.get(module.id) || [])
            .slice()
            .sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || a.code.localeCompare(b.code)),
        [categoriesByModule, module.id]
    );

    const membresRows = useMemo(
        () => (membres || [])
            .filter((m) => m.groupe_id === group.id)
            .sort((a, b) => (a.ordre || 1e9) - (b.ordre || 1e9)),
        [membres, group.id]
    );

    const valMapInitial = useMemo(() => {
        const m = new Map();
        for (const v of gvaleurs || []) {
            if (v.groupe_id !== group.id) continue;
            m.set(`${v.act_id}::${v.niveau_id}::${v.kind}`, coerceCellValue(v));
        }
        return m;
    }, [gvaleurs, group.id]);

    const toValObj = (actId, nivId, kind) =>
        valMapInitial.get(`${actId}::${nivId}::${kind}`) || coerceCellValue();

    // ===== local UI state
    const initialCatOrder = useMemo(() => {
        const stored = Array.isArray(group?.cat_order) ? group.cat_order : [];
        if (stored.length === 0) return catsBase.map((c) => c.id);
        const byId = new Set(catsBase.map((c) => c.id));
        return stored.filter((id) => byId.has(id)).concat(catsBase.filter((c) => !stored.includes(c.id)).map(c => c.id));
    }, [catsBase, group?.cat_order]);

    const [catOrder, setCatOrder] = useState(initialCatOrder);
    useEffect(() => setCatOrder(initialCatOrder), [initialCatOrder]);

    const [actOrder, setActOrder] = useState(() => membresRows.map((m) => m.act_id));
    useEffect(() => setActOrder(membresRows.map((m) => m.act_id)), [membresRows]);

    const [valuesByAct, setValuesByAct] = useState(() => {
        const out = {};
        for (const m of membresRows) {
            const aId = m.act_id;
            out[aId] = out[aId] || {};
            for (const n of combinedLevels || []) {
                const base = toValObj(aId, n.id, 'base');
                const surc = toValObj(aId, n.id, 'surco');
                if ((base.value || base.expression || surc.value || surc.expression)) {
                    out[aId][n.id] = { baseVal: base, surcoVal: surc };
                }
            }
        }
        return out;
    });
    useEffect(() => {
        const next = {};
        for (const m of membresRows) {
            const aId = m.act_id;
            next[aId] = next[aId] || {};
            for (const n of combinedLevels || []) {
                const base = toValObj(aId, n.id, 'base');
                const surc = toValObj(aId, n.id, 'surco');
                if ((base.value || base.expression || surc.value || surc.expression)) {
                    next[aId][n.id] = { baseVal: base, surcoVal: surc };
                }
            }
        }
        setValuesByAct(next);
    }, [valMapInitial, membresRows, combinedLevels]);

    const membersSet = useMemo(() => new Set(membresRows.map((m) => m.act_id)), [membresRows]);

    const baseHeaderItems = effectiveBaseLevels.length ? effectiveBaseLevels : [null];
    const surcoHeaderItems = effectiveSurcoLevels.length ? effectiveSurcoLevels : [null];
    const totalColumns = useSeparateColumns
        ? 1 + baseHeaderItems.length + (showSurcoColumns ? surcoHeaderItems.length : 0)
        : 1 + baseHeaderItems.length * (showSurcoColumns ? 2 : 1);
    const safeLabel = (lvl, fallback) => lvl?.libelle || lvl?.code || fallback || '—';
    const colDefs = useMemo(() => {
        const defs = [{ key: 'garantie', style: { width: '260px' } }];
        const addValueCol = (key) => defs.push({ key, style: { width: '160px' } });

        if (useSeparateColumns) {
            baseHeaderItems.forEach((lvl, idx) => addValueCol(`base-${lvl?.id || idx}`));
            if (showSurcoColumns) {
                surcoHeaderItems.forEach((lvl, idx) => addValueCol(`surco-${lvl?.id || idx}`));
            }
        } else {
            baseHeaderItems.forEach((lvl, idx) => {
                addValueCol(`base-${lvl?.id || idx}`);
                if (showSurcoColumns) addValueCol(`surco-${lvl?.id || idx}`);
            });
        }
        return defs;
    }, [baseHeaderItems, surcoHeaderItems, useSeparateColumns, showSurcoColumns]);

    const getPair = (actId, levelId) => {
        if (!levelId) return { baseVal: {}, surcoVal: {} };
        return valuesByAct?.[actId]?.[levelId] || { baseVal: {}, surcoVal: {} };
    };


    // ===== actions (si editable)
    function findActCategory(actId) {
        for (const c of catsBase) {
            const acts = actsByCategory.get(c.id) || [];
            if (acts.some((a) => a.id === actId)) return c.id;
        }
        return null;
    }
    function visibleActsInCat(catId, order) {
        const acts = (actsByCategory.get(catId) || []).filter((a) => membersSet.has(a.id));
        return acts
            .slice()
            .sort((a, b) => {
                const oa = order.indexOf(a.id);
                const ob = order.indexOf(b.id);
                if (oa !== ob) return oa - ob;
                const ra = a.ordre || 0, rb = b.ordre || 0;
                return (ra - rb) || a.code.localeCompare(b.code);
            })
            .map((a) => a.id);
    }
    function moveCategory(catId, dir) {
        if (!editable) return;
        setCatOrder((prev) => {
            const idx = prev.indexOf(catId);
            const tgt = dir === 'up' ? idx - 1 : idx + 1;
            if (idx < 0 || tgt < 0 || tgt >= prev.length) return prev;
            const arr = prev.slice();
            [arr[idx], arr[tgt]] = [arr[tgt], arr[idx]];
            return arr;
        });
    }
    function moveAct(actId, dir) {
        if (!editable) return;
        setActOrder((prev) => {
            const idx = prev.indexOf(actId);
            if (idx < 0) return prev;
            const catId = findActCategory(actId);
            if (!catId) return prev;
            const actsInCat = visibleActsInCat(catId, prev);
            const posInCat = actsInCat.indexOf(actId);
            const tgtInCat = dir === 'up' ? posInCat - 1 : posInCat + 1;
            if (posInCat < 0 || tgtInCat < 0 || tgtInCat >= actsInCat.length) return prev;
            const a = prev.indexOf(actsInCat[posInCat]);
            const b = prev.indexOf(actsInCat[tgtInCat]);
            const arr = prev.slice();
            [arr[a], arr[b]] = [arr[b], arr[a]];
            return arr;
        });
    }

    // edition cellule (typed values)
    const [editing, setEditing] = useState(null); // { actId, nivId, kind, draft, meta }
    const handleDraftChange = (next) => {
        setEditing((prev) =>
            prev
                ? {...prev, draft: next}
                : prev
        );
    };

    function startEdit(act, level, kind) {
        if (!editable) return;
        const actId = act?.id;
        const nivId = level?.id;
        if (!actId || !nivId) return;
        const pair = getPair(actId, nivId);
        const current = (kind === 'base' ? pair.baseVal : pair.surcoVal) || {};
        const actLabel = act?.libelle || act?.code || '—';
        const levelLabel = safeLabel(level, 'Niveau');
        setEditing({
            actId,
            nivId,
            kind,
            draft: coerceCellValue(current),
            meta: {
                actLabel,
                levelLabel,
                kindLabel: kind === 'base' ? 'Base' : 'Surco',
            },
        });
    }
    function saveEdit() {
        if (!editing) return;
        const { actId, nivId, kind, draft } = editing;
        const payload = coerceCellValue(draft || {});
        setValuesByAct((prev) => {
            const next = { ...(prev || {}) };
            next[actId] = next[actId] || {};
            next[actId][nivId] = next[actId][nivId] || { baseVal: {}, surcoVal: {} };
            const key = kind === 'base' ? 'baseVal' : 'surcoVal';
            next[actId][nivId][key] = payload;
            return next;
        });
        setEditing(null);
    }
    function cancelEdit() { setEditing(null); }

    function renderCell({ key, act, level, kind }) {
        const actId = act?.id;
        const levelId = level?.id;
        const pair = getPair(actId, levelId);
        const valueKey = kind === 'base' ? 'baseVal' : 'surcoVal';
        const cellValue = pair?.[valueKey] || {};
        const isEditingCell =
            editable &&
            editing &&
            editing.actId === actId &&
            editing.nivId === levelId &&
            editing.kind === kind;
        const canEdit = editable && !!levelId;
        const highlight = isEditingCell ? 'bg-base-200/60' : '';

        return (
            <td
                key={key}
                className={`align-top text-center ${highlight}`}
                onDoubleClick={() => canEdit && startEdit(act, level, kind)}
                title={canEdit && editable ? 'Double-clique pour éditer' : ''}
            >
                <CellView v={cellValue} />
            </td>
        );
    }

    // ===== submit
    function submitAll() {
        if (!editable) return;

        const catOrderSelected = catOrder.slice();

        const displayActIds = [];
        for (const catId of catOrderSelected) {
            const ids = visibleActsInCat(catId, actOrder);
            displayActIds.push(...ids);
        }

        const orderByAct = {};
        displayActIds.forEach((id, i) => (orderByAct[id] = i + 1));

        onSave?.({ catOrderSelected, orderByAct, valuesByAct });
    }

    return (
        <div className="space-y-3">
            {/*{editable && (
                <div className="flex items-center justify-end gap-2">
                    {onCancel && <button type="button" className="btn" onClick={onCancel}>Fermer</button>}
                    <button type="button" className="btn btn-primary" onClick={submitAll}>Enregistrer la grille</button>
                </div>
            )}*/}

            <div className="overflow-x-auto">
                <table className="table table-fixed w-full">
                    <colgroup>
                        {colDefs.map((col) => (
                            <col key={col.key} style={col.style} />
                        ))}
                    </colgroup>
                    <thead>
                    {useSeparateColumns ? (
                        <>
                            <tr>
                                <th rowSpan={2} className="align-bottom" style={{ minWidth: 260 }}>Garantie</th>
                                <th colSpan={Math.max(1, baseHeaderItems.length)} className="text-center">Base</th>
                                {showSurcoColumns && (
                                    <th colSpan={Math.max(1, surcoHeaderItems.length)} className="text-center">
                                        Surcomplémentaire
                                    </th>
                                )}
                            </tr>
                            <tr>
                                {baseHeaderItems.map((lvl, idx) => (
                                    <th key={`base-${lvl?.id || idx}`} className="text-center">
                                        {safeLabel(lvl, `Base ${idx + 1}`)}
                                    </th>
                                ))}
                                {showSurcoColumns && surcoHeaderItems.map((lvl, idx) => (
                                    <th key={`surco-${lvl?.id || idx}`} className="text-center">
                                        {safeLabel(lvl, `Surco ${idx + 1}`)}
                                    </th>
                                ))}
                            </tr>
                        </>
                    ) : (
                        <>
                            <tr>
                                <th
                                    rowSpan={showSurcoColumns ? 2 : 1}
                                    className="align-bottom"
                                    style={{ minWidth: 260 }}
                                >
                                    Garantie
                                </th>
                                {baseHeaderItems.map((lvl, idx) => (
                                    <th
                                        key={`lvl-${lvl?.id || idx}`}
                                        colSpan={showSurcoColumns ? 2 : 1}
                                        className="text-center"
                                    >
                                        {safeLabel(lvl, `Niveau ${idx + 1}`)}
                                    </th>
                                ))}
                            </tr>
                            {showSurcoColumns && (
                                <tr>
                                    {baseHeaderItems.map((lvl, idx) => (
                                        <Fragment key={`sub-${lvl?.id || idx}`}>
                                            <th className="text-center">Base</th>
                                            <th className="text-center">Surco</th>
                                        </Fragment>
                                    ))}
                                </tr>
                            )}
                        </>
                    )}
                    </thead>

                    <tbody>
                    { catOrder.length === 0 && (
                        <tr><td colSpan={Math.max(1, totalColumns)} className="text-center opacity-60">—</td></tr>
                    )}

                    { (catOrder.map((id) => catsBase.find((c) => c.id === id)).filter(Boolean)).map((cat) => {
                        const actsRaw = actsByCategory.get(cat.id) || [];
                        const acts = actsRaw
                            .filter((a) => membersSet.has(a.id))
                            .sort((a, b) => {
                                const oa = actOrder.indexOf(a.id);
                                const ob = actOrder.indexOf(b.id);
                                if (oa !== ob) return oa - ob;
                                const ra = a.ordre || 0, rb = b.ordre || 0;
                                return (ra - rb) || a.code.localeCompare(b.code);
                            });

                        if (acts.length === 0) return null;

                        const isFirst = catOrder[0] === cat.id;
                        const isLast = catOrder[catOrder.length - 1] === cat.id;

                        return (
                            <Fragment key={cat.id}>
                                <tr className="bg-base-200">
                                    <th colSpan={Math.max(1, totalColumns)} className="text-left">
                                        <div className="flex items-center gap-2">
                                            {/*<span className="badge badge-outline">{cat.code}</span>*/}
                                            <span className="opacity-70">{cat.libelle || '—'}</span>
                                            {editable && (
                                                <div className="ml-auto join">
                                                    <button
                                                        className="btn btn-xs join-item"
                                                        disabled={isFirst}
                                                        onClick={() => moveCategory(cat.id, 'up')}
                                                        title="Monter la catégorie" aria-label="Monter la catégorie"
                                                    >▲</button>
                                                    <button
                                                        className="btn btn-xs join-item"
                                                        disabled={isLast}
                                                        onClick={() => moveCategory(cat.id, 'down')}
                                                        title="Descendre la catégorie" aria-label="Descendre la catégorie"
                                                    >▼</button>
                                                </div>
                                            )}
                                        </div>
                                    </th>
                                </tr>

                                {acts.map((a) => (
                                    <tr key={a.id}>
                                        <td className="table-pin-cols">
                                            <div className="flex items-center gap-2 w-full">
                                                <div className="flex-1 min-w-0">
                                                    {/*<div className="font-mono font-medium">{a.code}</div>*/}
                                                    <div className="opacity-70 truncate">{a.libelle || '—'}</div>
                                                </div>
                                                {editable && (
                                                    <div className="join">
                                                        <button className="btn btn-xs join-item" onClick={() => moveAct(a.id, 'up')}>▲</button>
                                                        <button className="btn btn-xs join-item" onClick={() => moveAct(a.id, 'down')}>▼</button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {useSeparateColumns ? (
                                            <>
                                                {baseHeaderItems.map((lvl, idx) =>
                                                    renderCell({
                                                        key: `row-${a.id}-base-${lvl?.id || idx}`,
                                                        act: a,
                                                        level: lvl,
                                                        kind: 'base',
                                                    })
                                                )}
                                                {showSurcoColumns && surcoHeaderItems.map((lvl, idx) =>
                                                    renderCell({
                                                        key: `row-${a.id}-surco-${lvl?.id || idx}`,
                                                        act: a,
                                                        level: lvl,
                                                        kind: 'surco',
                                                    })
                                                )}
                                            </>
                                        ) : (
                                            baseHeaderItems.map((lvl, idx) => (
                                                <Fragment key={`row-${a.id}-lvl-${lvl?.id || idx}`}>
                                                    {renderCell({
                                                        key: `row-${a.id}-lvl-${lvl?.id || idx}-base`,
                                                        act: a,
                                                        level: lvl,
                                                        kind: 'base',
                                                    })}
                                                    {showSurcoColumns && renderCell({
                                                        key: `row-${a.id}-lvl-${lvl?.id || idx}-surco`,
                                                        act: a,
                                                        level: lvl,
                                                        kind: 'surco',
                                                    })}
                                                </Fragment>
                                            ))
                                        )}
                                    </tr>
                                ))}
                            </Fragment>
                        );
                    })}
                    </tbody>
                </table>
            </div>

            {editable && (
                <div className="flex items-center justify-end gap-2">
                    {onCancel && <button type="button" className="btn" onClick={onCancel}>Fermer</button>}
                    <button type="button" className="btn btn-primary" onClick={submitAll}>Enregistrer la grille</button>
                </div>
            )}

            {editing && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-3xl">
                        <h3 className="font-bold text-lg">
                            {editing.meta?.actLabel || 'Garantie'} — {editing.meta?.levelLabel || 'Niveau'}
                            <span className="badge badge-sm ml-2">{editing.meta?.kindLabel || ''}</span>
                        </h3>
                        <p className="opacity-70 text-sm mb-4">
                            Ajuste les champs ci-dessous puis enregistre pour persister la valeur dans le référentiel local.
                        </p>
                        <ValueEditorTyped
                            value={editing.draft}
                            onChange={handleDraftChange}
                        />
                        <div className="modal-action">
                            <button type="button" className="btn" onClick={cancelEdit}>Annuler</button>
                            <button type="button" className="btn btn-primary" onClick={saveEdit}>Enregistrer</button>
                        </div>
                    </div>
                    <button className="modal-backdrop" aria-label="Fermer la fenêtre" onClick={cancelEdit} />
                </div>
            )}
        </div>
    );
}
