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
                                                optionsEnabled = false,
                                                optionLevels = [],
                                                allowSubItems = false,
                                                subItemsMap = new Map(),
                                                onAddSubItem,
                                                onRemoveSubItem,
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

    const ensureEntry = (store, actId, levelId) => {
        if (!actId || !levelId) return null;
        store[actId] = store[actId] || {};
        store[actId][levelId] = store[actId][levelId] || { baseVal: {}, options: {}, surcoVal: {} };
        if (!store[actId][levelId].options) store[actId][levelId].options = {};
        return store[actId][levelId];
    };

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
            for (const n of combinedLevels || []) {
                ensureEntry(out, m.act_id, n.id);
            }
        }
        for (const v of gvaleurs || []) {
            if (v.groupe_id !== group.id) continue;
            const entry = ensureEntry(out, v.act_id, v.niveau_id);
            if (!entry) continue;
            const kind = String(v.kind || 'base').toLowerCase();
            if (kind === 'base') {
                entry.baseVal = coerceCellValue(v);
            } else if (kind === 'surco') {
                entry.surcoVal = coerceCellValue(v);
            } else if (kind.startsWith('option-')) {
                const optionId = kind.slice('option-'.length);
                if (optionId) {
                    entry.options = entry.options || {};
                    entry.options[optionId] = coerceCellValue(v);
                }
            }
        }
        return out;
    });
    useEffect(() => {
        const next = {};
        for (const m of membresRows) {
            for (const n of combinedLevels || []) {
                ensureEntry(next, m.act_id, n.id);
            }
        }
        for (const v of gvaleurs || []) {
            if (v.groupe_id !== group.id) continue;
            const entry = ensureEntry(next, v.act_id, v.niveau_id);
            if (!entry) continue;
            const kind = String(v.kind || 'base').toLowerCase();
            if (kind === 'base') {
                entry.baseVal = coerceCellValue(v);
            } else if (kind === 'surco') {
                entry.surcoVal = coerceCellValue(v);
            } else if (kind.startsWith('option-')) {
                const optionId = kind.slice('option-'.length);
                if (optionId) {
                    entry.options = entry.options || {};
                    entry.options[optionId] = coerceCellValue(v);
                }
            }
        }
        setValuesByAct(next);
    }, [gvaleurs, group.id, membresRows, combinedLevels]);

    const membersSet = useMemo(() => new Set(membresRows.map((m) => m.act_id)), [membresRows]);

    const baseHeaderItems = baseLevels.length ? baseLevels : combinedLevels;
    const surcoHeaderItems = useSeparateColumns
        ? (surcoLevels.length ? surcoLevels : baseHeaderItems)
        : baseHeaderItems;

    const valueColumns = useMemo(() => {
        const cols = [];
        baseHeaderItems.forEach((lvl, idx) => {
            cols.push({ key: `base-${lvl?.id || idx}`, kind: 'base', level: lvl });
            if (optionsEnabled) {
                cols.push({ key: `opt-${lvl?.id || idx}`, kind: 'option', level: lvl, optionLevelId: lvl?.id });
            }
            if (!useSeparateColumns && showSurcoColumns) {
                cols.push({ key: `surco-${lvl?.id || idx}`, kind: 'surco', level: lvl });
            }
        });
        if (useSeparateColumns && showSurcoColumns) {
            surcoHeaderItems.forEach((lvl, idx) => {
                cols.push({ key: `surco-sep-${lvl?.id || idx}`, kind: 'surco', level: lvl });
            });
        }
        return cols;
    }, [baseHeaderItems, surcoHeaderItems, optionsEnabled, showSurcoColumns, useSeparateColumns]);

    const colDefs = useMemo(() => {
        return [
            { key: 'garantie', style: { width: '260px' } },
            ...valueColumns.map((col) => ({ key: col.key, style: { width: '160px' } })),
        ];
    }, [valueColumns]);

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

    const [editing, setEditing] = useState(null);

    function getPair(actId, levelId) {
        if (!actId || !levelId) return { baseVal: {}, options: {}, surcoVal: {} };
        return valuesByAct?.[actId]?.[levelId] || { baseVal: {}, options: {}, surcoVal: {} };
    }

    function startEdit(act, level, columnKind, optionLevelId = null) {
        if (!editable) return;
        const actId = act?.id;
        const levelId = level?.id;
        if (!actId || !levelId) return;
        const pair = getPair(actId, levelId);
        let current;
        if (columnKind === 'base') current = pair.baseVal;
        else if (columnKind === 'surco') current = pair.surcoVal;
        else current = (pair.options || {})[optionLevelId || levelId] || {};

        const actLabel = act?.libelle || act?.code || '—';
        const levelLabel = level?.libelle || level?.code || 'Niveau';
        const kindLabel = columnKind === 'base' ? 'Base' : columnKind === 'surco' ? 'Surco' : 'Option';

        setEditing({
            actId,
            nivId: levelId,
            columnKind,
            optionLevelId: optionLevelId || levelId,
            draft: coerceCellValue(current),
            meta: { actLabel, levelLabel, kindLabel },
        });
    }

    function saveEdit() {
        if (!editing) return;
        const { actId, nivId, columnKind, optionLevelId, draft } = editing;
        const payload = coerceCellValue(draft || {});
        setValuesByAct((prev) => {
            const next = { ...(prev || {}) };
            next[actId] = next[actId] || {};
            const entry = next[actId][nivId] || { baseVal: {}, options: {}, surcoVal: {} };
            if (!entry.options) entry.options = {};
            if (columnKind === 'base') entry.baseVal = payload;
            else if (columnKind === 'surco') entry.surcoVal = payload;
            else if (optionLevelId) entry.options[optionLevelId] = payload;
            next[actId][nivId] = entry;
            return next;
        });
        setEditing(null);
    }

    function cancelEdit() { setEditing(null); }

    function renderCell({ key, act, level, columnKind }) {
        const actId = act?.id;
        const levelId = level?.id;
        const optionKey = levelId;
        const pair = getPair(actId, levelId);
        let cellValue;
        if (columnKind === 'base') cellValue = pair.baseVal;
        else if (columnKind === 'surco') cellValue = pair.surcoVal;
        else cellValue = (pair.options || {})[optionKey] || {};

        const isEditingCell =
            editable &&
            editing &&
            editing.actId === actId &&
            editing.nivId === levelId &&
            editing.columnKind === columnKind &&
            (columnKind !== 'option' || editing.optionLevelId === optionKey);

        const canEdit = editable && !!actId && !!levelId;
        const highlight = isEditingCell ? 'bg-base-200/60' : '';

        return (
            <td
                key={key}
                className={`align-top text-center ${highlight}`}
                onDoubleClick={() => canEdit && startEdit(act, level, columnKind, optionKey)}
                title={canEdit && editable ? 'Double-clique pour éditer' : ''}
            >
                <CellView v={cellValue} />
            </td>
        );
    }

    const hasSubHeader = true;

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
                                <th colSpan={baseHeaderItems.length * (optionsEnabled ? 2 : 1)} className="text-center">Base</th>
                                {showSurcoColumns && (
                                    <th colSpan={surcoHeaderItems.length} className="text-center">Surcomplémentaire</th>
                                )}
                            </tr>
                            <tr>
                                {baseHeaderItems.map((lvl, idx) => (
                                    <Fragment key={`head-base-${lvl?.id || idx}`}>
                                        <th className="text-center">{safeLevelLabel(lvl)}</th>
                                        {optionsEnabled && (
                                            <th className="text-center">Option {safeLevelLabel(lvl)}</th>
                                        )}
                                    </Fragment>
                                ))}
                                {showSurcoColumns && surcoHeaderItems.map((lvl, idx) => (
                                    <th key={`head-surco-${lvl?.id || idx}`} className="text-center">{safeLevelLabel(lvl)}</th>
                                ))}
                            </tr>
                        </>
                    ) : (
                        <>
                            <tr>
                                <th rowSpan={2} className="align-bottom" style={{ minWidth: 260 }}>Garantie</th>
                                {baseHeaderItems.map((lvl, idx) => (
                                    <th
                                        key={`head-combined-${lvl?.id || idx}`}
                                        colSpan={1 + (optionsEnabled ? 1 : 0) + (showSurcoColumns ? 1 : 0)}
                                        className="text-center"
                                    >
                                        {safeLevelLabel(lvl)}
                                    </th>
                                ))}
                            </tr>
                            <tr>
                                {baseHeaderItems.map((lvl, idx) => (
                                    <Fragment key={`head-sub-${lvl?.id || idx}`}>
                                        <th className="text-center">Base</th>
                                        {optionsEnabled && <th className="text-center">Option</th>}
                                        {showSurcoColumns && <th className="text-center">Surco</th>}
                                    </Fragment>
                                ))}
                            </tr>
                        </>
                    )}
                    </thead>

                    <tbody>
                    { catOrder.length === 0 && (
                        <tr><td colSpan={colDefs.length} className="text-center opacity-60">—</td></tr>
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
                                    <th colSpan={colDefs.length} className="text-left">
                                        <div className="flex items-center gap-2">
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

                                {acts.map((a) => {
                                    const subRows = subItemsMap?.get(a.id) || [];
                                    return (
                                        <Fragment key={a.id}>
                                            <tr>
                                                <td className="table-pin-cols">
                                                    <div className="flex items-center gap-2 w-full">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="opacity-70 truncate">{a.libelle || '—'}</div>
                                                        </div>
                                                        {allowSubItems && editable && (
                                                            <div className="join">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-xs btn-ghost join-item"
                                                                    onClick={() => onAddSubItem?.({ act: a })}
                                                                    title="Ajouter un sous-item"
                                                                >
                                                                    + Sous-item
                                                                </button>
                                                            </div>
                                                        )}
                                                        {editable && (
                                                            <div className="join">
                                                                <button className="btn btn-xs join-item" onClick={() => moveAct(a.id, 'up')}>▲</button>
                                                                <button className="btn btn-xs join-item" onClick={() => moveAct(a.id, 'down')}>▼</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {valueColumns.map((col) =>
                                                    renderCell({
                                                        key: `${a.id}-${col.key}`,
                                                        act: a,
                                                        level: col.level,
                                                        columnKind: col.kind,
                                                    })
                                                )}
                                            </tr>

                                            {subRows.map((sub) => (
                                                <tr key={sub.id}>
                                                    <td className="table-pin-cols pl-8">
                                                        <div className="flex items-center gap-2 w-full">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="opacity-70 truncate">↳ {sub.libelle}</div>
                                                            </div>
                                                            {allowSubItems && editable && (
                                                                <div className="join">
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-xs btn-ghost join-item"
                                                                        onClick={() => onAddSubItem?.({ act: a, subItem: sub })}
                                                                        title="Modifier ce sous-item"
                                                                    >
                                                                        Modifier
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-xs btn-ghost text-error join-item"
                                                                        onClick={() => onRemoveSubItem?.(sub.id)}
                                                                        title="Supprimer ce sous-item"
                                                                    >
                                                                        Supprimer
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    {valueColumns.map((col) =>
                                                        renderCell({
                                                            key: `${sub.id}-${col.key}`,
                                                            act: {...a, id: sub.id, libelle: sub.libelle, isSubItem: true},
                                                            level: col.level,
                                                            columnKind: col.kind,
                                                        })
                                                    )}
                                                </tr>
                                            ))}
                                        </Fragment>
                                    );
                                })}
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
                            onChange={(next) => setEditing((prev) => prev ? ({ ...prev, draft: next }) : prev)}
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

function safeLevelLabel(level, fallback) {
    if (!level) return fallback || 'Niveau';
    return level.libelle || level.code || fallback || 'Niveau';
}
