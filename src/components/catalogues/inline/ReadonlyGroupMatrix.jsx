'use client';

import {Fragment, useEffect, useMemo, useState} from 'react';
import ValueEditorTyped from '@/components/catalogues/inline/ValueEditorTyped';
import {coerceCellValue} from '@/lib/utils/CatalogueInline';
import {isUngroupedCategoryId} from "@/lib/utils/categoryUtils";

const DEP_OPERATOR_SYMBOL = {
    add: '+',
    sub: '−',
    mul: '×',
    div: '÷',
};

const numberOrNull = (input) => {
    if (input === '' || input === null || input === undefined) return null;
    const num = Number(input);
    return Number.isFinite(num) ? num : null;
};

const applyOperator = (operator, a, b) => {
    if (a === null || b === null) return null;
    switch (operator) {
        case 'sub':
            return a - b;
        case 'mul':
            return a * b;
        case 'div':
            if (b === 0) return null;
            return a / b;
        case 'add':
        default:
            return a + b;
    }
};

const formatFormulaDescription = (dep, actLookup) => {
    if (!dep || dep.mode !== 'formula' || !Array.isArray(dep.operands)) return '';
    const symbol = DEP_OPERATOR_SYMBOL[dep.operator] || '+';
    const parts = dep.operands.map((op) => {
        const act = actLookup.get(op.act_id);
        return act?.libelle || act?.code || op.act_id;
    });
    return parts.join(` ${symbol} `);
};

const formatNumber = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '';
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    return Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.00$/, '');
};

const parseNumericFromInput = (input) => {
    if (typeof input === 'number' && Number.isFinite(input)) return input;
    if (typeof input === 'string') {
        const sanitized = input.replace(',', '.');
        const match = sanitized.match(/-?\d+(?:\.\d+)?/);
        if (match) return Number(match[0]);
    }
    return null;
};

const extractSuffixFromValue = (value) => {
    if (typeof value !== 'string') return '';
    const sanitized = value.replace(',', '.');
    const match = sanitized.match(/-?\d+(?:\.\d+)?/);
    if (!match) return value.trim();
    const idx = sanitized.indexOf(match[0]);
    if (idx === -1) return value.trim();
    const suffix = sanitized.slice(idx + match[0].length).trim();
    return suffix;
};

function CellView({v, dependencyText}) {
    const hasV = (v?.value || '').trim().length > 0;
    const hasE = (v?.expression || '').trim().length > 0;
    const minHint = v?.data?.min_hint;
    const maxHint = v?.data?.max_hint;
    if (!hasV && !hasE && !minHint && !maxHint && !dependencyText) return <span className="opacity-40">—</span>;
    return (
        <div className="min-h-8">
            {hasV && <div className="font-mono text-sm break-words">{v.value}</div>}
            {hasE && <div className="text-xs opacity-70 break-words" title={v.expression}>{v.expression}</div>}
            {(minHint || maxHint) && (
                <div className="text-xs opacity-60 mt-1 space-y-0.5">
                    {minHint && <div>Min : {minHint}</div>}
                    {maxHint && <div>Max : {maxHint}</div>}
                </div>
            )}
            {dependencyText && (
                <div className="text-xs text-primary mt-1">{dependencyText}</div>
            )}
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
                                                categoryGroups = {},
                                                membres,
                                                gvaleurs,
                                                onSave,
                                                onCancel,
                                                onAddCategoryLabel,
                                                onEditCategoryLabel,
                                                onDeleteCategoryLabel,
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
        store[actId][levelId] = store[actId][levelId] || {baseVal: {}, options: {}, surcoVal: {}};
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

    const fallbackLevelId = combinedLevels?.[0]?.id || null;

    const getCellForDependency = (dep) => {
        if (!dep || !dep.act_id) return null;
        const perAct = valuesByAct?.[dep.act_id];
        if (!perAct) return null;
        const levelId = dep.niveau_id || fallbackLevelId;
        if (!levelId) return null;
        const entry = perAct[levelId];
        if (!entry) return null;
        if (dep.kind === 'surco') return entry.surcoVal;
        if (dep.kind === 'option') {
            const optId = dep.option_level_id || levelId;
            return entry.options?.[optId];
        }
        return entry.baseVal;
    };

    const cloneCellValue = (cell) => {
        if (!cell) return null;
        return {
            ...cell,
            data: cell.data ? {...cell.data} : undefined,
        };
    };

    const extractNumbersFromCell = (cell) => {
        if (!cell) return {value: null, min: null, max: null, suffix: ''};
        const data = cell.data || {};
        const preferredFields = ['amount', 'montant', 'value_numeric', 'valeur', 'percent', 'taux'];
        let value = null;
        for (const field of preferredFields) {
            const num = parseNumericFromInput(data[field]);
            if (num !== null) {
                value = num;
                break;
            }
        }
        if (value === null) value = parseNumericFromInput(cell.value);
        const suffix = value !== null ? extractSuffixFromValue(cell.value || '') : '';
        const min = parseNumericFromInput(data.min_hint);
        const max = parseNumericFromInput(data.max_hint);
        return {value, min, max, suffix};
    };

    const getNumbersForOperand = (operand) => {
        if (!operand) return {value: null, min: null, max: null, suffix: ''};
        const manualValue = numberOrNull(operand.value);
        const manualMin = numberOrNull(operand.min);
        const manualMax = numberOrNull(operand.max);
        const sourceCell = getCellForDependency(operand);
        const fromCell = extractNumbersFromCell(sourceCell);
        return {
            value: manualValue ?? fromCell.value,
            min: manualMin ?? fromCell.min,
            max: manualMax ?? fromCell.max,
            suffix: fromCell.suffix,
            cell: sourceCell,
        };
    };

    const evaluateFormulaDependency = (dep) => {
        if (!dep || dep.mode !== 'formula') return null;
        const operandNumbers = (dep.operands || []).map((operand) => getNumbersForOperand(operand));
        if (!operandNumbers.length) return null;
        let accValue = operandNumbers[0].value;
        let accMin = operandNumbers[0].min ?? operandNumbers[0].value ?? null;
        let accMax = operandNumbers[0].max ?? operandNumbers[0].value ?? null;
        for (let i = 1; i < operandNumbers.length; i++) {
            const operand = operandNumbers[i];
            accValue = applyOperator(dep.operator, accValue, operand.value);
            const operandMin = operand.min ?? operand.value ?? null;
            const operandMax = operand.max ?? operand.value ?? null;
            accMin = applyOperator(dep.operator, accMin, operandMin);
            accMax = applyOperator(dep.operator, accMax, operandMax);
        }
        const suffix = operandNumbers.find((op) => op.suffix)?.suffix || '';
        return {value: accValue, min: accMin, max: accMax, suffix};
    };

    const actLookup = useMemo(() => {
        const map = new Map();
        for (const [, list] of actsByCategory.entries()) {
            for (const act of list) map.set(act.id, act);
        }
        return map;
    }, [actsByCategory]);

    const dependencyActOptions = useMemo(() => {
        const seen = new Set();
        const options = [];
        for (const row of membresRows) {
            if (seen.has(row.act_id)) continue;
            seen.add(row.act_id);
            const act = actLookup.get(row.act_id);
            if (!act) continue;
            const label = [act.code, act.libelle].filter(Boolean).join(' — ') || act.id;
            options.push({value: act.id, label});
        }
        return options;
    }, [membresRows, actLookup]);

    const dependencyLevelOptions = useMemo(
        () => (combinedLevels || []).map((lvl) => ({value: lvl.id, label: safeLevelLabel(lvl)})),
        [combinedLevels]
    );

    const baseHeaderItems = baseLevels.length ? baseLevels : combinedLevels;
    const surcoHeaderItems = useSeparateColumns
        ? (surcoLevels.length ? surcoLevels : baseHeaderItems)
        : baseHeaderItems;

    const valueColumns = useMemo(() => {
        const cols = [];
        baseHeaderItems.forEach((lvl, idx) => {
            cols.push({key: `base-${lvl?.id || idx}`, kind: 'base', level: lvl});
            if (optionsEnabled) {
                cols.push({key: `opt-${lvl?.id || idx}`, kind: 'option', level: lvl, optionLevelId: lvl?.id});
            }
            if (!useSeparateColumns && showSurcoColumns) {
                cols.push({key: `surco-${lvl?.id || idx}`, kind: 'surco', level: lvl});
            }
        });
        if (useSeparateColumns && showSurcoColumns) {
            surcoHeaderItems.forEach((lvl, idx) => {
                cols.push({key: `surco-sep-${lvl?.id || idx}`, kind: 'surco', level: lvl});
            });
        }
        return cols;
    }, [baseHeaderItems, surcoHeaderItems, optionsEnabled, showSurcoColumns, useSeparateColumns]);

    const colDefs = useMemo(() => {
        return [
            {key: 'garantie', style: {width: '260px'}},
            ...valueColumns.map((col) => ({key: col.key, style: {width: '160px'}})),
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
        if (!actId || !levelId) return {baseVal: {}, options: {}, surcoVal: {}};
        return valuesByAct?.[actId]?.[levelId] || {baseVal: {}, options: {}, surcoVal: {}};
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
            meta: {actLabel, levelLabel, kindLabel},
        });
    }

    function saveEdit() {
        if (!editing) return;
        const {actId, nivId, columnKind, optionLevelId, draft} = editing;
        const payload = coerceCellValue(draft || {});
        setValuesByAct((prev) => {
            const next = {...(prev || {})};
            next[actId] = next[actId] || {};
            const entry = next[actId][nivId] || {baseVal: {}, options: {}, surcoVal: {}};
            if (!entry.options) entry.options = {};
            if (columnKind === 'base') entry.baseVal = payload;
            else if (columnKind === 'surco') entry.surcoVal = payload;
            else if (optionLevelId) entry.options[optionLevelId] = payload;
            next[actId][nivId] = entry;
            return next;
        });
        setEditing(null);
    }

    function cancelEdit() {
        setEditing(null);
    }

    function renderCell({key, act, level, columnKind, optionLevelId = null}) {
        const actId = act?.id;
        const levelId = level?.id;
        const optionKey = optionLevelId || levelId;
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
        let dependencyText = null;
        let displayValue = cellValue;
        const depends = cellValue?.depends_on;
        if (depends) {
            if (depends.mode === 'formula') {
                const evalResult = evaluateFormulaDependency(depends);
                if (evalResult) {
                    const suffix = evalResult.suffix ? ` ${evalResult.suffix}` : '';
                    const nextData = {...(displayValue?.data || {})};
                    if (evalResult.min != null) nextData.min_hint = `${formatNumber(evalResult.min)}${suffix}`;
                    if (evalResult.max != null) nextData.max_hint = `${formatNumber(evalResult.max)}${suffix}`;
                    displayValue = {
                        ...displayValue,
                        value: evalResult.value != null ? `${formatNumber(evalResult.value)}${suffix}` : displayValue?.value,
                        data: nextData,
                    };
                }
                const desc = formatFormulaDescription(depends, actLookup);
                dependencyText = desc ? `↪ Formule (${desc})` : '↪ Formule';
            } else if (depends.mode === 'percent') {
                const source = getNumbersForOperand(depends);
                if (source.value != null && depends.percent != null) {
                    const computed = (source.value * depends.percent) / 100;
                    const suffix = source.suffix ? ` ${source.suffix}` : '';
                    const nextData = {...(displayValue?.data || {})};
                    if (source.min != null) nextData.min_hint = `${formatNumber((source.min * depends.percent) / 100)}${suffix}`;
                    if (source.max != null) nextData.max_hint = `${formatNumber((source.max * depends.percent) / 100)}${suffix}`;
                    displayValue = {
                        ...displayValue,
                        value: `${formatNumber(computed)}${suffix}`,
                        data: nextData,
                    };
                }
                const target = actLookup.get(depends.act_id);
                const targetLabel = target?.libelle || target?.code || depends.act_id;
                dependencyText = `↪ ${depends.percent ?? ''}% de ${targetLabel}`.trim();
            } else {
                const sourceCell = cloneCellValue(getCellForDependency(depends));
                if (sourceCell) displayValue = sourceCell;
                const target = actLookup.get(depends.act_id);
                const targetLabel = target?.libelle || target?.code || depends.act_id;
                dependencyText = `↪ dépend de ${targetLabel}`;
            }
        }

        return (
            <td
                key={key}
                className={`align-top text-center ${highlight}`}
                onDoubleClick={() => canEdit && startEdit(act, level, columnKind, optionKey)}
                title={canEdit && editable ? 'Double-clique pour éditer' : ''}
            >
                <CellView v={displayValue} dependencyText={dependencyText}/>
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

        onSave?.({catOrderSelected, orderByAct, valuesByAct});
    }

    return (
        <div className="space-y-3">
            <div className="overflow-x-auto">
                <table className="table table-fixed w-full">
                    <colgroup>
                        {colDefs.map((col) => (
                            <col key={col.key} style={col.style}/>
                        ))}
                    </colgroup>
                    <thead>
                    {useSeparateColumns ? (
                        <>
                            <tr>
                                <th rowSpan={2} className="align-bottom" style={{minWidth: 260}}>Garantie</th>
                                <th colSpan={baseHeaderItems.length * (optionsEnabled ? 2 : 1)}
                                    className="text-center">Base
                                </th>
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
                                    <th key={`head-surco-${lvl?.id || idx}`}
                                        className="text-center">{safeLevelLabel(lvl)}</th>
                                ))}
                            </tr>
                        </>
                    ) : (
                        <>
                            <tr>
                                <th rowSpan={2} className="align-bottom" style={{minWidth: 260}}>Garantie</th>
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
                    {catOrder.length === 0 && (
                        <tr>
                            <td colSpan={colDefs.length} className="text-center opacity-60">—</td>
                        </tr>
                    )}

                    {(catOrder.map((id) => catsBase.find((c) => c.id === id)).filter(Boolean)).map((cat) => {
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

                        const canAddLabel = typeof onAddCategoryLabel === 'function' && editable;
                        const catLabels = Array.isArray(categoryGroups?.[cat.id]) ? categoryGroups[cat.id] : [];
                        const labelBuckets = catLabels
                            .map((label) => ({
                                label,
                                acts: acts.filter(
                                    (act) => Array.isArray(label.actIds) && label.actIds.includes(act.id)
                                ),
                            }))
                            .filter((bucket) => bucket.acts.length > 0);
                        const labeledSet = new Set(
                            labelBuckets.flatMap((bucket) => bucket.acts.map((act) => act.id))
                        );
                        const freeActs = acts.filter((act) => !labeledSet.has(act.id));

                        const renderActRow = (act, options = {}) => {
                            const subRows = subItemsMap?.get(act.id) || [];
                            const indent = options.indent ? 'pl-12' : '';
                            return (
                                <Fragment key={`${act.id}-${indent || 'root'}`}>
                                    <tr>
                                        <td className={`table-pin-cols ${group?.nom === 'Sans groupe' ? 'py-1' : ''} ${indent}`}>
                                            <div
                                                className={`flex items-center gap-2 w-full ${group?.nom === 'Sans groupe' ? 'min-h-0' : ''}`}>
                                                <div
                                                    className={`flex-1 min-w-0 ${group?.nom === 'Sans groupe' ? 'text-xs' : ''}`}>
                                                    <div className="opacity-70 truncate">{act.libelle || '—'}</div>
                                                </div>
                                                <div className="join">
                                                    {allowSubItems && editable && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-xs btn-ghost join-item"
                                                            onClick={() => onAddSubItem?.({act})}
                                                            title="Ajouter un sous-item"
                                                        >
                                                            + Sous-item
                                                        </button>
                                                    )}
                                                    {editable && (
                                                        <>
                                                            <button className="btn btn-xs join-item"
                                                                    onClick={() => moveAct(act.id, 'up')}>▲
                                                            </button>
                                                            <button className="btn btn-xs join-item"
                                                                    onClick={() => moveAct(act.id, 'down')}>▼
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {valueColumns.map((col) =>
                                            renderCell({
                                                key: `${act.id}-${col.key}`,
                                                act,
                                                level: col.level,
                                                columnKind: col.kind,
                                                optionLevelId: col.optionLevelId,
                                            })
                                        )}
                                    </tr>

                                    {subRows.map((sub) => (
                                        <tr key={sub.id}>
                                            <td className={`table-pin-cols pl-8 ${indent ? 'pl-10' : ''}`}>
                                                <div className="flex items-center gap-2 w-full">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs opacity-70 truncate">{sub.libelle}</div>
                                                        {sub.description && (
                                                            <div className="text-[11px] opacity-60">{sub.description}</div>
                                                        )}
                                                    </div>
                                                    {allowSubItems && editable && (
                                                        <div className="join">
                                                            <button
                                                                type="button"
                                                                className="btn btn-xs btn-ghost join-item"
                                                                onClick={() =>
                                                                    onAddSubItem?.({
                                                                        act,
                                                                        subItem: sub,
                                                                    })
                                                                }
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
                                                    act: {
                                                        ...act,
                                                        id: sub.id,
                                                        libelle: sub.libelle,
                                                        isSubItem: true,
                                                    },
                                                    level: col.level,
                                                    columnKind: col.kind,
                                                    optionLevelId: col.optionLevelId,
                                                })
                                            )}
                                        </tr>
                                    ))}
                                </Fragment>
                            );
                        };
                        return (
                            <Fragment key={cat.id}>
                                {!(cat?.libelle === 'Sans groupe' && (cat.isVirtual || isUngroupedCategoryId(cat.id))) ? (
                                    <tr className="bg-base-200">
                                        <th colSpan={colDefs.length} className="text-left">
                                            <div className="flex items-center gap-2">
                                                <span className="opacity-70">{cat.libelle || '—'}</span>
                                                {canAddLabel && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-xs btn-outline"
                                                        onClick={() => onAddCategoryLabel?.(cat)}
                                                    >
                                                        + Groupe
                                                    </button>
                                                )}
                                                {editable && (
                                                    <div className="ml-auto join">
                                                        <button
                                                            className="btn btn-xs join-item"
                                                            disabled={isFirst}
                                                            onClick={() => moveCategory(cat.id, 'up')}
                                                            title="Monter la catégorie" aria-label="Monter la catégorie"
                                                        >▲
                                                        </button>
                                                        <button
                                                            className="btn btn-xs join-item"
                                                            disabled={isLast}
                                                            onClick={() => moveCategory(cat.id, 'down')}
                                                            title="Descendre la catégorie"
                                                            aria-label="Descendre la catégorie"
                                                        >▼
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </th>
                                    </tr>
                                ) : (
                                    <tr className="bg-base-200">
                                        <th colSpan={colDefs.length} className="text-left">
                                            <div className="flex items-center gap-2">
                                                {canAddLabel && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-xs btn-outline"
                                                        onClick={() => onAddCategoryLabel?.(cat)}
                                                    >
                                                        + Groupe
                                                    </button>
                                                )}
                                                <div className="flex-1 border-t border-base-200 my-1"/>

                                                {editable && (
                                                    <div className="join">
                                                        <button
                                                            className="btn btn-xs join-item"
                                                            disabled={isFirst}
                                                            onClick={() => moveCategory(cat.id, 'up')}
                                                            title="Monter la catégorie" aria-label="Monter la catégorie"
                                                        >▲
                                                        </button>
                                                        <button
                                                            className="btn btn-xs join-item"
                                                            disabled={isLast}
                                                            onClick={() => moveCategory(cat.id, 'down')}
                                                            title="Descendre la catégorie"
                                                            aria-label="Descendre la catégorie"
                                                        >▼
                                                        </button>
                                                    </div>
                                                )}

                                            </div>
                                        </th>
                                    </tr>
                                )}

                                {labelBuckets.map((bucket) => (
                                    <Fragment key={bucket.label.id}>
                                        <tr className="bg-base-100">
                                            <td colSpan={colDefs.length}>
                                                <div className="font-semibold text-sm flex items-center gap-2">
                                                    <span>{bucket.label.libelle}</span>
                                                    {/*<span className="badge badge-sm">
                                                        {bucket.acts.length} garantie{bucket.acts.length > 1 ? 's' : ''}
                                                    </span>*/}
                                                    {editable && (onEditCategoryLabel || onDeleteCategoryLabel) && (
                                                        <div className="ml-auto join">
                                                            {onEditCategoryLabel && (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-xs join-item"
                                                                    onClick={() => onEditCategoryLabel?.(cat, bucket.label)}
                                                                >
                                                                    ✎ Modifier
                                                                </button>
                                                            )}
                                                            {onDeleteCategoryLabel && (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-xs btn-error join-item"
                                                                    onClick={() => onDeleteCategoryLabel?.(cat, bucket.label)}
                                                                >
                                                                    Supprimer
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {bucket.acts.map((act) => renderActRow(act, {indent: true}))}
                                    </Fragment>
                                ))}

                                {freeActs.map((act) => renderActRow(act))}
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
                            Ajuste les champs ci-dessous puis enregistre pour persister la valeur dans le référentiel
                            local.
                        </p>
                        <ValueEditorTyped
                            value={editing.draft}
                            onChange={(next) => setEditing((prev) => prev ? ({...prev, draft: next}) : prev)}
                            dependencyOptions={dependencyActOptions.filter((opt) => opt.value !== editing.actId)}
                            dependencyLevelOptions={dependencyLevelOptions}
                            defaultLevelId={editing.nivId}
                        />
                        <div className="modal-action">
                            <button type="button" className="btn" onClick={cancelEdit}>Annuler</button>
                            <button type="button" className="btn btn-primary" onClick={saveEdit}>Enregistrer</button>
                        </div>
                    </div>
                    <button className="modal-backdrop" aria-label="Fermer la fenêtre" onClick={cancelEdit}/>
                </div>
            )}
        </div>
    );
}

function safeLevelLabel(level, fallback) {
    if (!level) return fallback || 'Niveau';
    return level.libelle || level.code || fallback || 'Niveau';
}
