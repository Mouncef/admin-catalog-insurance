'use client'

import {useEffect, useMemo, useState} from 'react'
import { isUngroupedCategoryId } from '@/lib/utils/categoryUtils'

export default function InlineGroupEditor({
                                              module,
                                              catalogueId,
                                              categoriesByModule,
                                              actsByCategory,
                                              initial,              // facultatif: { groupe, membersArr }
                                              onSave,               // ({ groupe, selectedActs })
                                              onCancel,
                                              disabledActIds,          // ⬅️ NEW (Iterable/Array/Set)

                                          }) {
    const [groupe, setGroupe] = useState(
        () =>
            initial?.groupe || {
                id: null,
                catalogue_id: catalogueId,
                ref_module_id: module.id,
                nom: '',
                priorite: 100,
            }
    )
    const disabledSet = useMemo(() => new Set(disabledActIds || []), [disabledActIds]);

    const [selectedActs, setSelectedActs] = useState(() => initial?.membersArr || [])

    // Sécurité : si disabledSet change, on retire d'éventuelles ids devenues indisponibles
    useEffect(() => {
        setSelectedActs(prev => prev.filter(id => !disabledSet.has(id)))
    }, [disabledSet])

    // Catégories du module triées
    const catsRefSorted = useMemo(
        () =>
            (categoriesByModule.get(module.id) || [])
                .slice()
                .sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || (a.code || '').localeCompare(b.code || '')),
        [categoriesByModule, module.id]
    )

    const selectedSet = useMemo(() => new Set(selectedActs), [selectedActs])

    function toggleAct(actId) {
        // Par principe, ignore si tenté sur un acte masqué (ne devrait pas arriver)
        if (disabledSet.has(actId)) return
        setSelectedActs(prev =>
            prev.includes(actId) ? prev.filter(id => id !== actId) : [...prev, actId]
        )
    }

    function toggleCategory(actsInCat, add) {
        // actsInCat est déjà filtré (on lui passe la liste visible)
        const ids = actsInCat.map(a => a.id)
        setSelectedActs(prev => {
            if (add) {
                const set = new Set(prev)
                return [...prev, ...ids.filter(id => !set.has(id))]
            }
            return prev.filter(id => !ids.includes(id))
        })
    }

    function submit() {
        const nom = String(groupe.nom || '').trim()
        if (!nom) return alert('Nom requis')
        if (selectedActs.length === 0) return alert('Sélectionnez au moins une garantie disponible')
        onSave({ groupe, selectedActs })
    }

    // Nombre d'actes disponibles (toutes catégories confondues)
    const availableActsCount = useMemo(() => {
        return catsRefSorted.reduce((n, cat) => {
            const allActs = actsByCategory.get(cat.id) || []
            const visible = allActs.filter(a => !disabledSet.has(a.id))
            return n + visible.length
        }, 0)
    }, [catsRefSorted, actsByCategory, disabledSet])

    return (
        <div className="space-y-4">
            {/* En-tête mini formulaire */}
            <div className="border border-base-300 rounded-box p-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="floating-label">
                        <span>Libellé du bloc <span className="text-error">*</span></span>
                        <input
                            className="input input-bordered w-full"
                            value={groupe.nom}
                            onChange={(e) => setGroupe((g) => ({ ...g, nom: e.target.value }))}
                            placeholder="Ex: bloc soins courants"
                        />
                    </label>
                    {/*<label className="floating-label">
                        <span>Priorité</span>
                        <input
                            type="number"
                            className="input input-bordered w-full"
                            value={groupe.priorite ?? 100}
                            onChange={(e) =>
                                setGroupe((g) => ({ ...g, priorite: Number(e.target.value || 0) }))
                            }
                        />
                    </label>*/}
                    <div className="flex items-end gap-2">
                        <button className="btn btn-primary" onClick={submit}>Enregistrer</button>
                        <button className="btn" onClick={onCancel}>Annuler</button>
                    </div>
                </div>
            </div>

            {/* Sélection des actes (par catégorie) */}
            <div className="card bg-base-200">
                <div className="card-body p-3">
                    <div className="font-semibold mb-2">Sélection des garanties</div>
                    {availableActsCount === 0 && (
                        <div className="alert alert-warning my-2">
                            Toutes les garanties de ce module sont déjà utilisés dans ce catalogue.
                        </div>
                    )}
                    <div className="space-y-2 max-h-[50vh] overflow-auto pr-1">
                        {catsRefSorted.map((cat) => {
                            const allActs = actsByCategory.get(cat.id) || []
                            // ⛔️ Solution A : on MASQUE ceux déjà utilisés
                            const acts = allActs.filter(a => !disabledSet.has(a.id))

                            //if (acts.length === 0) return null

                            const total = acts.length
                            const selectedCnt = acts.reduce((n, a) => n + (selectedSet.has(a.id) ? 1 : 0), 0)
                            const allInCat = selectedCnt === total && total > 0

                            return (
                                <div key={cat.id} className="border border-base-300 rounded-box">
                                    <div className="flex items-center justify-between p-2 bg-base-300">
                                        <div className="flex items-center gap-2">
                                            {/*<span className="badge badge-outline">{cat.code}</span>*/}
                                            <span className="opacity-70">
                                                {cat && (cat.isVirtual || isUngroupedCategoryId(cat.id))
                                                    ? 'Sans groupe'
                                                    : `${cat.code} - ${cat.libelle || '—'}`}
                                            </span>
                                            <span className="badge badge-sm">{selectedCnt}/{total}</span>
                                        </div>
                                        <div className="join">
                                            <button
                                                className="btn btn-xs join-item"
                                                onClick={() => toggleCategory(acts, !allInCat)}
                                                disabled={total === 0}
                                                title={total === 0 ? 'Aucune garantie disponible dans ce groupe de garanties' : ''}
                                            >
                                                {allInCat ? 'Tout retirer' : 'Tout ajouter'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-2">
                                        {acts.length === 0 ? (
                                            <div className="opacity-60 italic text-sm px-1">Aucune garantie dans ce groupe de garanties</div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {acts.map((a) => {
                                                    const checked = selectedSet.has(a.id)
                                                    return (
                                                        <label
                                                            key={a.id}
                                                            className={`flex items-center gap-2 p-2 rounded-box border ${checked ? 'border-primary' : 'border-base-300'}`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="checkbox checkbox-sm"
                                                                checked={checked}
                                                                onChange={() => toggleAct(a.id)}
                                                            />
                                                            <div className="min-w-0">
                                                                {/*<div className="font-mono text-sm">{a.code}</div>*/}
                                                                <div className="text-xs opacity-70 truncate">{a.libelle || '—'}</div>
                                                            </div>
                                                        </label>
                                                    )
                                                })}
                                            </div>
                                            )
                                        }
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
