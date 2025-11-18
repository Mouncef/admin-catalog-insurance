// utils/catalogueInline.js

import {normalizeDependency} from '@/lib/utils/dependency';

export function coerceCellValue(raw = {}) {
    const fallbackValue = raw?.value ?? raw?.commentaire ?? '';
    const value =
        typeof fallbackValue === 'number'
            ? String(fallbackValue)
            : String(fallbackValue || '');
    const expression = raw?.expression ?? '';
    const type = raw?.type || raw?.value_type || 'free_text';

    const dataSource = raw?.data_json || raw?.data;
    let data =
        dataSource && typeof dataSource === 'object'
            ? {...dataSource}
            : undefined;

    if (!data || Object.keys(data).length === 0) {
        data = type === 'free_text' ? {label: value} : {};
    }

    const depends_on = normalizeDependency(raw?.depends_on);

    return {
        type,
        data,
        value,
        expression,
        depends_on: depends_on || null,
    };
}
export function buildMembersSet(group, membres) {
    const set = new Set();
    for (const m of membres) if (m.groupe_id === group.id) set.add(m.act_id);
    return set;
}

export function prefillFromStores(g, membres, gvaleurs, niveaux) {
    const membersRows = (membres || [])
        .filter((m) => m.groupe_id === g.id)
        .sort((a, b) => (a.ordre || 1e9) - (b.ordre || 1e9));
    const membersArr = membersRows.map((m) => m.act_id);

    const subItems = Array.isArray(g?.sub_items)
        ? g.sub_items
            .map((si) => ({
                id: si.id || '',
                parent_act_id: si.parent_act_id,
                libelle: String(si.libelle || '').trim(),
            }))
            .filter((si) => si.id && si.parent_act_id)
        : [];

    const toMini = (v) => coerceCellValue(v || {});
    const ensureEntry = (store, actId, levelId) => {
        if (!actId || !levelId) return null;
        store[actId] = store[actId] || {};
        store[actId][levelId] = store[actId][levelId] || { baseVal: {}, options: {}, surcoVal: {} };
        if (!store[actId][levelId].options) store[actId][levelId].options = {};
        return store[actId][levelId];
    };

    const valuesByAct = {};
    for (const actId of membersArr) {
        for (const n of niveaux || []) {
            ensureEntry(valuesByAct, actId, n.id);
        }
    }

    for (const sub of subItems) {
        for (const n of niveaux || []) {
            ensureEntry(valuesByAct, sub.id, n.id);
        }
    }

    for (const row of gvaleurs || []) {
        if (row.groupe_id !== g.id) continue;
        const target = ensureEntry(valuesByAct, row.act_id, row.niveau_id);
        if (!target) continue;
        const kind = String(row.kind || 'base').toLowerCase();
        if (kind === 'base') {
            target.baseVal = toMini(row);
        } else if (kind === 'surco') {
            target.surcoVal = toMini(row);
        } else if (kind.startsWith('option-')) {
            const optionLevelId = kind.slice('option-'.length);
            if (optionLevelId) {
                target.options = target.options || {};
                target.options[optionLevelId] = toMini(row);
            }
        }
    }

    return { groupe: { ...g }, membersArr, valuesByAct };
}

export function normalizeCell(gid, actId, nivId, kind, mini) {
    const rid =
        typeof crypto !== 'undefined' && crypto?.randomUUID
            ? crypto.randomUUID()
            : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);

    const typed = coerceCellValue(mini || {});
    const dataPayload =
        typed.data && typeof typed.data === 'object' ? typed.data : {};
    const hasData = Object.keys(dataPayload).length > 0;

    const row = {
        id: rid,
        groupe_id: gid,
        act_id: actId,
        niveau_id: nivId,
        kind, // 'base' | 'surco'
        // normalisation générique (tu pourras spécialiser plus tard)
        mode: 'texte_libre',
        base: 'inconnu',
        taux: null,
        montant: null,
        unite: 'inconnu',
        plafond_montant: null,
        plafond_unite: null,
        periodicite: null,
        condition_json: null,
        expression: typed.expression || '',
        commentaire: typed.value || '',
        value: typed.value || '',
        value_type: typed.type || undefined,
        type: typed.type || undefined,
        data_json: hasData ? dataPayload : undefined,
        data: hasData ? dataPayload : undefined,
    };

    const rawKind = String(kind || 'base').toLowerCase();
    let columnKind = 'base';
    let optionLevelId = null;
    if (rawKind === 'surco') columnKind = 'surco';
    else if (rawKind.startsWith('option')) {
        columnKind = 'option';
        optionLevelId = rawKind.slice('option-'.length) || nivId;
    }
    const dep = normalizeDependency(typed.depends_on, {
        levelId: nivId,
        kind: columnKind,
        optionLevelId,
    });
    if (dep) row.depends_on = dep;

    return row;
}
