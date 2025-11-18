'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { normalizeDependency } from '@/lib/utils/dependency';

export function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const safeLS = typeof window !== 'undefined' ? window.localStorage : null;
const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
const lsGet = (k, fallback = []) => {
    if (!safeLS) return fallback;
    try { const raw = safeLS.getItem(k); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
};
const lsSet = (k, v) => { if (safeLS) { try { safeLS.setItem(k, JSON.stringify(v)); } catch {} } };

// hooks/useGroupData*.js
export function sanitizeGroupes(arr, catalogueMap, moduleMap) {
    if (!Array.isArray(arr)) return [];
    const out = [];
    for (const raw of arr) {
        if (!raw) continue;
        const subItems = Array.isArray(raw.sub_items)
            ? raw.sub_items
                .map((si) => {
                    const libelle = String(si.libelle || '').trim();
                    if (!si.parent_act_id || !libelle) return null;
                    return {
                        id: si.id || uuid(),
                        parent_act_id: si.parent_act_id,
                        libelle,
                        description: String(si.description || '').trim(),
                        field_type: si.field_type || 'radio',
                    };
                })
                .filter((si) => !!si)
            : [];
        const categoryGroups = {};
        if (isPlainObject(raw.category_groups)) {
            for (const [catId, entries] of Object.entries(raw.category_groups)) {
                if (!Array.isArray(entries)) continue;
                const cleaned = entries
                    .map((entry) => {
                        const libelle = String(entry?.libelle || '').trim();
                        const actIds = Array.isArray(entry?.actIds) ? entry.actIds.filter((id) => !!id) : [];
                        if (!libelle || actIds.length === 0) return null;
                        return {
                            id: entry.id || uuid(),
                            libelle,
                            actIds,
                        };
                    })
                    .filter(Boolean);
                if (cleaned.length > 0) categoryGroups[catId] = cleaned;
            }
        }
        const selectionType = raw.selection_type === 'checkbox' ? 'checkbox' : 'radio';
        const g = {
            id: raw.id || uuid(),
            catalogue_id: raw.catalogue_id,
            ref_module_id: raw.ref_module_id,
            nom: String(raw.nom || '').trim(),
            priorite: Number.isFinite(Number(raw.priorite)) ? Number(raw.priorite) : 100,
            cat_order: Array.isArray(raw.cat_order) ? raw.cat_order : (raw.cat_order ?? []),
            // 🔑 NOUVEAU : ordre (peut être null → fallback tri)
            ordre: Number.isFinite(Number(raw.ordre)) ? Number(raw.ordre) : null,
            sub_items: subItems,
            category_groups: categoryGroups,
            selection_type: selectionType,
        };
        if (!g.catalogue_id || !catalogueMap?.has(g.catalogue_id)) continue;
        if (!g.ref_module_id || !moduleMap?.has(g.ref_module_id)) continue;
        if (!g.nom) continue;
        out.push(g);
    }
    // tri “doux” : ordre d'abord s'il existe, sinon priorite puis nom
    return out.sort(
        (a, b) =>
            (a.ordre ?? 1e9) - (b.ordre ?? 1e9) ||
            (a.priorite ?? 0) - (b.priorite ?? 0) ||
            a.nom.localeCompare(b.nom)
    );
}
export function sanitizeMembres(arr) {
    if (!Array.isArray(arr)) return [];
    const byGroup = new Map();
    for (const raw of arr || []) {
        if (!raw || !raw.groupe_id || !raw.act_id) continue;
        const gid = raw.groupe_id;
        if (!byGroup.has(gid)) byGroup.set(gid, []);
        const schemaRaw = raw.ui_schema || {};
        const options = Array.isArray(schemaRaw.options)
            ? schemaRaw.options
                .map((opt) => ({
                    label: String(opt?.label || '').trim(),
                    value: opt?.value ?? opt?.label ?? '',
                }))
                .filter((opt) => !!opt.label)
            : [];
        const ui_schema = {
            label: String(schemaRaw.label || ''),
            description: String(schemaRaw.description || ''),
            field_type: schemaRaw.field_type || 'radio',
            unit: schemaRaw.unit || '',
            default_value: schemaRaw.default_value ?? '',
            min: typeof schemaRaw.min === 'number' ? schemaRaw.min : null,
            max: typeof schemaRaw.max === 'number' ? schemaRaw.max : null,
            step: typeof schemaRaw.step === 'number' ? schemaRaw.step : null,
            options,
        };
        byGroup.get(gid).push({
            groupe_id: gid,
            act_id: raw.act_id,
            ordre: Number.isFinite(Number(raw.ordre)) ? Number(raw.ordre) : Infinity,
            ui_schema,
        });
    }
    const out = [];
    for (const [gid, list] of byGroup) {
        list.sort((a,b)=>(a.ordre||1e9)-(b.ordre||1e9));
        list.forEach((m,i)=> out.push({ ...m, ordre: i+1 }));
    }
    return out;
}
export function sanitizeGvaleurs(arr) {
    if (!Array.isArray(arr)) return [];
    const out = [];
    const seen = new Set();
    for (const raw of arr || []) {
        if (!raw) continue;
        const rawKind = String(raw.kind || 'base').toLowerCase();
        let kind = 'base';
        if (rawKind === 'surco' || rawKind === 'base' || rawKind.startsWith('option-')) {
            kind = rawKind;
        }

        const valueType = raw.value_type || raw.type || undefined;
        const dataJson = raw.data_json || raw.data || undefined;

        const v = {
            id: raw.id || uuid(),
            groupe_id: raw.groupe_id,
            act_id: raw.act_id,
            niveau_id: raw.niveau_id,
            kind,
            mode: raw.mode || 'texte_libre',
            base: raw.base || 'inconnu',
            taux: isFinite(Number(raw.taux)) ? Number(raw.taux) : null,
            montant: isFinite(Number(raw.montant)) ? Number(raw.montant) : null,
            unite: raw.unite || 'inconnu',
            plafond_montant: isFinite(Number(raw.plafond_montant)) ? Number(raw.plafond_montant) : null,
            plafond_unite: raw.plafond_unite || null,
            periodicite: raw.periodicite || null,
            condition_json: raw.condition_json ?? null,
            expression: raw.expression || '',
            commentaire: raw.commentaire || '',
            value: raw.value ?? raw.commentaire ?? '',
            value_type: valueType,
            type: valueType,
            data_json: dataJson || (valueType ? {} : undefined),
            data: dataJson || (valueType ? {} : undefined),
        };

        if (!v.groupe_id || !v.act_id || !v.niveau_id) continue;
        const dep = normalizeDependency(raw.depends_on, {
            levelId: v.niveau_id,
            kind,
        });
        if (dep) v.depends_on = dep;
        const k = `${v.groupe_id}::${v.act_id}::${v.niveau_id}::${v.kind}`;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(v);
    }
    return out;
}
export function sanitizeGtarifs(arr) {
    if (!Array.isArray(arr)) return [];
    const out = [];
    for (const raw of arr) {
        if (!raw) continue;

        // normalisation
        const kind = (String(raw.kind || 'base').toLowerCase() === 'surco') ? 'surco' : 'base';

        const row = {
            id: raw.id || uuid(),
            groupe_id: String(raw.groupe_id || '').trim(),
            kind, // 'base' | 'surco'

            // IDs de référentiels (obligatoires pour une ligne valide)
            cat_id:    String(raw.cat_id || '').trim(),
            age_id:    String(raw.age_id || '').trim(),
            regime_id: String(raw.regime_id || '').trim(),

            // niveau (peut différer entre base et surco)
            niveau_id: String(raw.niveau_id || '').trim(),

            // clé libre
            cle: (raw.cle ?? '') + '',

            // valeurs (stockées en chaînes formatées "xx.yy%")
            tx_uniforme:        (raw.tx_uniforme ?? '') + '',
            tx_isole:           (raw.tx_isole ?? '') + '',
            tx_famille:         (raw.tx_famille ?? '') + '',
            tx_asse_enfants_ss: (raw.tx_asse_enfants_ss ?? '') + '',
            tx_conjoint_fac:    (raw.tx_conjoint_fac ?? '') + '',
            tx_salarie_seul:    (raw.tx_salarie_seul ?? '') + '',
            tx_adulte:          (raw.tx_adulte ?? '') + '',
            tx_enfant:          (raw.tx_enfant ?? '') + '',
        };

        // garde-fous minimaux
        if (!row.groupe_id || !row.niveau_id || !row.cat_id || !row.age_id || !row.regime_id) continue;

        out.push(row);
    }
    return out;
}


/**
 * Store localStorage scoped (ns = catalogueId de préférence)
 */
export function useGroupStore(refs, options = {}) {
    const { catalogueMap, moduleMap } = refs || {};
    const { ns = 'global' } = options;

    const keyG = `grp:${ns}:groupes`;
    const keyM = `grp:${ns}:membres`;
    const keyV = `grp:${ns}:gvaleurs`;
    const keyT = `grp:${ns}:gtarifs`;     // ⬅️ NEW

    const [rawG, setRawG] = useState([]);
    const [rawM, setRawM] = useState([]);
    const [rawV, setRawV] = useState([]);
    const [rawT, setRawT] = useState([]); // ⬅️ NEW
    const bootedRef = useRef(false);

    // hydrate au mount (LS ou vide)
    useEffect(() => {
        setRawG(lsGet(keyG, []));
        setRawM(lsGet(keyM, []));
        setRawV(lsGet(keyV, []));
        setRawT(lsGet(keyT, [])); // ⬅️ NEW
        bootedRef.current = true;
    }, [keyG, keyM, keyV, keyT]);

    // valeurs dérivées
    const groupes  = useMemo(() => sanitizeGroupes(rawG, catalogueMap, moduleMap), [rawG, catalogueMap, moduleMap]);
    const membres  = useMemo(() => sanitizeMembres(rawM), [rawM]);
    const gvaleurs = useMemo(() => sanitizeGvaleurs(rawV), [rawV]);
    const gtarifs  = useMemo(() => sanitizeGtarifs(rawT), [rawT]); // ⬅️ NEW

    // setters (jamais pendant le render)
    const setGroupes = (next) => setRawG((prev) => {
        const value = typeof next === 'function' ? next(prev) : next;
        const clean = sanitizeGroupes(value, catalogueMap, moduleMap);
        if (bootedRef.current) lsSet(keyG, clean);
        return clean;
    });
    const setMembres = (next) => setRawM((prev) => {
        const value = typeof next === 'function' ? next(prev) : next;
        const clean = sanitizeMembres(value);
        if (bootedRef.current) lsSet(keyM, clean);
        return clean;
    });
    const setGvaleurs = (next) => setRawV((prev) => {
        const value = typeof next === 'function' ? next(prev) : next;
        const clean = sanitizeGvaleurs(value);
        if (bootedRef.current) lsSet(keyV, clean);
        return clean;
    });
    const setGtarifs = (next) => setRawT((prev) => {
        const value = typeof next === 'function' ? next(prev) : next;
        const clean = sanitizeGtarifs(value);
        if (bootedRef.current) lsSet(keyT, clean);
        return clean;
    });

    // helpers
    const membersByGroup = useMemo(() => {
        const by = new Map();
        for (const m of membres) {
            if (!by.has(m.groupe_id)) by.set(m.groupe_id, new Set());
            by.get(m.groupe_id).add(m.act_id);
        }
        return by;
    }, [membres]);

    const memberOrderByGroup = useMemo(() => {
        const by = new Map();
        for (const m of membres) {
            if (!by.has(m.groupe_id)) by.set(m.groupe_id, new Map());
            by.get(m.groupe_id).set(m.act_id, m.ordre || 1e9);
        }
        return by;
    }, [membres]);

    return {
        groupes, setGroupes,
        membres, setMembres,
        gvaleurs, setGvaleurs,
        gtarifs, setGtarifs,            // ⬅️ NEW (exposé au composant)
        membersByGroup,
        memberOrderByGroup
    };
}
