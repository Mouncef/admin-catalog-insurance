"use client"

import Link from 'next/link'
import {useEffect, useMemo, useRef, useState} from 'react'
import {
    useRefOffers,
    useRefCatalogues,
    useGroupActes,
    useGroupActMembre,
    useGroupValeur,
    useCatModules,
    useGroupeUIState,              // ← NEW: pour nettoyer l’UI state par groupe
    useRefCatPersonnel,
} from '@/providers/AppDataProvider'
import { useMultiStorage } from '@/providers/MultiStorageProvider'
import {Eye, Copy, SquarePen, Trash2, Columns3Cog} from "lucide-react"
import {useAuth, usePermissions} from '@/providers/AuthProvider';
import {applyCreateAudit, applyUpdateAudit, applyDeleteAudit, ensureAuditFields} from '@/lib/utils/audit';

export default function CataloguesPageClient() {
    const LS_OFFRES = 'app:offres_v1'
    const LS_CATALOGUES = 'app:catalogues_v1'

    const {refOffers} = useRefOffers()
    const {refCatalogues, setRefCatalogues} = useRefCatalogues()
    const { refCatPersonnel } = useRefCatPersonnel()

    // référentiels globaux
    const { refGroupActes, setRefGroupActes } = useGroupActes()
    const { refGroupActMembre, setRefGroupActMembre } = useGroupActMembre()
    const { refGroupValeur, setRefGroupValeur } = useGroupValeur()
    const { catModules, setCatModules } = useCatModules()
    const { uiState, setUIState } = useGroupeUIState()        // ← NEW

    // tarifs globaux (clé app)
    const { data: msData, set: msSet } = useMultiStorage()
    const KEY_TARIFS_APP = 'groupe_tarifs_v1'
    const NS_KEYS = { groupes: 'groupes', membres: 'membres', gvaleurs: 'gvaleurs', gtarifs: 'gtarifs' }

    const [mounted, setMounted] = useState(false)
    const {canCreate, canUpdate, canDelete} = usePermissions();
    const {user} = useAuth();
    const [offerFilter, setOfferFilter] = useState('all')
    const [query, setQuery] = useState('')
    const [yearFilter, setYearFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [onlyActive, setOnlyActive] = useState(false)
    const [sortNewestFirst, setSortNewestFirst] = useState(true)
    const [toast, setToast] = useState(null)

    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    const upsertDialogRef = useRef(null)
    const deleteDialogRef = useRef(null)

    const [editing, setEditing] = useState(null)
    const [candidateDelete, setCandidateDelete] = useState(null)

    useEffect(() => { setMounted(true) }, [])
    useEffect(() => {
        if (!mounted) return
        const needsMigration = (refCatalogues || []).some((c) => !c?.createdAt)
        if (needsMigration) {
            setRefCatalogues((prev) => sanitizeCatalogues(prev || []))
        }
    }, [mounted, refCatalogues, setRefCatalogues])
    const formDisabled = editing ? (editing.id ? !canUpdate : !canCreate) : false;

    // ===== Utils =====
    function uuid() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
        return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    }
    function showToast(type, msg) { setToast({type, msg}); setTimeout(() => setToast(null), 2500) }
    const offerMap = useMemo(() => new Map(refOffers.map((o) => [o.id, o])), [refOffers])
    const catPersonnelOrdered = useMemo(() => {
        const arr = Array.isArray(refCatPersonnel) ? [...refCatPersonnel] : []
        return arr.sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0) || String(a.libelle || a.code || '').localeCompare(b.libelle || b.code || ''))
    }, [refCatPersonnel])
    const enabledCatPersonnel = useMemo(() => catPersonnelOrdered.filter((c) => c.is_enabled !== false), [catPersonnelOrdered])
    const defaultCatalogueCatIds = useMemo(() => enabledCatPersonnel.map((c) => c.id), [enabledCatPersonnel])
    const catPersonnelIdSet = useMemo(() => new Set(catPersonnelOrdered.map((c) => c.id)), [catPersonnelOrdered])
    const catPersonnelOrderIndex = useMemo(() => {
        const map = new Map()
        catPersonnelOrdered.forEach((cat, idx) => map.set(cat.id, idx))
        return map
    }, [catPersonnelOrdered])
    const catPersonnelMap = useMemo(() => new Map(catPersonnelOrdered.map((c) => [c.id, c])), [catPersonnelOrdered])

    function normalizeDateStr(s) {
        const t = String(s || '').trim()
        if (!t) return ''
        const d = new Date(t)
        if (isNaN(d.getTime())) return ''
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        return `${yyyy}-${mm}-${dd}`
    }
    function isActive(c) {
        if (!c) return false
        if (String(c.status || '').toLowerCase() !== 'active') return false
        const today = new Date()
        const fromOk = !c.valid_from || new Date(c.valid_from) <= today
        const toOk = !c.valid_to || new Date(c.valid_to) >= today
        return fromOk && toOk
    }

    // localStorage helpers
    const safeLS = typeof window !== 'undefined' ? window.localStorage : null
    const lsGet = (k, fallback = []) => {
        if (!safeLS) return fallback
        try { const raw = safeLS.getItem(k); return raw ? JSON.parse(raw) : fallback } catch { return fallback }
    }
    const lsSet = (k, v) => { try { safeLS?.setItem(k, JSON.stringify(v)) } catch {} }
    const lsDel = (k) => { try { safeLS?.removeItem(k) } catch {} }   // ← NEW

    function cleanCatalogueCatIds(rawIds) {
        const input = Array.isArray(rawIds) ? rawIds : []
        const next = []
        const seen = new Set()
        for (const id of input) {
            if (!catPersonnelIdSet.has(id) || seen.has(id)) continue
            next.push(id)
            seen.add(id)
        }
        next.sort((a, b) => (catPersonnelOrderIndex.get(a) ?? 1e6) - (catPersonnelOrderIndex.get(b) ?? 1e6))
        return next
    }

    function toggleCatSelection(catId, isChecked) {
        setEditing((prev) => {
            if (!prev) return prev
            const current = cleanCatalogueCatIds(prev.cat_personnel_ids)
            let candidate = current
            if (isChecked && !current.includes(catId)) {
                candidate = cleanCatalogueCatIds([...current, catId])
            } else if (!isChecked && current.includes(catId)) {
                candidate = cleanCatalogueCatIds(current.filter((id) => id !== catId))
            }
            return {...prev, cat_personnel_ids: candidate}
        })
    }

    // Nettoyage + unicité {offre_id, risque, annee, version}
    function sanitizeCatalogues(arr) {
        const map = new Map()
        for (const raw of arr || []) {
            if (!raw) continue
            const risque = String(raw.risque || '').trim()
            const isPrev = risque.toLowerCase() === 'prevoyance'
            let allowMulti = true
            if (raw.allow_multiple_niveaux === false) allowMulti = false
            else if (raw.allow_multiple_niveaux === true) allowMulti = true
            else allowMulti = !isPrev

            const defaultSetIdRaw = raw.default_niveau_set_id ? String(raw.default_niveau_set_id || '').trim() : ''
            const defaultSetId = defaultSetIdRaw || (isPrev ? 'set-prevoyance-unique' : null)

            const cleanedCatIds = cleanCatalogueCatIds(raw.cat_personnel_ids)
            const catIds = cleanedCatIds.length > 0 ? cleanedCatIds : [...defaultCatalogueCatIds]

            const item = ensureAuditFields({
                id: raw.id || uuid(),
                offre_id: raw.offre_id,
                risque,
                annee: Number.isFinite(Number(raw.annee)) ? Number(raw.annee) : undefined,
                version: String(raw.version || '').trim(),
                status: String(raw.status || '').trim(),
                valid_from: normalizeDateStr(raw.valid_from),
                valid_to: normalizeDateStr(raw.valid_to),
                allow_multiple_niveaux: allowMulti,
                default_niveau_set_id: defaultSetId,
                cat_personnel_ids: catIds,
                createdAt: raw.createdAt,
                createdBy: raw.createdBy,
                updatedAt: raw.updatedAt,
                updatedBy: raw.updatedBy,
                deletedAt: raw.deletedAt ?? null,
                deletedBy: raw.deletedBy ?? null,
            })
            if (!item.offre_id || !offerMap.has(item.offre_id)) continue
            if (!item.risque || !item.version) continue
            const k = `${item.offre_id}::${item.risque.toLowerCase()}::${item.annee ?? ''}::${item.version.toLowerCase()}`
            map.set(k, item)
        }
        return Array.from(map.values())
    }

    // ===== Derived data for filters =====
    const cataloguesRaw = useMemo(
        () => sanitizeCatalogues(refCatalogues || []),
        [refCatalogues, defaultCatalogueCatIds, catPersonnelIdSet, catPersonnelOrderIndex, offerMap]
    )
    const catalogues = useMemo(() => cataloguesRaw.filter((c) => !c.deletedAt), [cataloguesRaw])

    const yearsAvailable = useMemo(() => {
        const set = new Set()
        for (const c of catalogues) if (Number.isFinite(Number(c.annee))) set.add(Number(c.annee))
        return Array.from(set).sort((a, b) => b - a)
    }, [catalogues])

    const statusesAvailable = useMemo(() => {
        const set = new Set()
        for (const c of catalogues) {
            const s = String(c.status || '').trim()
            if (s) set.add(s)
        }
        const arr = Array.from(set)
        return arr.length ? arr : ['draft', 'active', 'archived']
    }, [catalogues])

    // ===== Sélecteur principal =====
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        let base = catalogues
            .filter((c) => offerFilter === 'all' ? true : c.offre_id === offerFilter)
            .filter((c) => yearFilter === 'all' ? true : String(c.annee || '') === String(yearFilter))
            .filter((c) => statusFilter === 'all' ? true : String(c.status || '').toLowerCase() === String(statusFilter).toLowerCase())
            .filter((c) => onlyActive ? isActive(c) : true)

        base = base.filter((c) => {
            if (!q) return true
            return (
                String(c.risque || '').toLowerCase().includes(q) ||
                String(c.version || '').toLowerCase().includes(q) ||
                String(c.status || '').toLowerCase().includes(q)
            )
        })

        base.sort((a, b) => {
            if (offerFilter === 'all') {
                const sa = offerMap.get(a.offre_id)?.code || ''
                const sb = offerMap.get(b.offre_id)?.code || ''
                const s = sa.localeCompare(sb)
                if (s !== 0) return s
            }
            const yearCmp = (Number(b.annee || 0) - Number(a.annee || 0)) * (sortNewestFirst ? 1 : -1)
            if (yearCmp !== 0) return yearCmp
            return (String(a.version || '').localeCompare(String(b.version || ''))) * (sortNewestFirst ? 1 : -1)
        })

        return base
    }, [catalogues, offerFilter, yearFilter, statusFilter, onlyActive, query, sortNewestFirst, offerMap])

    // ======= Pagination dérivées =======
    const totalItems = filtered.length
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    const clamp = (p) => Math.max(1, Math.min(p, totalPages))
    const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
    const to = Math.min(totalItems, page * pageSize)
    const pageRows = filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)

    useEffect(() => { setPage(1) }, [offerFilter, yearFilter, statusFilter, onlyActive, query, sortNewestFirst])
    useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages, page])

    // ===== CRUD =====
    function openCreate() {
        if (!canCreate) {
            showToast('error', 'Vous n’avez pas les droits pour créer un catalogue.');
            return;
        }
        const defaultOfferId = offerFilter !== 'all' ? offerFilter : (refOffers[0]?.id || '')
        const defaultCats = cleanCatalogueCatIds(defaultCatalogueCatIds)
        setEditing({
            id: null,
            offre_id: defaultOfferId,
            risque: '',
            annee: new Date().getFullYear(),
            version: '',
            status: 'draft',
            valid_from: '',
            valid_to: '',
            __dupFromId: null,
            cat_personnel_ids: defaultCats,
        })
        upsertDialogRef.current?.showModal()
    }
    function openEdit(row) {
        if (!canUpdate) {
            showToast('error', 'Vous n’avez pas les droits pour modifier un catalogue.');
            return;
        }
        const cleanedCats = cleanCatalogueCatIds(row?.cat_personnel_ids)
        const fallbackCats = cleanedCats.length > 0 ? cleanedCats : cleanCatalogueCatIds(defaultCatalogueCatIds)
        setEditing({...row, __dupFromId: null, cat_personnel_ids: fallbackCats})
        upsertDialogRef.current?.showModal()
    }
    function duplicateAsNew(row) {
        if (!canCreate) {
            showToast('error', 'Vous n’avez pas les droits pour dupliquer un catalogue.');
            return;
        }
        const cleanedCats = cleanCatalogueCatIds(row?.cat_personnel_ids)
        const copy = {
            ...row,
            id: null,
            version: `${row.version}-COPY`,
            __dupFromId: row.id,
            cat_personnel_ids: cleanedCats.length > 0 ? cleanedCats : cleanCatalogueCatIds(defaultCatalogueCatIds),
        }
        setEditing(copy)
        upsertDialogRef.current?.showModal()
    }

    // === suppression en cascade des données d’un catalogue ===
    function deleteCatalogueData(catalogueId) {
        if (!canDelete) {
            showToast('error', 'Suppression non autorisée pour votre rôle.');
            return;
        }
        if (!catalogueId) return

        // 1) récupérer les groupes liés (globaux + namespacés)
        const appGroups = (refGroupActes || []).filter(g => g.catalogue_id === catalogueId)
        const nsGroups  = lsGet(`grp:${catalogueId}:${NS_KEYS.groupes}`, [])
        const allGroups = [...appGroups, ...nsGroups]
        const groupIds  = new Set(allGroups.map(g => g.id))

        // 2) supprimer groupes/membres/valeurs globaux
        if (appGroups.length) {
            setRefGroupActes(refGroupActes.filter(g => g.catalogue_id !== catalogueId))
            setRefGroupActMembre(refGroupActMembre.filter(m => !groupIds.has(m.groupe_id)))
            setRefGroupValeur(refGroupValeur.filter(v => !groupIds.has(v.groupe_id)))
        }

        // 3) supprimer les clés namespacées du store groupes
        lsDel(`grp:${catalogueId}:${NS_KEYS.groupes}`)
        lsDel(`grp:${catalogueId}:${NS_KEYS.membres}`)
        lsDel(`grp:${catalogueId}:${NS_KEYS.gvaleurs}`)

        // 4) tarifs (app + namespacé)
        const allTarifsApp = Array.isArray(msData?.[KEY_TARIFS_APP]) ? msData[KEY_TARIFS_APP] : []
        if (allTarifsApp.length && groupIds.size) {
            const kept = allTarifsApp.filter(t => !groupIds.has(t.groupe_id))
            msSet(KEY_TARIFS_APP, kept)
        }
        lsDel(`grp:${catalogueId}:${NS_KEYS.gtarifs}`)

        // 5) modules du catalogue
        if (Array.isArray(catModules) && catModules.length) {
            setCatModules(catModules.filter(m => m?.catalogue_id !== catalogueId))
        }

        // 6) UI state (supprimer les entrées des groupes du catalogue)
        if (uiState && typeof uiState === 'object') {
            const nextUI = { ...uiState }
            for (const gid of groupIds) delete nextUI[gid]
            setUIState(nextUI)
        }
    }

    // === DUPLICATION PROFONDE DES DONNÉES D’UN CATALOGUE ===
    function duplicateCatalogueData(srcCatalogueId, dstCatalogueId) {
        if (!srcCatalogueId || !dstCatalogueId) return;

        // 0) Récupération des sources (app + namespacé)
        const srcAppGroups = (refGroupActes || []).filter(g => g.catalogue_id === srcCatalogueId);
        const srcNsGroups  = lsGet(`grp:${srcCatalogueId}:${NS_KEYS.groupes}`, []);

        // 1) Construire la table de correspondance ancien_gid -> nouveau_gid (union app + ns)
        const allOldIds = new Set([
            ...srcAppGroups.map(g => g.id),
            ...srcNsGroups.map(g => g.id),
        ]);
        const idMap = new Map();
        for (const oldId of allOldIds) idMap.set(oldId, uuid());

        // 2) Groupes APP → nouveaux groupes APP (uniquement ceux qui existaient côté APP)
        const newAppGroups = srcAppGroups.map(g => ({
            ...g,
            id: idMap.get(g.id),
            catalogue_id: dstCatalogueId,
        }));
        if (newAppGroups.length) {
            setRefGroupActes([...(refGroupActes || []), ...newAppGroups]);
        }

        // 3) Membres APP (liés aux groupes APP seulement)
        const appOldIds = new Set(srcAppGroups.map(g => g.id));
        const newAppMembers = (refGroupActMembre || [])
            .filter(m => appOldIds.has(m.groupe_id))
            .map(m => ({
                ...m,
                groupe_id: idMap.get(m.groupe_id),
                // pas d'id dans ton modèle membre, donc rien à régénérer ici
            }));
        if (newAppMembers.length) {
            setRefGroupActMembre([...(refGroupActMembre || []), ...newAppMembers]);
        }

        // 4) Valeurs APP (liées aux groupes APP)
        const newAppValues = (refGroupValeur || [])
            .filter(v => appOldIds.has(v.groupe_id))
            .map(v => ({
                ...v,
                id: uuid(),
                groupe_id: idMap.get(v.groupe_id),
            }));
        if (newAppValues.length) {
            setRefGroupValeur([...(refGroupValeur || []), ...newAppValues]);
        }

        // 5) Tarifs globaux APP (clé: groupe_tarifs_v1) → dupliquer ceux des groupes APP
        const allTarifsApp = Array.isArray(msData?.[KEY_TARIFS_APP]) ? msData[KEY_TARIFS_APP] : [];
        const newTarifsApp = allTarifsApp
            .filter(t => appOldIds.has(t.groupe_id))
            .map(t => ({
                ...t,
                id: t.id ? uuid() : t.id,
                groupe_id: idMap.get(t.groupe_id),
            }));
        if (newTarifsApp.length) {
            msSet(KEY_TARIFS_APP, [...allTarifsApp, ...newTarifsApp]);
        }

        // 6) Modules sélectionnés pour le catalogue
        const newMods = (catModules || [])
            .filter(m => m?.catalogue_id === srcCatalogueId)
            .map(m => ({ ...m, id: m.id ? uuid() : m.id, catalogue_id: dstCatalogueId }));
        if (newMods.length) {
            setCatModules([...(catModules || []), ...newMods]);
        }

        // 7) (Optionnel) UI state par groupe (locked, acts, …) pour groupes APP
        if (uiState && typeof uiState === 'object') {
            const nextUI = { ...uiState };
            for (const g of srcAppGroups) {
                const s = uiState[g.id];
                if (s) nextUI[idMap.get(g.id)] = JSON.parse(JSON.stringify(s));
            }
            setUIState(nextUI);
        }

        // 8) Données namespacées (grp:<catalogue_id>:*)
        const srcNsMembers = lsGet(`grp:${srcCatalogueId}:${NS_KEYS.membres}`, []);
        const srcNsValues  = lsGet(`grp:${srcCatalogueId}:${NS_KEYS.gvaleurs}`, []);
        const srcNsTarifs  = lsGet(`grp:${srcCatalogueId}:${NS_KEYS.gtarifs}`, []);

        const dstNsGroups = srcNsGroups.map(g => ({
            ...g,
            id: idMap.get(g.id),
            catalogue_id: dstCatalogueId,
        }));
        const dstNsMembers = srcNsMembers.map(m => ({
            ...m,
            groupe_id: idMap.get(m.groupe_id),
        }));
        const dstNsValues = srcNsValues.map(v => ({
            ...v,
            id: v.id ? uuid() : v.id,
            groupe_id: idMap.get(v.groupe_id),
        }));
        const dstNsTarifs = srcNsTarifs.map(t => ({
            ...t,
            id: t.id ? uuid() : t.id,
            groupe_id: idMap.get(t.groupe_id),
        }));

        lsSet(`grp:${dstCatalogueId}:${NS_KEYS.groupes}`,  dstNsGroups);
        lsSet(`grp:${dstCatalogueId}:${NS_KEYS.membres}`,  dstNsMembers);
        lsSet(`grp:${dstCatalogueId}:${NS_KEYS.gvaleurs}`, dstNsValues);
        lsSet(`grp:${dstCatalogueId}:${NS_KEYS.gtarifs}`,  dstNsTarifs);
    }


    function submitUpsert(e) {
        e?.preventDefault?.()
        if (!editing) return
        const creating = !editing.id
        if (creating && !canCreate) {
            showToast('error', 'Création non autorisée pour votre rôle.');
            return;
        }
        if (!creating && !canUpdate) {
            showToast('error', 'Modification non autorisée pour votre rôle.');
            return;
        }

        const offre_id = String(editing.offre_id || '')
        if (!offre_id || !offerMap.has(offre_id)) return showToast('error', 'Offre requise')

        const risque = String(editing.risque || '').trim()
        if (!risque) return showToast('error', 'Le risque est requis')
        if (risque.length > 50) return showToast('error', 'Risque ≤ 50 caractères')

        const version = String(editing.version || '').trim()
        if (!version) return showToast('error', 'La version est requise')
        if (version.length > 20) return showToast('error', 'Version ≤ 20 caractères')

        const annee = editing.annee === '' ? undefined : Number(editing.annee)
        if (editing.annee !== '' && !Number.isFinite(annee)) return showToast('error', "L'année doit être un nombre")

        const status = String(editing.status || '').trim()
        const valid_from = normalizeDateStr(editing.valid_from)
        const valid_to = normalizeDateStr(editing.valid_to)
        const selectedCatIdsRaw = cleanCatalogueCatIds(editing.cat_personnel_ids)
        const selectedCatIds = selectedCatIdsRaw.length > 0 ? selectedCatIdsRaw : cleanCatalogueCatIds(defaultCatalogueCatIds)
        if (enabledCatPersonnel.length > 0 && selectedCatIds.length === 0) return showToast('error', 'Sélectionnez au moins une catégorie de collège')

        // Unicité
        const duplicate = catalogues.find((c) =>
            c.offre_id === offre_id &&
            String(c.risque).toLowerCase() === risque.toLowerCase() &&
            String(c.version).toLowerCase() === version.toLowerCase() &&
            String(c.annee || '') === String(annee || '') &&
            c.id !== editing.id
        )
        if (duplicate) return showToast('error', 'Un catalogue identique existe déjà pour cette offre')

        if (!editing.id) {
            const newId = uuid()
            const created = applyCreateAudit({
                id: newId,
                offre_id,
                risque,
                annee,
                version,
                status,
                valid_from,
                valid_to,
                cat_personnel_ids: selectedCatIds,
                deletedAt: null,
                deletedBy: null,
            }, user)
            const next = sanitizeCatalogues([...cataloguesRaw, created])
            setRefCatalogues(next)

            // duplication profonde si demandé
            if (editing.__dupFromId) duplicateCatalogueData(editing.__dupFromId, newId)

            showToast('success', 'Catalogue créé')
        } else {
            const nextArr = cataloguesRaw.map((c) => (c.id === editing.id ? applyUpdateAudit({
                ...c, offre_id, risque, annee, version, status, valid_from, valid_to, cat_personnel_ids: selectedCatIds
            }, user) : c))
            const next = sanitizeCatalogues(nextArr)
            setRefCatalogues(next)
            showToast('success', 'Catalogue mis à jour')
        }

        upsertDialogRef.current?.close()
        setEditing(null)
    }

    function requestDelete(row) {
        if (!canDelete) {
            showToast('error', 'Suppression non autorisée pour votre rôle.');
            return;
        }
        setCandidateDelete(row)
        deleteDialogRef.current?.showModal()
    }

    function confirmDelete() {
        if (!candidateDelete) return
        if (!canDelete) {
            showToast('error', 'Suppression non autorisée pour votre rôle.');
            return;
        }
        // suppression en cascade
        deleteCatalogueData(candidateDelete.id)

        // supprimer l’entrée catalogue
        const next = sanitizeCatalogues(
            cataloguesRaw.map((c) => (c.id === candidateDelete.id ? applyDeleteAudit(c, user) : c))
        )
        setRefCatalogues(next)
        showToast('success', 'Catalogue et données associées supprimés')
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

    if (refOffers.length === 0) {
        return (
            <div className="p-6">
                <div className="alert alert-warning max-w-2xl">
                    <span>Aucune offre trouvée. Crée d'abord des offres (<span className="font-mono">{LS_OFFRES}</span>) avant d'ajouter des catalogues.</span>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <h1 className="text-2xl font-bold">Administration — Catalogues</h1>
                <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={openCreate} disabled={!canCreate}>
                        + Nouveau catalogue
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col xl:flex-row xl:items-center gap-2">
                <label className="floating-label w-full sm:w-64">
                    <span>Filtrer par offre</span>
                    <select className="select select-bordered" value={offerFilter}
                            onChange={(e) => setOfferFilter(e.target.value)}>
                        <option value="all">Toutes les offres</option>
                        {refOffers.map((o) => (
                            <option key={o.id} value={o.id}>{o.code} — {o.libelle || '—'}</option>
                        ))}
                    </select>
                </label>

                <label className="floating-label w-full sm:w-40">
                    <span>Année</span>
                    <select className="select select-bordered" value={yearFilter}
                            onChange={(e) => setYearFilter(e.target.value)}>
                        <option value="all">Toutes</option>
                        {yearsAvailable.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </label>

                <label className="floating-label w-full sm:w-48">
                    <span>Status</span>
                    <select className="select select-bordered" value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="all">Tous</option>
                        {statusesAvailable.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </label>

                <label className="floating-label w-full xl:w-96 xl:ml-2">
                    <span>Rechercher</span>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        type="text"
                        className="input input-bordered w-full font-mono"
                    />
                </label>

                <div className="xl:ml-auto flex items-center gap-4">
                    <label className="label cursor-pointer gap-2">
                        <span className="label-text">Actifs seulement</span>
                        <input type="checkbox" className="toggle" checked={onlyActive}
                               onChange={() => setOnlyActive((v) => !v)}/>
                    </label>
                    <label className="label cursor-pointer gap-2">
                        <span className="label-text">Plus récents d'abord</span>
                        <input type="checkbox" className="toggle" checked={sortNewestFirst}
                               onChange={() => setSortNewestFirst((v) => !v)}/>
                    </label>
                </div>
            </div>

            {/* Content */}
            <div className="card bg-base-100 shadow-md">
                <div className="card-body p-0">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead>
                            <tr>
                                <th style={{width: 160}}>Offre</th>
                                <th style={{width: 140}}>Risque</th>
                                <th style={{width: 100}}>Année</th>
                                <th style={{width: 120}}>Version</th>
                                <th style={{width: 120}}>Status</th>
                                <th style={{width: 100}}>Validité</th>
                                <th className="text-right" style={{width: 50}}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {pageRows.length === 0 && (
                                <tr>
                                    <td colSpan={7}>
                                        <div className="p-6 text-center opacity-70">Aucun catalogue. Cliquez sur « Nouveau catalogue » pour commencer.</div>
                                    </td>
                                </tr>
                            )}

                            {pageRows.map((c) => {
                                const offer = offerMap.get(c.offre_id)
                                const catIds = cleanCatalogueCatIds(c.cat_personnel_ids)
                                return (
                                    <tr key={c.id}>
                                        <td><div className="badge badge-outline">{offer ? (offer.code || '—') : '—'}</div></td>
                                        <td><div className="font-mono">{c.risque}</div></td>
                                        <td>{c.annee ?? '—'}</td>
                                        <td>
                                            <div className="flex flex-col gap-1">
                                                <div className="font-mono">{c.version}</div>
                                                {enabledCatPersonnel.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {catIds.length > 0 ? catIds.map((id) => {
                                                            const meta = catPersonnelMap.get(id)
                                                            return (
                                                                <span key={id} className="badge badge-outline badge-sm">
                                                                    {meta?.libelle || meta?.code || id}
                                                                </span>
                                                            )
                                                        }) : (
                                                            <span className="badge badge-ghost badge-sm">Tous collèges</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            {String(c.status || '') ? (
                                                <span className={`badge ${String(c.status).toLowerCase() === 'active' ? 'badge-success' : String(c.status).toLowerCase() === 'archived' ? 'badge-ghost' : ''}`}>{c.status}</span>
                                            ) : (
                                                <span className="badge">—</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm">{c.valid_from || '—'} → {c.valid_to || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <div className="join justify-end">
                                                <div className="tooltip" data-tip="modifier">
                                                    <button className="btn btn-sm join-item" onClick={() => openEdit(c)} disabled={!canUpdate}>
                                                        <SquarePen size={16}/>
                                                    </button>
                                                </div>
                                                <div className="tooltip" data-tip="dupliquer">
                                                    <button className="btn btn-sm join-item" onClick={() => duplicateAsNew(c)} disabled={!canCreate}>
                                                        <Copy size={16}/>
                                                    </button>
                                                </div>
                                                <div className="tooltip" data-tip="visualiser">
                                                    <Link href={`/catalogues/${c.id}/visualiser`} className="btn btn-sm join-item">
                                                        <Eye size={16}/>
                                                    </Link>
                                                </div>
                                                <div className="tooltip" data-tip="configurer">
                                                    <Link href={`/catalogues/${c.id}/configure/inline`} className="btn btn-sm join-item">
                                                        <Columns3Cog size={16}/>
                                                    </Link>
                                                </div>
                                                {canDelete && (
                                                    <div className="tooltip" data-tip="supprimer">
                                                        <button className="btn btn-sm btn-error join-item" onClick={() => requestDelete(c)}>
                                                            <Trash2 size={16}/>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
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
                <div className="modal-box w-11/12 max-w-4xl">
                    <h3 className="font-bold text-lg">{editing?.id ? 'Modifier un catalogue' : 'Nouveau catalogue'}</h3>
                    <fieldset className="fieldset bg-base-200 border-base-300 rounded-box border p-4" disabled={formDisabled}>
                        <form className="mt-4" onSubmit={submitUpsert}>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                <label className="floating-label md:col-span-12">
                                    <span>Offre <span className="text-error">*</span></span>
                                    <select
                                        className="select select-bordered w-full"
                                        value={editing?.offre_id ?? ''}
                                        onChange={(e) => setEditing((v) => ({...v, offre_id: e.target.value}))}
                                        required
                                    >
                                        <option value="" disabled>Choisir une offre…</option>
                                        {refOffers.map((o) => (
                                            <option key={o.id} value={o.id}>{o.code} — {o.libelle || '—'}</option>
                                        ))}
                                    </select>
                                </label>

                                <label className="floating-label md:col-span-3">
                                    <span>Risque <span className="text-error">*</span></span>
                                    <select
                                        className="select select-bordered w-full"
                                        value={editing?.risque ?? ''}
                                        onChange={(e) => setEditing((v) => ({...v, risque: e.target.value}))}
                                        required
                                    >
                                        <option value="" disabled>Choisir le risque…</option>
                                        <option value="SANTE">Santé</option>
                                        <option value="PREVOYANCE">Prévoyance</option>
                                    </select>
                                </label>

                                <label className="floating-label md:col-span-2">
                                    <span>Année</span>
                                    <input
                                        type="number" min={1900} max={2100}
                                        className="input input-bordered w-full"
                                        value={editing?.annee ?? ''}
                                        onChange={(e) => setEditing((v) => ({ ...v, annee: e.target.value === '' ? '' : Number(e.target.value) }))}
                                        placeholder={String(new Date().getFullYear())}
                                    />
                                </label>

                                <label className="floating-label md:col-span-2">
                                    <span>Version <span className="text-error">*</span></span>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full font-mono"
                                        value={editing?.version ?? ''}
                                        onChange={(e) => setEditing((v) => ({...v, version: e.target.value}))}
                                        required
                                    />
                                </label>

                                <label className="floating-label md:col-span-3">
                                    <span>Status <span className="text-error">*</span></span>
                                    <select
                                        className="select select-bordered w-full"
                                        value={editing?.status ?? ''}
                                        onChange={(e) => setEditing((v) => ({...v, status: e.target.value}))}
                                        required
                                    >
                                        <option value="" disabled>Choisir le status…</option>
                                        <option value="BROUILLON">Brouillon</option>
                                        <option value="ENABLED">Actif</option>
                                        <option value="DISABLED">Désactivé</option>
                                        <option value="ARCHIVED">Archivé</option>
                                    </select>
                                </label>



                                <label className="floating-label md:col-span-3">
                                    <span>Validité — du</span>
                                    <input
                                        type="date"
                                        className="input input-bordered w-full"
                                        value={editing?.valid_from ?? ''}
                                        onChange={(e) => setEditing((v) => ({...v, valid_from: e.target.value}))}
                                    />
                                </label>
                                <label className="floating-label md:col-span-3">
                                    <span>Validité — au</span>
                                    <input
                                        type="date"
                                        className="input input-bordered w-full"
                                        value={editing?.valid_to ?? ''}
                                        onChange={(e) => setEditing((v) => ({...v, valid_to: e.target.value}))}
                                    />
                                </label>

                                <div className="md:col-span-12">
                                    <span className="block text-sm font-medium mb-2">
                                        Collèges <span className="text-error">*</span>
                                    </span>
                                    {enabledCatPersonnel.length > 0 ? (
                                        <div className="flex flex-wrap gap-3">
                                            {enabledCatPersonnel.map((cat) => {
                                                const checked = Array.isArray(editing?.cat_personnel_ids) && editing.cat_personnel_ids.includes(cat.id)
                                                return (
                                                    <label key={cat.id} className="label cursor-pointer gap-2 px-3 py-1 rounded-box border border-base-300 bg-base-100">
                                                        <input
                                                            type="checkbox"
                                                            className="checkbox checkbox-sm"
                                                            checked={checked}
                                                            onChange={(e) => toggleCatSelection(cat.id, e.target.checked)}
                                                        />
                                                        <span className="label-text">{cat.libelle || cat.code}</span>
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="alert alert-warning">
                                            Aucune catégorie de collège disponible. Ajoute des entrées dans le référentiel « Catégories personnel ».
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="modal-action mt-6">
                                <button type="button" className="btn btn-ghost" onClick={() => {
                                    upsertDialogRef.current?.close();
                                    setEditing(null)
                                }}>Annuler</button>
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
                    <h3 className="font-bold text-lg">Supprimer le catalogue ?</h3>
                    <p className="py-2">Cette action est irréversible.</p>
                    <div className="bg-base-200 rounded p-3 font-mono">
                        {candidateDelete ? (
                            <>
                                <div><span className="opacity-70">Offre:</span> {offerMap.get(candidateDelete.offre_id)?.code || '—'}</div>
                                <div><span className="opacity-70">Risque:</span> {candidateDelete.risque}</div>
                                <div><span className="opacity-70">Année:</span> {candidateDelete.annee ?? '—'}</div>
                                <div><span className="opacity-70">Version:</span> {candidateDelete.version}</div>
                            </>
                        ) : '—'}
                    </div>
                    <div className="modal-action">
                        <button className="btn" onClick={cancelDelete}>Annuler</button>
                        <button className="btn btn-error" onClick={confirmDelete} disabled={!canDelete}>Supprimer</button>
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
                <span className="font-mono">localStorage</span> clés: <span className="font-mono">{LS_OFFRES}</span> (offres), <span className="font-mono">{LS_CATALOGUES}</span> (catalogues) — {catalogues.length} catalogues actifs
            </div>
        </div>
    )
}
