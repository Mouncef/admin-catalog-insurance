// utils/catalogueInline.js

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

    return {
        type,
        data,
        value,
        expression,
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

    const toMini = (v) => coerceCellValue(v || {});

    const valuesByAct = {};
    for (const actId of membersArr) {
        valuesByAct[actId] = {};
        for (const n of niveaux || []) {
            const base = (gvaleurs || []).find(
                (v) =>
                    v.groupe_id === g.id &&
                    v.act_id === actId &&
                    v.niveau_id === n.id &&
                    v.kind === 'base'
            );
            const surc = (gvaleurs || []).find(
                (v) =>
                    v.groupe_id === g.id &&
                    v.act_id === actId &&
                    v.niveau_id === n.id &&
                    v.kind === 'surco'
            );
            if (base || surc) {
                valuesByAct[actId][n.id] = { baseVal: toMini(base), surcoVal: toMini(surc) };
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

    return {
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
}
