'use client';

import {useEffect, useMemo, useState} from 'react';
import {useGroupStore, uuid} from '@/hooks/useGroupData';
import InlineGroupEditor from '@/components/catalogues/inline/InlineGroupEditor';
import ReadonlyGroupMatrix from '@/components/catalogues/inline/ReadonlyGroupMatrix';
import {prefillFromStores, normalizeCell} from '@/lib/utils/CatalogueInline';
import {useGroupeUIState} from '@/providers/AppDataProvider';
import { normalizeRisk } from '@/lib/utils/StringUtil';
import TarifsEditor from '@/components/catalogues/tarifs/TarifsEditor';
import SubItemModal from '@/components/catalogues/inline/SubItemModal';
import {usePermissions} from '@/providers/AuthProvider';

const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
const normalizeSelectionType = (value) => (value === 'checkbox' ? 'checkbox' : 'radio');
const getSelectionTypeForCategory = (group, categoryId) => {
    if (!group) return 'radio';
    if (categoryId && isPlainObject(group.category_selection_types)) {
        const specific = group.category_selection_types[categoryId];
        if (specific === 'checkbox' || specific === 'radio') {
            return specific;
        }
    }
    return normalizeSelectionType(group.selection_type);
};

export default function ModulePanelContainer({
                                                 module,
                                                 catalogueId,
                                                 refNiveau,
                                                 refNiveauSets,
                                                 allowMultipleNiveaux = true,
                                                 selectedNiveauSetIdBase,
                                                 selectedNiveauSetIdSurco,
                                                 selectedNiveauSetId: legacySelectedNiveauSetId = null,
                                                 onChangeNiveauSetBase,
                                                 onChangeNiveauSetSurco,
                                                 onChangeNiveauSet: legacyOnChangeNiveauSet,
                                                 optionDepth,
                                                 onChangeOptionDepth,
                                                 categoriesByModule,
                                                 actsByCategory,
                                                 actMap,
                                                 showToast,
                                                 refs, // { catalogueMap, moduleMap }
                                             }) {
    const {groupes, setGroupes, membres, setMembres, gvaleurs, setGvaleurs, gtarifs, setGtarifs} =
        useGroupStore(refs, {ns: catalogueId});
    const {uiState, patchUIState} = useGroupeUIState();
    const {canCreate, canUpdate, canDelete} = usePermissions();
    const allowWrite = canUpdate;
    const allowRemoval = canDelete;
    const allowCreate = canCreate;
    const notifyDenied = (message) => {
        if (typeof showToast === 'function') {
            showToast('error', message);
        }
    };
    const ensureCanUpdate = () => {
        if (allowWrite) return true;
        notifyDenied('Votre rôle ne permet pas de modifier ce module.');
        return false;
    };
    const ensureCanCreate = () => {
        if (allowCreate) return true;
        notifyDenied('Votre rôle ne permet pas d’ajouter des groupes.');
        return false;
    };
    const ensureCanDelete = () => {
        if (allowRemoval) return true;
        notifyDenied('Votre rôle ne permet pas de supprimer des groupes.');
        return false;
    };

    const niveauSetOptions = useMemo(
        () =>
            (refNiveauSets || [])
                .filter((s) => s && s.is_enabled !== false)
                .sort(
                    (a, b) =>
                        (a.ordre ?? 0) - (b.ordre ?? 0) ||
                        String(a.code || '').localeCompare(String(b.code || ''))
                ),
        [refNiveauSets]
    );
    const niveauSetIdSet = useMemo(() => new Set(niveauSetOptions.map((s) => s.id)), [niveauSetOptions]);

    const moduleRisk = normalizeRisk(module?.risque);
    const moduleAllowsSurco = moduleRisk !== 'prevoyance';
    const allowTarifEditor = moduleRisk === 'sante';
    const setOptionDepthForModule = typeof onChangeOptionDepth === 'function'
        ? (depth) => onChangeOptionDepth(Math.max(0, Math.floor(depth || 0)))
        : null;

    const storedBaseSetId = selectedNiveauSetIdBase ?? legacySelectedNiveauSetId ?? null;
    const resolvedBaseSetId = useMemo(() => {
        if (storedBaseSetId && niveauSetIdSet.has(storedBaseSetId)) return storedBaseSetId;
        return niveauSetOptions[0]?.id || null;
    }, [storedBaseSetId, niveauSetIdSet, niveauSetOptions]);


    const storedSurcoSetId = allowMultipleNiveaux ? (selectedNiveauSetIdSurco || null) : null;
    const resolvedSurcoSetId = useMemo(() => {
        if (!allowMultipleNiveaux || !moduleAllowsSurco) return null;
        if (
            storedSurcoSetId &&
            storedSurcoSetId !== resolvedBaseSetId &&
            niveauSetIdSet.has(storedSurcoSetId)
        ) {
            return storedSurcoSetId;
        }
        return null;
    }, [allowMultipleNiveaux, moduleAllowsSurco, storedSurcoSetId, niveauSetIdSet, resolvedBaseSetId]);
    const surcoSelectOptions = useMemo(
        () => niveauSetOptions.filter((s) => s.id !== resolvedBaseSetId),
        [niveauSetOptions, resolvedBaseSetId]
    );

    const optionDepthValue = useMemo(() => {
        const parsed = Number(optionDepth);
        if (!Number.isFinite(parsed) || parsed < 0) return 0;
        return Math.floor(parsed);
    }, [optionDepth]);

    // Filtrer les niveaux du set sélectionné
    const niveauxEnabled = useMemo(() => {
        const all = (refNiveau || []).filter(n => !!n.is_enabled);
        const bySet = resolvedBaseSetId ? all.filter(n => n.ref_set_id === resolvedBaseSetId) : all;
        const list = bySet.length > 0 ? bySet : all;
        return list.slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    }, [refNiveau, resolvedBaseSetId]);

    const niveauxBaseList = niveauxEnabled;
    const effectiveNiveauxBase = moduleRisk === 'prevoyance'
        ? (niveauxBaseList.length ? niveauxBaseList.slice(0, 1) : [])
        : niveauxBaseList;
    const niveauxSurcoList = useMemo(() => {
        if (!moduleAllowsSurco) return [];
        if (!allowMultipleNiveaux || !resolvedSurcoSetId) return niveauxBaseList;
        const all = (refNiveau || []).filter((n) => !!n.is_enabled && n.ref_set_id === resolvedSurcoSetId);
        const sorted = all.slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
        return sorted.length > 0 ? sorted : niveauxBaseList;
    }, [moduleAllowsSurco, allowMultipleNiveaux, resolvedSurcoSetId, refNiveau, niveauxBaseList]);

    const baseOptionCount = effectiveNiveauxBase.length;
    const optionsEnabled = allowTarifEditor && optionDepthValue > 0;

    useEffect(() => {
        if (!optionsEnabled || !setOptionDepthForModule) return;
        const required = baseOptionCount;
        if (required <= 0) {
            setOptionDepthForModule(0);
            return;
        }
        if (optionDepthValue !== required) {
            setOptionDepthForModule(required);
        }
    }, [optionsEnabled, baseOptionCount, optionDepthValue, module.id, setOptionDepthForModule]);

    const hasSeparateSurcoSet = moduleAllowsSurco
        && allowMultipleNiveaux
        && resolvedBaseSetId
        && resolvedSurcoSetId
        && resolvedBaseSetId !== resolvedSurcoSetId;
    const allNiveauxForPrefill = useMemo(() => {
        const map = new Map();
        for (const n of effectiveNiveauxBase || []) map.set(n.id, n);
        for (const n of niveauxSurcoList || []) map.set(n.id, n);
        return Array.from(map.values());
    }, [effectiveNiveauxBase, niveauxSurcoList]);

    // changement de set: choix UI purge (optionnelle) des valeurs existantes du module
    const changeBaseSet = onChangeNiveauSetBase || legacyOnChangeNiveauSet;
    function handleChangeSetBase(setId) {
        if (!ensureCanUpdate()) return;
        if (!setId || !niveauSetIdSet.has(setId)) {
            showToast('error', "Groupe de niveaux introuvable — aucun changement appliqué.");
            return;
        }
        if (setId === storedBaseSetId) return;

        const hasLevels = (refNiveau || []).some(
            (n) => !!n.is_enabled && n.ref_set_id === setId
        );

        if (!hasLevels) {
            showToast('error', "Ce set ne contient aucun niveau actif — aucun changement appliqué.");
            return;
        }

        // ❌ plus de purge ici : on garde toutes les valeurs en LS
        if (!changeBaseSet) return;
        changeBaseSet(setId);
        showToast('success', 'Catégorie de niveaux appliquée au module');
    }

    function handleChangeSetSurco(rawValue) {
        if (!allowMultipleNiveaux || !moduleAllowsSurco) return;
        if (!ensureCanUpdate()) return;
        const next = rawValue || null;
        if (next && !niveauSetIdSet.has(next)) {
            showToast('error', "Groupe Surco introuvable — aucun changement appliqué.");
            return;
        }
        if (next === storedSurcoSetId) return;

        if (next) {
            const hasLevels = (refNiveau || []).some(
                (n) => !!n.is_enabled && n.ref_set_id === next
            );
            if (!hasLevels) {
                showToast('error', "Ce set Surco ne contient aucun niveau actif — aucun changement appliqué.");
                return;
            }
        }

        if (!onChangeNiveauSetSurco) return;
        onChangeNiveauSetSurco(next);
        showToast('success', next ? 'Groupe Surco appliqué au module' : 'Surco alignée sur la Base');
    }

    function handleToggleOptions(enabled) {
        if (!allowTarifEditor || !setOptionDepthForModule) return;
        if (!ensureCanUpdate()) return;
        if (enabled) {
            if (baseOptionCount <= 0) {
                showToast('error', "Aucun niveau disponible pour définir des options.");
                return;
            }
            setOptionDepthForModule(baseOptionCount);
            showToast('success', 'Options activées');
        } else {
            setOptionDepthForModule(0);
            showToast('info', 'Options désactivées');
        }
    }


    // 🔎 Tri avec ordre → priorite → nom (au cas où un groupe n’a pas encore d’ordre)
    const myGroups = useMemo(
        () =>
            (groupes || [])
                .filter((g) => g.catalogue_id === catalogueId && g.ref_module_id === module.id)
                .sort(
                    (a, b) =>
                        (a.ordre ?? 1e9) - (b.ordre ?? 1e9) ||
                        (a.priorite ?? 0) - (b.priorite ?? 0) ||
                        a.nom.localeCompare(b.nom)
                ),
        [groupes, catalogueId, module.id]
    );
    const catGroupIds = useMemo(
        () => new Set((groupes || []).filter(g => g.catalogue_id === catalogueId).map(g => g.id)),
        [groupes, catalogueId]
    );
    // ✅ Tous les act_id déjà utilisés par n'importe quel groupe de ce catalogue
    const usedActIdsInCatalogue = useMemo(() => {
        const s = new Set();
        for (const m of (membres || [])) {
            if (catGroupIds.has(m.groupe_id)) s.add(m.act_id);
        }
        return s;
    }, [membres, catGroupIds]);

    // 👉 si certains groupes n’ont pas d’ordre, on les indexe 1..n (effet, pas pendant le render)
    useEffect(() => {
        if (myGroups.length === 0) return;
        const missing = myGroups.some((g) => !Number.isFinite(Number(g.ordre)));
        if (!missing) return;

        setGroupes((prev) => {
            // recalcul uniquement pour ce module
            const mine = (prev || [])
                .filter((g) => g.catalogue_id === catalogueId && g.ref_module_id === module.id)
                .sort(
                    (a, b) =>
                        (a.ordre ?? 1e9) - (b.ordre ?? 1e9) ||
                        (a.priorite ?? 0) - (b.priorite ?? 0) ||
                        a.nom.localeCompare(b.nom)
                );

            const withOrder = new Map(mine.map((g, i) => [g.id, i + 1]));
            return (prev || []).map((g) =>
                g.catalogue_id === catalogueId && g.ref_module_id === module.id
                    ? {...g, ordre: withOrder.get(g.id)}
                    : g
            );
        });
    }, [myGroups.length, catalogueId, module.id, setGroupes]); // dépendances OK

    const [createOpen, setCreateOpen] = useState(false);
    const [actPickerFor, setActPickerFor] = useState(null);
    const [tarifEditorGroupId, setTarifEditorGroupId] = useState(null);
    const [subItemModal, setSubItemModal] = useState(null); // { groupId, parentAct, subItem? }
    const [labelModal, setLabelModal] = useState(null); // { groupId, category, labelId, name, selectedActs, acts }
    const [typeModal, setTypeModal] = useState(null); // { groupId, categoryId?, value }

    const allowSubItems = false;
    const readOnly = !allowWrite;

    useEffect(() => {
        if (tarifEditorGroupId && (!allowTarifEditor || !myGroups.some((g) => g.id === tarifEditorGroupId))) {
            setTarifEditorGroupId(null);
        }
    }, [tarifEditorGroupId, allowTarifEditor, myGroups]);

    const editingTarifGroup = useMemo(
        () => myGroups.find((g) => g.id === tarifEditorGroupId) || null,
        [tarifEditorGroupId, myGroups]
    );
    const editingTarifRowsBase = useMemo(() => {
        if (!editingTarifGroup) return [];
        return (gtarifs || [])
            .filter((row) => row.groupe_id === editingTarifGroup.id && row.kind !== 'surco')
            .map((row) => ({...row}));
    }, [gtarifs, editingTarifGroup]);
    const editingTarifRowsSurco = useMemo(() => {
        if (!editingTarifGroup) return [];
        return (gtarifs || [])
            .filter((row) => row.groupe_id === editingTarifGroup.id && row.kind === 'surco')
            .map((row) => ({...row}));
    }, [gtarifs, editingTarifGroup]);

    function setLocked(gid, locked) {
        if (!locked && !ensureCanUpdate()) return;
        const curr = uiState[gid] || {};
        patchUIState({[gid]: {...curr, locked: !!locked}});
    }

    function openTarifModal(groupId) {
        if (!ensureCanUpdate()) return;
        setTarifEditorGroupId(groupId);
    }
    function closeTarifModal() {
        setTarifEditorGroupId(null);
    }
    function saveTarifs(groupId, rows) {
        if (!ensureCanUpdate()) return;
        setGtarifs((prev) => {
            const others = (prev || []).filter((row) => row.groupe_id !== groupId);
            return [...others, ...(rows || [])];
        });
        showToast('success', 'Tarifs enregistrés');
        setTarifEditorGroupId(null);
    }

    function openSubItemModal(groupId, parentAct, subItem = null) {
        if (!allowSubItems || !parentAct?.id) return;
        if (!ensureCanUpdate()) return;
        setSubItemModal({ groupId, parentAct, subItem });
    }

    function closeSubItemModal() {
        setSubItemModal(null);
    }

    function saveSubItem({ groupId, parentActId, subItemId, libelle, description, field_type }) {
        if (!ensureCanUpdate()) return;
        setGroupes((prev) =>
            (prev || []).map((g) => {
                if (g.id !== groupId) return g;
                const next = Array.isArray(g.sub_items) ? [...g.sub_items] : [];
                if (subItemId) {
                    const idx = next.findIndex((si) => si.id === subItemId);
                    if (idx >= 0) next[idx] = {...next[idx], libelle, description, field_type};
                } else {
                    next.push({
                        id: uuid(),
                        parent_act_id: parentActId,
                        libelle,
                        description,
                        field_type,
                    });
                }
                return {...g, sub_items: next};
            })
        );
        showToast('success', subItemId ? 'Sous-item modifié' : 'Sous-item ajouté');
        setSubItemModal(null);
    }

    function removeSubItem(groupId, subItemId) {
        if (!allowSubItems) return;
        if (!ensureCanUpdate()) return;
        setGroupes((prev) =>
            (prev || []).map((g) => {
                if (g.id !== groupId) return g;
                return {...g, sub_items: (g.sub_items || []).filter((si) => si.id !== subItemId)};
            })
        );
        setGvaleurs((prev) => (prev || []).filter((v) => v.act_id !== subItemId));
        showToast('info', 'Sous-item supprimé');
    }

    function getAvailableActsForCategory(group, category, keepActIds = []) {
        if (!group?.id || !category?.id) return [];
        const keepSet = new Set(keepActIds || []);
        const memberIds = new Set((membres || []).filter((m) => m.groupe_id === group.id).map((m) => m.act_id));
        const actsInCategory = (actsByCategory.get(category.id) || []).filter((act) => memberIds.has(act.id));
        const entries = Array.isArray(group.category_groups?.[category.id]) ? group.category_groups[category.id] : [];
        const usedActIds = new Set();
        for (const entry of entries) {
            if (!Array.isArray(entry?.actIds)) continue;
            for (const actId of entry.actIds) {
                if (!keepSet.has(actId)) usedActIds.add(actId);
            }
        }
        return actsInCategory.filter((act) => !usedActIds.has(act.id));
    }

    function openCategoryLabelModal(group, category) {
        if (!ensureCanUpdate()) return;
        const availableActs = getAvailableActsForCategory(group, category, []);
        if (availableActs.length === 0) {
            showToast('info', "Toutes les garanties de cette catégorie sont déjà regroupées.");
            return;
        }
        setLabelModal({
            groupId: group.id,
            category,
            labelId: null,
            name: '',
            selectedActs: [],
            acts: availableActs,
        });
    }

    function openEditCategoryLabel(group, category, label) {
        if (!ensureCanUpdate()) return;
        const keepIds = Array.isArray(label?.actIds) ? label.actIds : [];
        const availableActs = getAvailableActsForCategory(group, category, keepIds);
        if (availableActs.length === 0) {
            showToast('info', "Aucune garantie disponible pour modifier ce regroupement.");
            return;
        }
        setLabelModal({
            groupId: group.id,
            category,
            labelId: label.id,
            name: label.libelle || '',
            selectedActs: keepIds.slice(),
            acts: availableActs,
        });
    }

    function deleteCategoryLabel(group, category, label) {
        if (!ensureCanUpdate()) return;
        const labelId = label?.id;
        if (!group?.id || !category?.id || !labelId) return;
        if (typeof window !== 'undefined') {
            const ok = window.confirm(`Supprimer le regroupement "${label?.libelle || ''}" ? Les garanties redeviennent disponibles.`);
            if (!ok) return;
        }
        setGroupes((prev) =>
            (prev || []).map((g) => {
                if (g.id !== group.id) return g;
                const current = {...(g.category_groups || {})};
                const arr = Array.isArray(current[category.id]) ? current[category.id].filter((lbl) => lbl.id !== labelId) : [];
                if (arr.length > 0) current[category.id] = arr;
                else delete current[category.id];
                return {...g, category_groups: current};
            })
        );
        showToast('info', 'Regroupement supprimé');
    }

    function closeCategoryLabelModal() {
        setLabelModal(null);
    }

    function toggleCategoryLabelAct(actId) {
        setLabelModal((prev) => {
            if (!prev) return prev;
            const exists = prev.selectedActs.includes(actId);
            return {
                ...prev,
                selectedActs: exists ? prev.selectedActs.filter((id) => id !== actId) : [...prev.selectedActs, actId],
            };
        });
    }

    function saveCategoryLabelModal() {
        if (!ensureCanUpdate()) return;
        if (!labelModal) return;
        const libelle = String(labelModal.name || '').trim();
        if (!libelle) {
            showToast('error', 'Libellé requis.');
            return;
        }
        if (!labelModal.selectedActs || labelModal.selectedActs.length === 0) {
            showToast('error', 'Sélectionnez au moins une garantie.');
            return;
        }
        const catId = labelModal.category?.id;
        if (!catId) {
            showToast('error', 'Catégorie inconnue.');
            return;
        }
        setGroupes((prev) =>
            (prev || []).map((g) => {
                if (g.id !== labelModal.groupId) return g;
                const currentGroups = g.category_groups || {};
                const list = Array.isArray(currentGroups[catId]) ? currentGroups[catId].slice() : [];
                if (labelModal.labelId) {
                    const idx = list.findIndex((lbl) => lbl.id === labelModal.labelId);
                    if (idx >= 0) {
                        list[idx] = {
                            ...list[idx],
                            libelle,
                            actIds: labelModal.selectedActs.slice(),
                        };
                    } else {
                        list.push({
                            id: labelModal.labelId,
                            libelle,
                            actIds: labelModal.selectedActs.slice(),
                        });
                    }
                } else {
                    list.push({
                        id: uuid(),
                        libelle,
                        actIds: labelModal.selectedActs.slice(),
                    });
                }
                return {
                    ...g,
                    category_groups: {
                        ...currentGroups,
                        [catId]: list,
                    },
                };
            })
        );
        showToast('success', labelModal.labelId ? 'Regroupement mis à jour' : 'Regroupement créé');
        setLabelModal(null);
    }

    function openTypeModal(group, category = null) {
        if (moduleRisk !== 'prevoyance' || !group?.id) return;
        if (!ensureCanUpdate()) return;
        const catId = category?.id || null;
        setTypeModal({
            groupId: group.id,
            groupName: group.nom || '',
            name: group.nom || '',
            categoryId: catId,
            categoryName: category?.libelle || (catId ? 'Sans libellé' : ''),
            value: getSelectionTypeForCategory(group, catId),
        });
    }

    function closeTypeModal() {
        setTypeModal(null);
    }

    function saveGroupType(value) {
        if (!typeModal?.groupId) return;
        if (!ensureCanUpdate()) return;
        const selection = normalizeSelectionType(value || typeModal.value || 'radio');
        setGroupes((prev) =>
            (prev || []).map((g) => {
                if (g.id !== typeModal.groupId) return g;
                if (typeModal.categoryId) {
                    const defaultType = normalizeSelectionType(g.selection_type);
                    const currentMap = isPlainObject(g.category_selection_types) ? {...g.category_selection_types} : {};
                    if (selection === defaultType) {
                        delete currentMap[typeModal.categoryId];
                    } else {
                        currentMap[typeModal.categoryId] = selection;
                    }
                    const nextMap = Object.keys(currentMap).length ? currentMap : {};
                    return {
                        ...g,
                        category_selection_types: nextMap,
                    };
                }
                return {
                    ...g,
                    selection_type: selection,
                };
            })
        );
        setTypeModal(null);
        const scopeLabel = typeModal?.categoryName
            ? `Type mis à jour pour ${typeModal.categoryName}`
            : 'Type de groupe mis à jour';
        showToast('success', scopeLabel);
    }


    // ===== helpers ordre
    function nextOrderForModule(list = myGroups) {
        const max = list.reduce((acc, g) => Math.max(acc, Number.isFinite(Number(g.ordre)) ? g.ordre : 0), 0);
        return max + 1;
    }

    function reindexOrders1toN(prev) {
        const mine = (prev || [])
            .filter((g) => g.catalogue_id === catalogueId && g.ref_module_id === module.id)
            .sort(
                (a, b) =>
                    (a.ordre ?? 1e9) - (b.ordre ?? 1e9) ||
                    (a.priorite ?? 0) - (b.priorite ?? 0) ||
                    a.nom.localeCompare(b.nom)
            );
        const index = new Map(mine.map((g, i) => [g.id, i + 1]));
        return (prev || []).map((g) =>
            g.catalogue_id === catalogueId && g.ref_module_id === module.id
                ? {...g, ordre: index.get(g.id)}
                : g
        );
    }

    function moveGroup(gid, dir) {
        if (!ensureCanUpdate()) return;
        setGroupes((prev) => {
            const mine = (prev || [])
                .filter((g) => g.catalogue_id === catalogueId && g.ref_module_id === module.id)
                .sort((a, b) => (a.ordre ?? 1e9) - (b.ordre ?? 1e9) || a.nom.localeCompare(b.nom));

            const idx = mine.findIndex((g) => g.id === gid);
            const tgt = dir === 'up' ? idx - 1 : idx + 1;
            if (idx < 0 || tgt < 0 || tgt >= mine.length) return prev;

            const A = mine[idx];
            const B = mine[tgt];

            return reindexOrders1toN(
                (prev || []).map((g) => {
                    if (g.id === A.id) return {...g, ordre: B.ordre};
                    if (g.id === B.id) return {...g, ordre: A.ordre};
                    return g;
                })
            );
        });
    }

    // === création
    function createGroup({groupe, selectedActs}) {
        if (!ensureCanCreate()) return;
        const gid = groupe.id || uuid();
        const payload = {
            id: gid,
            catalogue_id: catalogueId,
            ref_module_id: module.id,
            nom: String(groupe.nom || '').trim(),
            priorite: Number(groupe.priorite) || 100,
            // 🔑 ordre : fin de liste du module
            ordre: nextOrderForModule(),
            cat_order: (categoriesByModule.get(module.id) || [])
                .slice()
                .sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || a.code.localeCompare(b.code))
                .map((c) => c.id),
            category_groups: groupe.category_groups || {},
            selection_type: normalizeSelectionType(groupe.selection_type),
            category_selection_types: isPlainObject(groupe.category_selection_types)
                ? {...groupe.category_selection_types}
                : {},
        };
        setGroupes([...(groupes || []), payload]);

        const actsRefSorted = selectedActs
            .map((id) => actMap.get(id))
            .filter(Boolean)
            .sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || a.code.localeCompare(b.code))
            .map((a) => a.id);

        const nextMembers = actsRefSorted.map((actId, i) => ({
            groupe_id: gid,
            act_id: actId,
            ordre: i + 1,
        }));
        setMembres([...(membres || []), ...nextMembers]);

        setLocked(gid, false);
        showToast('success', 'Groupe créé — configure la grille');
        setCreateOpen(false);
    }

    // === maj actes
    function updateActsForGroup(gid, {groupe, selectedActs}) {
        setGroupes((prev) =>
            prev.map((g) =>
                g.id === gid ? {
                    ...g,
                    nom: String(groupe.nom || '').trim(),
                    priorite: Number(groupe.priorite) || 100,
                    category_groups: groupe.category_groups || {},
                    selection_type: normalizeSelectionType(g.selection_type),
                    category_selection_types: isPlainObject(g.category_selection_types)
                        ? {...g.category_selection_types}
                        : {},
                } : g
            )
        );

        const current = (membres || []).filter((m) => m.groupe_id === gid).map((m) => m.act_id);
        const keep = selectedActs.filter((id) => current.includes(id));
        const add = selectedActs.filter((id) => !current.includes(id));
        const removed = current.filter((id) => !selectedActs.includes(id));

        setGvaleurs((prev) => prev.filter((v) => v.groupe_id !== gid || !removed.includes(v.act_id)));

        const currentRows = (membres || [])
            .filter((m) => m.groupe_id === gid)
            .sort((a, b) => (a.ordre || 1e9) - (b.ordre || 1e9));

        const byActId = new Map(currentRows.map((row) => [row.act_id, row]));
        const keepSorted = currentRows.filter((r) => keep.includes(r.act_id)).map((r) => r.act_id);
        const addSorted = add
            .map((id) => actMap.get(id))
            .filter(Boolean)
            .sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || a.code.localeCompare(b.code))
            .map((a) => a.id);

        const finalOrder = [...keepSorted, ...addSorted];

        const others = (membres || []).filter((m) => m.groupe_id !== gid);
        const nextMembers = finalOrder.map((actId, i) => {
            const existing = byActId.get(actId);
            if (existing) return {...existing, ordre: i + 1};
            return {
                groupe_id: gid,
                act_id: actId,
                ordre: i + 1,
            };
        });
        setMembres([...others, ...nextMembers]);

        showToast('success', 'Actes du groupe mis à jour');
        setActPickerFor(null);
    }

    const cellHasContent = (cell) => {
        if (!cell) return false;
        if (cell.depends_on && cell.depends_on.act_id) return true;
        const valueStr = typeof cell.value === 'string' ? cell.value.trim() : '';
        if (valueStr.length > 0) return true;
        const exprStr = typeof cell.expression === 'string' ? cell.expression.trim() : '';
        if (exprStr.length > 0) return true;
        if (cell.data && typeof cell.data === 'object') {
            return Object.values(cell.data).some((val) => {
                if (val === null || val === undefined) return false;
                if (typeof val === 'boolean') return val;
                if (typeof val === 'number') return true;
                if (typeof val === 'string') return val.trim().length > 0;
                if (Array.isArray(val)) return val.length > 0;
                if (typeof val === 'object') return Object.keys(val).length > 0;
                return false;
            });
        }
        return false;
    };

    // === sauvegarde grille
    function saveGrid(g, {catOrderSelected, orderByAct, valuesByAct}) {
        if (!ensureCanUpdate()) return;
        // 1) cat_order
        setGroupes((prev) =>
            prev.map((x) =>
                x.id === g.id
                    ? {
                        ...x,
                        cat_order:
                            Array.isArray(catOrderSelected) && catOrderSelected.length > 0 ? catOrderSelected : x.cat_order || [],
                    }
                    : x
            )
        );

        // 2) membres (réordonner)
        setMembres((prev) => {
            const others = prev.filter((m) => m.groupe_id !== g.id);
            const mine = prev.filter((m) => m.groupe_id === g.id).sort((a, b) => (a.ordre || 1e9) - (b.ordre || 1e9));
            if (mine.length === 0) return prev;

            const byId = new Map(mine.map((m) => [m.act_id, m]));
            const covered = new Set();

            const orderedFromPayload = Object.keys(orderByAct || {})
                .filter((actId) => byId.has(actId))
                .sort((a, b) => (orderByAct[a] ?? 1e9) - (orderByAct[b] ?? 1e9));

            orderedFromPayload.forEach((id) => covered.add(id));

            const leftovers = mine
                .filter((m) => !covered.has(m.act_id))
                .sort((a, b) => (a.ordre || 1e9) - (b.ordre || 1e9))
                .map((m) => m.act_id);

            const finalOrder = [...orderedFromPayload, ...leftovers];

            const reordered = finalOrder.map((actId, i) => {
                const row = byId.get(actId);
                return {...row, ordre: i + 1};
            });

            return [...others, ...reordered];
        });

        // 3) valeurs
        if (valuesByAct && Object.keys(valuesByAct).length > 0) {
            setGvaleurs((prev) => {
                const rest = prev.filter((v) => v.groupe_id !== g.id);
                const rows = [];
                for (const [actId, perLevel] of Object.entries(valuesByAct || {})) {
                    for (const [nivId, pair] of Object.entries(perLevel || {})) {
                        const baseVal = pair?.baseVal || {};
                        const surcoVal = pair?.surcoVal || {};
                        const hasBase = cellHasContent(baseVal);
                        const hasSurc = cellHasContent(surcoVal);
                        if (hasBase) rows.push(normalizeCell(g.id, actId, nivId, 'base', baseVal));
                        if (hasSurc) rows.push(normalizeCell(g.id, actId, nivId, 'surco', surcoVal));
                        if (optionsEnabled && pair?.options) {
                            for (const [optLevelId, optVal] of Object.entries(pair.options)) {
                                if (!optLevelId || !cellHasContent(optVal)) continue;
                                rows.push(normalizeCell(g.id, actId, optLevelId, `option-${optLevelId}`, optVal));
                            }
                        }
                    }
                }
                return [...rest, ...rows];
            });
        }

        setLocked(g.id, true);
        showToast('success', 'Grille enregistrée');
        if (actPickerFor === g.id) setActPickerFor(null);
    }

    function requestDelete(g) {
        if (!ensureCanDelete()) return;
        if (!confirm('Supprimer ce groupe ?')) return;
        setGroupes((prev) => {
            const kept = (prev || []).filter((x) => x.id !== g.id);
            return reindexOrders1toN(kept);
        });
        setMembres((membres || []).filter((m) => m.groupe_id !== g.id));
        setGvaleurs((gvaleurs || []).filter((v) => v.groupe_id !== g.id));
        if (actPickerFor === g.id) setActPickerFor(null);
        showToast('success', 'Groupe supprimé');
    }

    // ===== UI
    return (
        <div className="space-y-4">
            {/* Header module */}
            <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-xl font-semibold">
                    Module : {module?.libelle}
                </h2>
                <div className="flex flex-wrap items-end gap-3">
                    {/* Sélecteur de catégorie de niveaux */}
                    <div className="form-control min-w-[220px]">
                        <label className="label py-0">
                            <span className="label-text text-xs opacity-70">Groupe de niveaux</span>
                        </label>
                        <select
                            className="select select-bordered select-sm"
                            value={resolvedBaseSetId || ''}
                            disabled={niveauSetOptions.length === 0 || readOnly}
                            onChange={(e) => handleChangeSetBase(e.target.value || null)}
                        >
                            {niveauSetOptions.length === 0 && (
                                <option value="">Aucun groupe disponible</option>
                            )}
                            {niveauSetOptions.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.code} — {s.libelle}
                                </option>
                            ))}
                        </select>
                    </div>

                    {allowMultipleNiveaux && moduleAllowsSurco && (
                        <div className="form-control min-w-[220px]">
                            <label className="label py-0">
                                <span className="label-text text-xs opacity-70">Surcomplémentaire</span>
                            </label>
                            <select
                                className="select select-bordered select-sm"
                                value={resolvedSurcoSetId || ''}
                                disabled={readOnly}
                                onChange={(e) => handleChangeSetSurco(e.target.value || '')}
                            >
                                <option value="">Suivre la Base</option>
                                {surcoSelectOptions.map((s) => (
                                    <option key={`surco-${s.id}`} value={s.id}>
                                        {s.code} — {s.libelle}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {typeof onChangeOptionDepth === 'function' && allowTarifEditor && (
                        <label className="label cursor-pointer gap-2">
                            <span className="label-text text-xs opacity-70">Définir les valeurs d'options</span>
                            <input
                                type="checkbox"
                                className="toggle toggle-sm"
                                checked={optionsEnabled}
                                disabled={!allowTarifEditor || baseOptionCount === 0 || readOnly}
                                onChange={(e) => handleToggleOptions(e.target.checked)}
                            />
                        </label>
                    )}

                    {allowCreate && (
                        <div className="join">
                            {!createOpen && (
                                <button className="btn btn-primary join-item" onClick={() => setCreateOpen(true)}>
                                    + Nouveau groupe
                                </button>
                            )}
                            {createOpen && (
                                <button className="btn btn-ghost join-item" onClick={() => setCreateOpen(false)}>
                                    Annuler
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Barre d’ordre des groupes (▲ ▼) */}
            {myGroups.length > 0 && (
                <div className="card bg-base-100 shadow-sm">
                    <div className="card-body p-3">
                        <div className="font-semibold mb-2">Ordre des groupes (dans ce module)</div>
                        <div className="space-y-2">
                            {myGroups.map((g, idx) => {
                                const isFirst = idx === 0;
                                const isLast = idx === myGroups.length - 1;
                                return (
                                    <div key={g.id}
                                         className="flex items-center gap-3 border border-base-300 rounded-box p-2">
                                        <div className="join">
                                            <button
                                                type="button"
                                                className="btn btn-xs join-item"
                                                disabled={isFirst || readOnly}
                                                onClick={() => moveGroup(g.id, 'up')}
                                                title="Monter"
                                                aria-label="Monter"
                                            >
                                                ▲
                                            </button>
                                            <span className="btn btn-xs btn-ghost join-item w-10 justify-center">
                        {g.ordre ?? idx + 1}
                      </span>
                                            <button
                                                type="button"
                                                className="btn btn-xs join-item"
                                                disabled={isLast || readOnly}
                                                onClick={() => moveGroup(g.id, 'down')}
                                                title="Descendre"
                                                aria-label="Descendre"
                                            >
                                                ▼
                                            </button>
                                        </div>
                                        <div className="badge badge-outline">{g.nom}</div>
                                        {/*<div className="opacity-60 text-xs">Priorité {g.priorite}</div>*/}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="opacity-60 text-xs mt-2">
                            L’ordre ci-dessus détermine l’affichage des cartes de groupe pour ce module.
                        </div>
                    </div>
                </div>
            )}

            {/* Création */}
            {allowCreate && createOpen && (
                <InlineGroupEditor
                    key="creator"
                    module={module}
                    catalogueId={catalogueId}
                    categoriesByModule={categoriesByModule}
                    actsByCategory={actsByCategory}
                    onSave={createGroup}
                    onCancel={() => setCreateOpen(false)}
                    disabledActIds={usedActIdsInCatalogue}
                />
            )}

            {/* Groupes */}
            {myGroups.length === 0 && !createOpen && (
                <div className="alert alert-info">Aucun groupe pour ce module. Clique sur « Nouveau groupe ».</div>
            )}

            {myGroups.map((g) => {
                const pref = prefillFromStores(g, membres, gvaleurs, allNiveauxForPrefill);
                const locked = !!uiState[g.id]?.locked;
                const subItems = Array.isArray(g.sub_items)
                    ? g.sub_items.filter((si) => si.parent_act_id && si.libelle)
                    : [];
                const isPrevModule = moduleRisk === 'prevoyance';
                const categoryGroups = isPrevModule && g.category_groups ? g.category_groups : null;
                const canManageLabels = isPrevModule && !locked && allowWrite;
                const subItemsByParent = new Map();
                for (const si of subItems) {
                    if (!subItemsByParent.has(si.parent_act_id)) subItemsByParent.set(si.parent_act_id, []);
                    subItemsByParent.get(si.parent_act_id).push(si);
                }
                return (
                    <div key={g.id} className="card bg-base-100 shadow-md relative group">
                        <div className="card-body p-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="text-lg font-semibold">Groupe : {g.nom}</div>
                                {/*<div className="badge">Priorité {g.priorite}</div>*/}
                                <div className="ml-auto join">

                                    {!locked && actPickerFor === g.id && (
                                        <button className="btn btn-sm join-item" onClick={() => setActPickerFor(null)}>
                                            Fermer actes
                                        </button>
                                    )}

                                    {locked ? (
                                        <>

                                            {allowTarifEditor && allowWrite && (
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-secondary join-item opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity"
                                                    onClick={() => openTarifModal(g.id)}
                                                >
                                                    Tarification
                                                </button>
                                            )}

                                            {allowWrite && (
                                                <button
                                                    className="btn btn-sm btn-info join-item opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity"
                                                    aria-label="Modifier la grille"
                                                    onClick={() => setLocked(g.id, false)}
                                                >
                                                    ✎ Edition
                                                </button>
                                            )}
                                        </>

                                    ) : (
                                        <>
                                            {allowWrite && (
                                                <button className="btn btn-sm join-item"
                                                        onClick={() => setActPickerFor(g.id)}>
                                                    Choisir actes
                                                </button>
                                            )}
                                            {allowRemoval && (
                                                <button className="btn btn-sm btn-error join-item"
                                                        onClick={() => requestDelete(g)}>
                                                    Supprimer
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Act picker */}
                            {allowWrite && !locked && actPickerFor === g.id && (
                                <div className="mb-4">
                                    <InlineGroupEditor
                                        module={module}
                                        catalogueId={catalogueId}
                                        categoriesByModule={categoriesByModule}
                                        actsByCategory={actsByCategory}
                                        initial={pref}
                                        onSave={(payload) => updateActsForGroup(g.id, payload)}
                                        onCancel={() => setActPickerFor(null)}
                                    />
                                </div>
                            )}

                            {/* Matrice */}
                            <ReadonlyGroupMatrix
                                editable={allowWrite && !locked}
                                group={g}
                                module={module}
                                niveaux={allNiveauxForPrefill}
                                niveauxBase={effectiveNiveauxBase}
                                niveauxSurco={moduleAllowsSurco ? niveauxSurcoList : []}
                                separateSets={moduleAllowsSurco && hasSeparateSurcoSet}
                                allowSurco={moduleAllowsSurco}
                                optionsEnabled={optionsEnabled}
                                optionLevels={effectiveNiveauxBase}
                                allowSubItems={allowSubItems && allowWrite}
                                subItemsMap={subItemsByParent}
                                onAddSubItem={allowSubItems && allowWrite ? ({ act, subItem }) => openSubItemModal(g.id, act, subItem || null) : undefined}
                                onRemoveSubItem={allowSubItems && allowWrite ? (subId) => removeSubItem(g.id, subId) : undefined}
                                categoriesByModule={categoriesByModule}
                                actsByCategory={actsByCategory}
                                categoryGroups={categoryGroups}
                                onAddCategoryLabel={canManageLabels && allowWrite ? (cat) => openCategoryLabelModal(g, cat) : undefined}
                                onEditCategoryLabel={canManageLabels && allowWrite ? (cat, label) => openEditCategoryLabel(g, cat, label) : undefined}
                                onDeleteCategoryLabel={canManageLabels && allowWrite ? (cat, label) => deleteCategoryLabel(g, cat, label) : undefined}
                                onOpenTypeModal={moduleRisk === 'prevoyance' && allowWrite ? openTypeModal : undefined}
                                membres={membres}
                                gvaleurs={gvaleurs}
                                onSave={(payload) => saveGrid(g, payload)}
                                onCancel={() => setLocked(g.id, true)}
                            />
                        </div>
                    </div>
                );
            })}

            {allowTarifEditor && allowWrite && editingTarifGroup && (
                <TarifsEditor
                    group={editingTarifGroup}
                    niveauxBase={effectiveNiveauxBase}
                    niveauxSurco={moduleAllowsSurco ? niveauxSurcoList : []}
                    allowSurco={moduleAllowsSurco}
                    initialRowsBase={editingTarifRowsBase}
                    initialRowsSurco={editingTarifRowsSurco}
                    onSave={(rows) => saveTarifs(editingTarifGroup.id, rows)}
                    onClose={closeTarifModal}
                />
            )}

            {allowSubItems && allowWrite && subItemModal && (
                <SubItemModal
                    open
                    parentActLabel={subItemModal.parentAct?.libelle || subItemModal.parentAct?.code || ''}
                    initialValue={subItemModal.subItem}
                    onSave={(payload) => saveSubItem({
                        groupId: subItemModal.groupId,
                        parentActId: subItemModal.subItem?.parent_act_id || subItemModal.parentAct?.id,
                        subItemId: subItemModal.subItem?.id,
                        ...payload,
                    })}
                    onClose={closeSubItemModal}
                />
            )}

            {moduleRisk === 'prevoyance' && typeModal && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <h3 className="font-bold text-lg">
                            {typeModal.categoryId
                                ? `Type — ${typeModal.categoryName || 'Sans groupe'}`
                                : `Type du groupe — ${typeModal.groupName || 'Sans titre'}`}
                        </h3>
                        <p className="text-sm opacity-70 mt-1">
                            Groupe : {typeModal.groupName || 'Sans titre'}
                        </p>
                        <div className="space-y-3 mt-4">
                            <div className="border border-base-200 rounded-box p-4">
                                <div className="flex flex-col gap-2 text-sm">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            className="radio radio-sm"
                                            name="grp-type-choice"
                                            checked={typeModal.value !== 'checkbox'}
                                            onChange={() => setTypeModal((prev) => prev ? ({...prev, value: 'radio'}) : prev)}
                                        />
                                        Sélection unique (Bouton radio)
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            className="radio radio-sm"
                                            name="grp-type-choice"
                                            checked={typeModal.value === 'checkbox'}
                                            onChange={() => setTypeModal((prev) => prev ? ({...prev, value: 'checkbox'}) : prev)}
                                        />
                                        Sélections multiples (Checkbox)
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="modal-action">
                            <button className="btn" onClick={closeTypeModal}>Annuler</button>
                            <button className="btn btn-primary" onClick={() => saveGroupType(typeModal.value)}>Enregistrer</button>
                        </div>
                    </div>
                    <button className="modal-backdrop" aria-label="Fermer" onClick={closeTypeModal}/>
                </div>
            )}

            {labelModal && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <h3 className="font-bold text-lg">
                            {labelModal.labelId ? 'Modifier le regroupement' : 'Nouveau regroupement'} — {labelModal.category?.libelle || 'Sans groupe'}
                        </h3>
                        <div className="space-y-4 mt-4">
                            <label className="floating-label">
                                <span>Libellé du regroupement</span>
                                <input
                                    className="input input-bordered w-full"
                                    value={labelModal.name}
                                    onChange={(e) =>
                                        setLabelModal((prev) => prev ? ({ ...prev, name: e.target.value }) : prev)
                                    }
                                    placeholder="Ex: Actes principaux"
                                />
                            </label>
                            <div>
                                <div className="font-semibold text-sm mb-2">Garanties à inclure</div>
                                {labelModal.acts?.length ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-auto pr-1">
                                        {labelModal.acts.map((act) => {
                                            const checked = labelModal.selectedActs.includes(act.id);
                                            return (
                                                <label key={act.id} className={`flex items-center gap-2 p-2 rounded-box border ${checked ? 'border-primary' : 'border-base-300'}`}>
                                                    <input
                                                        type="checkbox"
                                                        className="checkbox checkbox-sm"
                                                        checked={checked}
                                                        onChange={() => toggleCategoryLabelAct(act.id)}
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="text-xs opacity-70 truncate">{act.libelle || act.code || act.id}</div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="alert alert-info">
                                        Aucune garantie de cette catégorie n’est présente dans le groupe.
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-action">
                            <button className="btn" onClick={closeCategoryLabelModal}>Annuler</button>
                            <button
                                className="btn btn-primary"
                                disabled={!labelModal.name.trim() || !labelModal.selectedActs.length}
                                onClick={saveCategoryLabelModal}
                            >
                                Ajouter
                            </button>
                        </div>
                    </div>
                    <button className="modal-backdrop" aria-label="Fermer" onClick={closeCategoryLabelModal}/>
                </div>
            )}

        </div>
    );
}
