'use client';

import {MultiStorageProvider, useMultiStorage} from '@/providers/MultiStorageProvider';
import {defaultSettings, SETTINGS_VERSION} from '@/lib/settings/default';
import { normalizeRisk } from '@/lib/utils/StringUtil';

// util: pick léger
const pick = (obj, keys) =>
    keys.reduce((acc, k) => (k in obj ? (acc[k] = obj[k], acc) : acc), {});

// on découpe defaultSettings en 3 blocs : settings UI, ref_modules_v1, offres
export function sourcesFromDefault(ds) {
    const UI_KEYS = ['version', 'theme', 'locale', 'density', 'apiBaseUrl', 'showBeta'];
    const ui = pick(ds, UI_KEYS);

    const rawNiveauSets = ds.ref_niveau_sets_v1 ?? [];
    const refNiveauSets = rawNiveauSets.map((set) => {
        const fallback = set.id === 'set-prevoyance-unique' ? 'prevoyance' : 'sante';
        const risque = normalizeRisk(set.risque, fallback);
        return { ...set, risque, allow_multiple_niveaux: set.allow_multiple_niveaux === false ? false : true };
    });

    const niveauSetRisk = new Map(refNiveauSets.map((s) => [s.id, s.risque]));

    const rawNiveaux = ds.ref_niveaux_v1 ?? [];
    const refNiveaux = rawNiveaux.map((niv) => {
        const risque = normalizeRisk(niv.risque, niveauSetRisk.get(niv.ref_set_id) || 'sante');
        return { ...niv, risque };
    });

    const rawModules = ds.ref_modules_v1 ?? [];
    const refModules = rawModules.map((mod) => {
        const risque = normalizeRisk(mod.risque, mod.id === 'mod-prev-garanties' ? 'prevoyance' : 'sante');
        return { ...mod, risque };
    });

    const moduleRiskMap = new Map(refModules.map((m) => [m.id, m.risque]));

    const rawCategories = ds.ref_categories_v1 ?? [];
    const refCategories = rawCategories.map((cat) => {
        const risque = normalizeRisk(cat.risque, moduleRiskMap.get(cat.ref_module_id) || 'sante');
        return { ...cat, risque };
    });

    const categoryRiskMap = new Map(refCategories.map((c) => [c.id, c.risque]));

    const rawActs = ds.ref_acts_v1 ?? [];
    const refActs = rawActs.map((act) => {
        const risque = normalizeRisk(act.risque, categoryRiskMap.get(act.ref_categorie_id) || 'sante');
        return { ...act, risque };
    });

    return {
        settings: {default: ui, version: SETTINGS_VERSION},
        ref_niveau_sets_v1: {default: refNiveauSets},
        ref_niveaux_v1: {default: refNiveaux},
        ref_modules_v1: {default: refModules},
        ref_categories_v1: {default: refCategories},
        ref_acts_v1: {default: refActs},
        ref_value_types_v1: { default: ds.ref_value_types_v1 ?? [] },

        // *** NOUVEAU : référentiels tarification
        ref_cat_personnel_v1:  { default: ds.ref_cat_personnel_v1 ?? [] },
        ref_tranches_ages_v1:  { default: ds.ref_tranches_ages_v1 ?? [] },
        ref_regimes_v1:        { default: ds.ref_regimes_v1 ?? [] },

        offres_v1: {default: ds.offres_v1 ?? []},
        catalogues_v1: {default: ds.catalogues_v1 ?? []},
        groupe_actes_membre_v1: {default: ds.groupe_actes_membre_v1 ?? []},
        groupe_valeur_v1: {default: ds.groupe_valeur_v1 ?? []},
        groupe_actes_v1: {default: ds.groupe_actes_v1 ?? []},
        cat_modules_v1: {default: ds.cat_modules_v1 ?? []},
        groupe_ui_state_v1: {default: ds.groupe_ui_state_v1 ?? {}},
    };
}

export function AppDataProvider({children}) {
    const devOverwrite = process.env.NEXT_PUBLIC_DEV_OVERWRITE === '1'
    return (
        <MultiStorageProvider
            namespace="app:"
            overwriteOnLoad={devOverwrite}
            clearNamespaceBeforeOverwrite={devOverwrite}
            sources={sourcesFromDefault(defaultSettings)}
        >
            {children}
        </MultiStorageProvider>
    )
}

/** Hooks confort (facultatifs) */
export function useUISettings() {
    const {data, set, patch, resetKey} = useMultiStorage();
    return {
        settings: data.settings,
        setSettings: (v) => set('settings', v),
        patchSettings: (p) => patch('settings', p),
        resetSettings: () => resetKey('settings'),
    };
}

export function useRefModules() {
    const {data, set, patch, resetKey} = useMultiStorage();
    return {
        refModules: data.ref_modules_v1,
        setRefModules: (v) => set('ref_modules_v1', v),
        patchRefModules: (p) => patch('ref_modules_v1', p), // p = tableau complet ou objet selon ton usage
        resetRefModules: () => resetKey('ref_modules_v1'),
    };
}

export function useRefCategories() {
    const {data, set, patch, resetKey} = useMultiStorage();
    return {
        refCategories: data.ref_categories_v1,
        setRefCategories: (v) => set('ref_categories_v1', v),
        patchRefCategories: (p) => patch('ref_categories_v1', p), // p = tableau complet ou objet selon ton usage
        resetRefCategories: () => resetKey('ref_categories_v1'),
    };
}

export function useRefActs() {
    const {data, set, patch, resetKey} = useMultiStorage();
    return {
        refActs: data.ref_acts_v1,
        setRefActs: (v) => set('ref_acts_v1', v),
        patchRefActs: (p) => patch('ref_acts_v1', p), // p = tableau complet ou objet selon ton usage
        resetRefActs: () => resetKey('ref_acts_v1'),
    };
}

export function useRefOffers() {
    const {data, set, patch, resetKey} = useMultiStorage();
    return {
        refOffers: data.offres_v1,
        setRefOffers: (v) => set('offres_v1', v),
        patchRefOffers: (p) => patch('offres_v1', p),
        resetRefOffers: () => resetKey('offres_v1'),
    };
}

export function useRefCatalogues() {
    const {data, set, patch, resetKey} = useMultiStorage();
    return {
        refCatalogues: data.catalogues_v1,
        setRefCatalogues: (v) => set('catalogues_v1', v),
        patchRefCatalogues: (p) => patch('catalogues_v1', p),
        resetRefCatalogues: () => resetKey('catalogues_v1'),
    };
}

export function useRefNiveau() {
    const {data, set, patch, resetKey} = useMultiStorage();
    return {
        refNiveau: data.ref_niveaux_v1,
        setRefNiveau: (v) => set('ref_niveaux_v1', v),
        patchRefNiveau: (p) => patch('ref_niveaux_v1', p),
        resetRefNiveau: () => resetKey('ref_niveaux_v1'),
    };
}

export function useRefNiveauSets() {
    const {data, set, patch, resetKey} = useMultiStorage();
    return {
        refNiveauSets: data.ref_niveau_sets_v1 || [],
        setRefNiveauSets: (v) => set('ref_niveau_sets_v1', v),
        patchRefNiveauSets: (p) => patch('ref_niveau_sets_v1', p),
        resetRefNiveauSets: () => resetKey('ref_niveau_sets_v1'),
    };
}

export function useGroupActMembre() {
    const {data, set, patch, resetKey} = useMultiStorage();
    return {
        refGroupActMembre: data.groupe_actes_membre_v1,
        setRefGroupActMembre: (v) => set('groupe_actes_membre_v1', v),
        patchRefGroupActMembre: (p) => patch('groupe_actes_membre_v1', p),
        resetRefGroupActMembre: () => resetKey('groupe_actes_membre_v1'),
    };
}

export function useGroupValeur() {
    const {data, set, patch, resetKey} = useMultiStorage();
    return {
        refGroupValeur: data.groupe_valeur_v1,
        setRefGroupValeur: (v) => set('groupe_valeur_v1', v),
        patchRefGroupValeur: (p) => patch('groupe_valeur_v1', p),
        resetRefGroupValeur: () => resetKey('groupe_valeur_v1'),
    };
}

export function useGroupActes() {
    const {data, set, patch, resetKey} = useMultiStorage();
    return {
        refGroupActes: data.groupe_actes_v1,
        setRefGroupActes: (v) => set('groupe_actes_v1', v),
        patchRefGroupActes: (p) => patch('groupe_actes_v1', p),
        resetRefGroupActes: () => resetKey('groupe_actes_v1'),
    };
}

export function useCatModules() {
    const {data, set, patch, resetKey} = useMultiStorage();
    const value = Array.isArray(data.cat_modules_v1) ? data.cat_modules_v1 : [];
    return {
        catModules: value,
        setCatModules: (next) => {
            const resolved = (typeof next === 'function') ? next(value) : next;
            // garde-fou : on évite d’écrire autre chose qu’un tableau
            set('cat_modules_v1', Array.isArray(resolved) ? resolved : []);
        },
        patchCatModules: (p) => patch('cat_modules_v1', p),
        resetCatModules: () => resetKey('cat_modules_v1'),
    };
}

export function useGroupeUIState() {
    const {data, set, patch, resetKey} = useMultiStorage();
    return {
        uiState: data.groupe_ui_state_v1 || {},              // shape: { [groupId]: { locked: bool, acts: string[] } }
        setUIState: (v) => set('groupe_ui_state_v1', v),     // remplace l’objet complet
        patchUIState: (p) => patch('groupe_ui_state_v1', p), // fusion superficielle (selon ton implémentation)
        resetGroupeUIState: () => resetKey('groupe_ui_state_v1'),
    };
}

export function useRefValueTypes() {
    const { data, set, patch, resetKey } = useMultiStorage();
    return {
        refValueTypes: data.ref_value_types_v1 || [],
        setRefValueTypes: (v) => set('ref_value_types_v1', v),
        patchRefValueTypes: (p) => patch('ref_value_types_v1', p),
        resetRefValueTypes: () => resetKey('ref_value_types_v1'),
    };
}

export function useRefCatPersonnel() {
    const {data, set, patch, resetKey} = useMultiStorage();
    const value = Array.isArray(data.ref_cat_personnel_v1) ? data.ref_cat_personnel_v1 : [];
    return {
        refCatPersonnel: value,
        setRefCatPersonnel: (v) => set('ref_cat_personnel_v1', v),
        patchRefCatPersonnel: (p) => patch('ref_cat_personnel_v1', p),
        resetRefCatPersonnel: () => resetKey('ref_cat_personnel_v1'),
    };
}

export function useRefTranchesAges() {
    const {data, set, patch, resetKey} = useMultiStorage();
    const value = Array.isArray(data.ref_tranches_ages_v1) ? data.ref_tranches_ages_v1 : [];
    return {
        refTranchesAges: value,
        setRefTranchesAges: (v) => set('ref_tranches_ages_v1', v),
        patchRefTranchesAges: (p) => patch('ref_tranches_ages_v1', p),
        resetRefTranchesAges: () => resetKey('ref_tranches_ages_v1'),
    };
}

export function useRefRegimes() {
    const {data, set, patch, resetKey} = useMultiStorage();
    const value = Array.isArray(data.ref_regimes_v1) ? data.ref_regimes_v1 : [];
    return {
        refRegimes: value,
        setRefRegimes: (v) => set('ref_regimes_v1', v),
        patchRefRegimes: (p) => patch('ref_regimes_v1', p),
        resetRefRegimes: () => resetKey('ref_regimes_v1'),
    };
}
