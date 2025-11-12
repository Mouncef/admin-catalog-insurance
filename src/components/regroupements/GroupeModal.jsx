'use client'

import {Fragment, useMemo, useRef, useState, useId } from 'react'
import ValueEditor from '@/components/regroupements/ValueEditor'

// props: { dialogRef, initial, onSubmit, onCancel, niveaux, categoriesByModule, actsByCategory }
export default function GroupeModal(props) {
    const {dialogRef, initial, onSubmit, onCancel, niveaux, categoriesByModule, actsByCategory} = props
    const [state, setState] = useState(() => ({
        ...initial,
        membersArr: initial.membersArr ?? Array.from(initial.membersSet || [])
    }))
    const formRef = useRef(null)

    // Niveaux actifs
    const niveauxEnabled = useMemo(
        () => (niveaux || []).filter(n => !!n.is_enabled).sort((a, b) => (a.ordre || 0) - (b.ordre || 0)),
        [niveaux]
    )

    const catForAct = useMemo(() => {
        const m = new Map()
        for (const [catId, arr] of actsByCategory.entries()) {
            for (const a of (arr || [])) m.set(a.id, catId)
        }
        return m
    }, [actsByCategory])

    function moveAct(actId, dir) {
        setState(curr => {
            const arr = [...(curr.membersArr || [])]
            const idx = arr.indexOf(actId)
            if (idx < 0) return curr
            const catId = catForAct.get(actId)
            // cherche la cible la plus proche dans LA MÊME catégorie
            let j = dir === 'up' ? idx - 1 : idx + 1
            while (j >= 0 && j < arr.length && catForAct.get(arr[j]) !== catId) {
                j += (dir === 'up' ? -1 : +1)
            }
            if (j < 0 || j >= arr.length) return curr
                ;
            [arr[idx], arr[j]] = [arr[j], arr[idx]]
            return {...curr, membersArr: arr}
        })
    }

    // Nom unique pour tabs “Niveaux”
    const levelTabsId = useId()
    const levelTabsName = `niv_tabs_${levelTabsId}`
    const [activeLevel, setActiveLevel] = useState(niveauxEnabled[0]?.id || null)

    // Wizard (3 étapes)
    const stepsId = useId()
    const stepsName = `grp_steps_${stepsId}`
    const [step, setStep] = useState(1)

    // État local de l’acte en cours d’édition dans le wizard
    const [currentActId, setCurrentActId] = useState(null)
    const [query, setQuery] = useState('')
    const [error, setError] = useState('')

    // Pour un rendu sélecteur d’actes: acts du module (groupés par catégories)
    const catsOfModule = useMemo(
        () => categoriesByModule.get(state.groupe.ref_module_id) || [],
        [state.groupe.ref_module_id, categoriesByModule]
    )
    const actsOfModule = useMemo(() => {
        const arr = catsOfModule.flatMap(c => (actsByCategory.get(c.id) || []).map(a => ({...a, _cat: c})))
        if (!query.trim()) return arr
        const q = query.trim().toLowerCase()
        return arr.filter(a =>
            a.code.toLowerCase().includes(q) || (a.libelle || '').toLowerCase().includes(q) || (a._cat?.code || '').toLowerCase().includes(q)
        )
    }, [catsOfModule, actsByCategory, query])

    // Sélection des niveaux pour l’acte courant
    const selectedLevelsByAct = useMemo(() => state.selectedLevelsByAct || {}, [state.selectedLevelsByAct])
    const selectedLevelsSet = useMemo(() => {
        return (currentActId && selectedLevelsByAct[currentActId])
            ? selectedLevelsByAct[currentActId]
            : new Set()
    }, [selectedLevelsByAct, currentActId])

    // Helpers de structure
    function ensureActMap(actId) {
        setState(curr => {
            const next = {...(curr.valuesByAct || {})}
            if (!next[actId]) next[actId] = {}
            return {...curr, valuesByAct: next}
        })
    }

    function toggleLevel(levelId) {
        setState(curr => {
            const byAct = {...(curr.selectedLevelsByAct || {})}
            const set = new Set(byAct[currentActId] || [])
            if (set.has(levelId)) {
                set.delete(levelId)
                // supprime les valeurs si on retire le niveau
                const voa = {...(curr.valuesByAct || {})}
                if (voa[currentActId]) {
                    const v = {...voa[currentActId]}
                    delete v[levelId]
                    voa[currentActId] = v
                }
                return {
                    ...curr,
                    selectedLevelsByAct: {...byAct, [currentActId]: set},
                    valuesByAct: {...(curr.valuesByAct || {}), [currentActId]: voa[currentActId]}
                }
            } else {
                set.add(levelId)
                // initialise le conteneur de valeurs
                const voa = {...(curr.valuesByAct || {})}
                const perAct = {...(voa[currentActId] || {})}
                if (!perAct[levelId]) perAct[levelId] = {baseVal: {}, surcoVal: {}}
                return {
                    ...curr,
                    selectedLevelsByAct: {...byAct, [currentActId]: set},
                    valuesByAct: {...voa, [currentActId]: perAct}
                }
            }
        })
    }

    function levelVals(actId, levelId) {
        const voa = state.valuesByAct || {}
        return voa?.[actId]?.[levelId] || {baseVal: {}, surcoVal: {}}
    }

    function setLevelVals(actId, levelId, kind, val) {
        setState(curr => {
            const voa = {...(curr.valuesByAct || {})}
            const perAct = {...(voa[actId] || {})}
            const perLevel = {...(perAct[levelId] || {})}
            perAct[levelId] = {...perLevel, [kind]: val}
            voa[actId] = perAct
            return {...curr, valuesByAct: voa}
        })
    }

    // Validation: BASE obligatoire = (taux || montant || expression) présent
    function baseFilled(v) {
        if (!v) return false
        const hasValue = (v.value || '').trim().length > 0
        const hasExpr = (v.expression || '').trim().length > 0
        return hasValue || hasExpr   // BASE = au moins value OU expression
    }

    // Étapes
    function goStep2() {
        setError('')
        if (!currentActId) {
            setError('Choisis un acte en étape 1.');
            return
        }
        ensureActMap(currentActId)
        setStep(2)
    }

    function goStep3() {
        setError('')
        if (!currentActId) {
            setError('Choisis un acte en étape 1.');
            return
        }
        if (!selectedLevelsSet || selectedLevelsSet.size === 0) {
            setError('Sélectionne au moins un niveau.');
            return
        }
        // active le premier niveau sélectionné
        const first = [...selectedLevelsSet][0]
        setActiveLevel(first)
        setStep(3)
    }

    const toMini = (v) => ({value: v?.commentaire || '', expression: v?.expression || ''})

    function addCurrentActToGroup() {
        setError('')
        if (!currentActId) {
            setError('Choisis un acte.');
            return
        }
        if (!selectedLevelsSet || selectedLevelsSet.size === 0) {
            setError('Sélectionne au moins un niveau.');
            return
        }
        // valider BASE sur chaque niveau choisi
        for (const lvlId of selectedLevelsSet) {
            const base = levelVals(currentActId, lvlId).baseVal
            if (!baseFilled(base)) {
                setError(`BASE obligatoire manquante pour le niveau ${niveauxEnabled.find(n => n.id === lvlId)?.code || lvlId}.`)
                return
            }
        }
        // ok → ajoute aux membres
        setState(curr => {
            const mem = new Set(curr.membersSet || [])
            if (!mem.has(currentActId)) {
                mem.add(currentActId)
                const arr = [...(curr.membersArr || []), currentActId]
                return {...curr, membersSet: mem, membersArr: arr}
            }
            return curr
        })
        // reset wizard pour ajouter un autre acte
        setCurrentActId(null)
        setStep(1)
        setQuery('')
        setError('')
    }

    function removeAct(actId) {
        setState(curr => {
            const mem = new Set(curr.membersSet || [])
            mem.delete(actId)
            const voa = {...(curr.valuesByAct || {})};
            delete voa[actId]
            const arr = (curr.membersArr || []).filter(id => id !== actId)
            const byAct = {...(curr.selectedLevelsByAct || {})};
            delete byAct[actId]
            return {...curr, membersSet: mem, membersArr: arr, valuesByAct: voa, selectedLevelsByAct: byAct}
        })
        if (currentActId === actId) setCurrentActId(null)
    }

    function editAct(actId) {
        // Charger l’acte existant dans le wizard
        setCurrentActId(actId)
        const set = state.selectedLevelsByAct?.[actId]
        if (set && set.size > 0) setActiveLevel([...set][0])
        setStep(2)
        setError('')
    }

    // Rendu
    return (
        <dialog ref={dialogRef} className="modal">
            <div className="modal-box w-11/12 max-w-7xl">
                <h3 className="font-bold text-lg">{state?.groupe?.id ? 'Modifier un groupe' : 'Nouveau groupe'}</h3>

                <form ref={formRef} className="mt-4" onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit(state)
                }}>
                    {/* En-tête (catalogue & module readonly) */}
                    <fieldset className="fieldset bg-base-200 border-base-300 rounded-box border p-4 mb-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            <label className="floating-label md:col-span-9">
                                <span>Nom du groupe <span className="text-error">*</span></span>
                                <input type="text" className="input input-bordered w-full"
                                       value={state.groupe.nom}
                                       onChange={(e) => setState(v => ({
                                           ...v,
                                           groupe: {...v.groupe, nom: e.target.value}
                                       }))}
                                       placeholder="Ex: Soins courants — Analyses" required/>
                            </label>
                            <label className="floating-label md:col-span-3">
                                <span>Priorité</span>
                                <input type="number" min={1} className="input input-bordered w-full"
                                       value={state.groupe.priorite ?? 100}
                                       onChange={(e) => setState(v => ({
                                           ...v,
                                           groupe: {
                                               ...v.groupe,
                                               priorite: e.target.value === '' ? '' : Number(e.target.value)
                                           }
                                       }))}
                                       placeholder="100"/>
                            </label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-3">
                            <label className="floating-label md:col-span-6">
                                <span>Catalogue</span>
                                <input type="text" readOnly className="input input-bordered w-full"
                                       value={state._catalogueLabel || ''}/>
                            </label>
                            <label className="floating-label md:col-span-6">
                                <span>Module</span>
                                <input type="text" readOnly className="input input-bordered w-full"
                                       value={state._moduleLabel || ''}/>
                            </label>
                        </div>
                    </fieldset>

                    {/* Layout: Wizard à gauche, récap des actes du groupe à droite */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        {/* WIZARD */}
                        <fieldset className="lg:col-span-7 fieldset bg-base-200 border-base-300 rounded-box border p-4">
                            <legend className="fieldset-legend">Ajouter un acte</legend>

                            {/* Etapes style tabs-lift */}
                            <div className="tabs tabs-lift mb-3">
                                {/* Étape 1 – Choisir un acte */}
                                <label className="tab">
                                    <input
                                        type="radio"
                                        name={stepsName}
                                        checked={step === 1}
                                        onChange={() => setStep(1)}
                                    />
                                    1. Acte
                                </label>
                                <div className="tab-content bg-base-100 border-base-300 p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                        <label className="floating-label md:col-span-5">
                                            <span>Filtrer</span>
                                            <input
                                                className="input input-bordered w-full"
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                placeholder="code, libellé, catégorie…"
                                            />
                                        </label>
                                        <label className="floating-label md:col-span-7">
                                            <span>Acte du module <span className="text-error">*</span></span>
                                            <select
                                                className="select select-bordered w-full"
                                                value={currentActId || ''}
                                                onChange={(e) => {
                                                    setCurrentActId(e.target.value || null);
                                                    setError('')
                                                }}
                                                required
                                            >
                                                <option value="" disabled>— Choisir l’acte —</option>
                                                {catsOfModule.map(cat => (
                                                    <optgroup key={cat.id}
                                                              label={`${cat.code} — ${cat.libelle || '—'}`}>
                                                        {(actsByCategory.get(cat.id) || [])
                                                            .filter(a => !query.trim() ||
                                                                a.code.toLowerCase().includes(query.trim().toLowerCase()) ||
                                                                (a.libelle || '').toLowerCase().includes(query.trim().toLowerCase()))
                                                            .map(a => (
                                                                <option key={a.id}
                                                                        value={a.id}>{a.code} — {a.libelle || '—'}</option>
                                                            ))}
                                                    </optgroup>
                                                ))}
                                            </select>
                                        </label>
                                    </div>

                                    <div className="mt-4 flex justify-end">
                                        <button type="button" className="btn btn-primary" onClick={goStep2}>Continuer
                                        </button>
                                    </div>
                                </div>

                                {/* Étape 2 – Choisir les niveaux */}
                                <label className="tab">
                                    <input
                                        type="radio"
                                        name={stepsName}
                                        checked={step === 2}
                                        onChange={goStep2}
                                    />
                                    2. Niveaux
                                </label>
                                <div className="tab-content bg-base-100 border-base-300 p-4">
                                    {!currentActId &&
                                        <div className="alert alert-info">Choisis d’abord un acte (étape 1).</div>}
                                    {currentActId && (
                                        <>
                                            <div className="flex flex-wrap gap-2">
                                                {niveauxEnabled.map(n => (
                                                    <label key={n.id} className="btn btn-sm btn-ghost">
                                                        <input
                                                            type="checkbox"
                                                            className="checkbox mr-2"
                                                            checked={selectedLevelsSet?.has(n.id) || false}
                                                            onChange={() => toggleLevel(n.id)}
                                                        />
                                                        {n.code}
                                                    </label>
                                                ))}
                                            </div>
                                            <div className="mt-4 flex justify-between">
                                                <button type="button" className="btn" onClick={() => setStep(1)}>←
                                                    Précédent
                                                </button>
                                                <button type="button" className="btn btn-primary"
                                                        onClick={goStep3}>Continuer
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Étape 3 – Saisir valeurs Base/SURCO pour niveaux choisis */}
                                <label className="tab">
                                    <input
                                        type="radio"
                                        name={stepsName}
                                        checked={step === 3}
                                        onChange={goStep3}
                                    />
                                    3. Valeurs
                                </label>
                                <div className="tab-content bg-base-100 border-base-300 p-3 md:p-4">
                                    {(!currentActId || !selectedLevelsSet || selectedLevelsSet.size === 0) && (
                                        <div className="alert alert-info">Sélectionne au moins un niveau (étape
                                            2).</div>
                                    )}

                                    {(currentActId && selectedLevelsSet && selectedLevelsSet.size > 0) && (
                                        <div className="tabs tabs-lift">
                                            {[...selectedLevelsSet].map((lvlId, idx) => {
                                                const lvl = niveauxEnabled.find(n => n.id === lvlId) || {
                                                    id: lvlId,
                                                    code: lvlId
                                                }
                                                return (
                                                    <Fragment key={lvlId}>
                                                        <label className="tab">
                                                            <input
                                                                type="radio"
                                                                name={levelTabsName}
                                                                checked={activeLevel ? activeLevel === lvlId : idx === 0}
                                                                onChange={() => setActiveLevel(lvlId)}
                                                            />
                                                            {lvl.code}
                                                        </label>
                                                        <div
                                                            className="tab-content bg-base-100 border-base-300 p-3 md:p-4">
                                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                                <ValueEditor
                                                                    title={`BASE — ${lvl.code} *`}
                                                                    value={levelVals(currentActId, lvlId).baseVal}
                                                                    onChange={(val) => setLevelVals(currentActId, lvlId, 'baseVal', val)}
                                                                />
                                                                <ValueEditor
                                                                    title={`SURCO — ${lvl.code} (optionnel)`}
                                                                    value={levelVals(currentActId, lvlId).surcoVal}
                                                                    onChange={(val) => setLevelVals(currentActId, lvlId, 'surcoVal', val)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </Fragment>
                                                )
                                            })}
                                        </div>
                                    )}

                                    <div className="mt-4 flex justify-between">
                                        <button type="button" className="btn" onClick={() => setStep(2)}>← Précédent
                                        </button>
                                        <button type="button" className="btn btn-primary"
                                                onClick={addCurrentActToGroup}>
                                            Ajouter cet acte au groupe
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {error && <div className="alert alert-error mt-2"><span>{error}</span></div>}
                        </fieldset>

                        {/* RÉCAP ACTES DU GROUPE */}
                        <fieldset className="lg:col-span-5 fieldset bg-base-200 border-base-300 rounded-box border p-4">
                            <legend className="fieldset-legend">Actes du groupe</legend>

                            {(state.membersSet && state.membersSet.size > 0) ? (
                                <div className="max-h-[420px] overflow-y-auto space-y-1">
                                    {(state.membersArr || []).map((actId, idx) => {
                                        // Retrouver code/libellé
                                        let code = actId, lib = ''
                                        for (const arr of actsByCategory.values()) {
                                            const f = (arr || []).find(a => a.id === actId)
                                            if (f) {
                                                code = f.code;
                                                lib = f.libelle || '';
                                                break
                                            }
                                        }
                                        const catId = catForAct.get(actId)
                                        const isFirstInCat = (() => {
                                            // cherche un précédent dans la même catégorie
                                            for (let i = idx - 1; i >= 0; i--) if (catForAct.get(state.membersArr[i]) === catId) return false
                                            return true
                                        })()
                                        const isLastInCat = (() => {
                                            for (let i = idx + 1; i < (state.membersArr || []).length; i++) if (catForAct.get(state.membersArr[i]) === catId) return false
                                            return true
                                        })()
                                        return (
                                            <div key={actId}
                                                 className="flex items-center gap-2 p-2 rounded hover:bg-base-200">
                                                <div className="join">
                                                    <button type="button" className="btn btn-xs join-item"
                                                            disabled={isFirstInCat}
                                                            onClick={() => moveAct(actId, 'up')}>▲
                                                    </button>
                                                    <button type="button" className="btn btn-xs join-item"
                                                            disabled={isLastInCat}
                                                            onClick={() => moveAct(actId, 'down')}>▼
                                                    </button>
                                                </div>
                                                <button type="button" className="btn btn-xs"
                                                        onClick={() => editAct(actId)}>Éditer
                                                </button>
                                                <span className="font-mono">{code}</span>
                                                <span className="opacity-70 truncate">{lib || '—'}</span>
                                                <span className="badge badge-outline ml-auto">
     {catId ? (categoriesByModule.get(state.groupe.ref_module_id)?.find(c => c.id === catId)?.code || 'CAT') : 'CAT'}
                                               </span>
                                                <button type="button" className="btn btn-xs btn-ghost"
                                                        onClick={() => removeAct(actId)}>✕
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="alert alert-info">Aucun acte ajouté pour l’instant.</div>
                            )}
                        </fieldset>
                    </div>

                    <div className="modal-action mt-4">
                        <button type="button" className="btn btn-ghost" onClick={() => onCancel()}>Annuler</button>
                        <button type="submit" className="btn btn-primary">Enregistrer</button>
                    </div>
                </form>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
    )
}
