// src/hooks/useGroupDataLocal.js
'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useGroupActes, useGroupActMembre, useGroupValeur } from '@/providers/AppDataProvider'

// ===== utils =====
export function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const safeLS = typeof window !== 'undefined' ? window.localStorage : null
const lsGet = (k, fallback = []) => {
    if (!safeLS) return fallback
    try {
        const raw = safeLS.getItem(k)
        return raw ? JSON.parse(raw) : fallback
    } catch { return fallback }
}
const lsSet = (k, v) => {
    if (!safeLS) return
    try { safeLS.setItem(k, JSON.stringify(v)) } catch {}
}

// ===== sanitizers (conservent cat_order) =====
export function sanitizeGroupes(arr, catalogueMap, moduleMap) {
    if (!Array.isArray(arr)) return []
    const normalizeSelectionType = (value) => {
        if (value === 'checkbox') return 'checkbox'
        if (value === 'radio') return 'radio'
        return 'none'
    }
    const out = []
    for (const raw of arr) {
        if (!raw) continue
        const catSelectionTypes = {}
        if (raw.category_selection_types && typeof raw.category_selection_types === 'object' && !Array.isArray(raw.category_selection_types)) {
            for (const [catId, type] of Object.entries(raw.category_selection_types)) {
                const normalized = normalizeSelectionType(type)
                if (normalized) catSelectionTypes[catId] = normalized
            }
        }
        const g = {
            id: raw.id || uuid(),
            catalogue_id: raw.catalogue_id,
            ref_module_id: raw.ref_module_id,
            nom: String(raw.nom || '').trim(),
            priorite: Number.isFinite(Number(raw.priorite)) ? Number(raw.priorite) : 100,
            cat_order: Array.isArray(raw.cat_order) ? raw.cat_order : (raw.cat_order ?? []),
            selection_type: normalizeSelectionType(raw.selection_type),
            category_selection_types: catSelectionTypes,
        }
        if (!g.catalogue_id || !catalogueMap?.has(g.catalogue_id)) continue
        if (!g.ref_module_id || !moduleMap?.has(g.ref_module_id)) continue
        if (!g.nom) continue
        out.push(g)
    }
    return out.sort((a,b)=>(a.priorite||0)-(b.priorite||0) || a.nom.localeCompare(b.nom))
}

export function sanitizeMembres(arr) {
    if (!Array.isArray(arr)) return []
    const byGroup = new Map()
    for (const raw of arr || []) {
        if (!raw || !raw.groupe_id || !raw.act_id) continue
        const gid = raw.groupe_id
        if (!byGroup.has(gid)) byGroup.set(gid, [])
        const isOptional = raw.is_optional === true || raw.optional === true || raw.is_required === false
        byGroup.get(gid).push({
            groupe_id: gid,
            act_id: raw.act_id,
            ordre: Number.isFinite(Number(raw.ordre)) ? Number(raw.ordre) : Infinity,
            is_optional: isOptional,
        })
    }
    const out = []
    for (const [gid, list] of byGroup) {
        list.sort((a,b)=>(a.ordre||1e9)-(b.ordre||1e9))
        list.forEach((m,i)=> out.push({...m, ordre: i+1}))
    }
    return out
}

export function sanitizeGvaleurs(arr) {
    if (!Array.isArray(arr)) return []
    const out = []
    const seen = new Set()
    for (const raw of arr || []) {
        if (!raw) continue
        const rawKind = String(raw.kind || 'base').toLowerCase()
        let kind = 'base'
        if (rawKind === 'surco' || rawKind === 'base' || rawKind.startsWith('option-')) {
            kind = rawKind
        }

        const valueType = raw.value_type || raw.type || undefined
        const dataJson = raw.data_json || raw.data || undefined

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
        }
        if (!v.groupe_id || !v.act_id || !v.niveau_id) continue
        const k = `${v.groupe_id}::${v.act_id}::${v.niveau_id}::${v.kind}`
        if (seen.has(k)) continue
        seen.add(k)
        out.push(v)
    }
    return out
}

// ===== hook local-storage =====
/**
 * @param refs { catalogueMap: Map, moduleMap: Map }
 * @param options { ns?: string } namespace localStorage (ex: catalogueId)
 */
export function useGroupStoreLocal(refs, options = {}) {
    const { catalogueMap, moduleMap } = refs || {}
    const { ns = 'global' } = options

    // (facultatif) on garde les providers synchronisés pour le reste de l’app
    const { refGroupActes, setRefGroupActes } = useGroupActes()
    const { refGroupActMembre, setRefGroupActMembre } = useGroupActMembre()
    const { refGroupValeur, setRefGroupValeur } = useGroupValeur()

    const keyG = `grp:${ns}:groupes`
    const keyM = `grp:${ns}:membres`
    const keyV = `grp:${ns}:gvaleurs`

    const [rawG, setRawG] = useState([])
    const [rawM, setRawM] = useState([])
    const [rawV, setRawV] = useState([])
    const bootedRef = useRef(false)

    // Hydrate au montage: priorité au LS, sinon seed avec providers
    useEffect(() => {
        const g = lsGet(keyG, refGroupActes || [])
        const m = lsGet(keyM, refGroupActMembre || [])
        const v = lsGet(keyV, refGroupValeur || [])
        setRawG(g); setRawM(m); setRawV(v)
        // on synchronise aussi les providers (optionnel mais pratique)
        setRefGroupActes(g)
        setRefGroupActMembre(m)
        setRefGroupValeur(v)
        bootedRef.current = true
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [keyG, keyM, keyV])

    // Valeurs dérivées + sanitization
    const groupes  = useMemo(() => sanitizeGroupes(rawG, catalogueMap, moduleMap), [rawG, catalogueMap, moduleMap])
    const membres  = useMemo(() => sanitizeMembres(rawM), [rawM])
    const gvaleurs = useMemo(() => sanitizeGvaleurs(rawV), [rawV])

    // Ecriture centralisée: support valeur OU function-updater, puis sanitize, puis LS + providers
    const setGroupes = (next) => {
        setRawG(prev => {
            const value = typeof next === 'function' ? next(prev) : next
            const clean = sanitizeGroupes(value, catalogueMap, moduleMap)
            lsSet(keyG, clean)
            if (bootedRef.current) setRefGroupActes(clean)
            return clean
        })
    }
    const setMembres = (next) => {
        setRawM(prev => {
            const value = typeof next === 'function' ? next(prev) : next
            const clean = sanitizeMembres(value)
            lsSet(keyM, clean)
            if (bootedRef.current) setRefGroupActMembre(clean)
            return clean
        })
    }
    const setGvaleurs = (next) => {
        setRawV(prev => {
            const value = typeof next === 'function' ? next(prev) : next
            const clean = sanitizeGvaleurs(value)
            lsSet(keyV, clean)
            if (bootedRef.current) setRefGroupValeur(clean)
            return clean
        })
    }

    // helpers (inchangés)
    const membersByGroup = useMemo(() => {
        const by = new Map()
        for (const m of membres) {
            if (!by.has(m.groupe_id)) by.set(m.groupe_id, new Set())
            by.get(m.groupe_id).add(m.act_id)
        }
        return by
    }, [membres])

    const memberOrderByGroup = useMemo(() => {
        const by = new Map()
        for (const m of membres) {
            if (!by.has(m.groupe_id)) by.set(m.groupe_id, new Map())
            by.get(m.groupe_id).set(m.act_id, m.ordre || 1e9)
        }
        return by
    }, [membres])

    return {
        groupes,    setGroupes,
        membres,    setMembres,
        gvaleurs,   setGvaleurs,
        membersByGroup,
        memberOrderByGroup,
    }
}
