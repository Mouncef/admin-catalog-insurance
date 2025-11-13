'use client'

import {useEffect, useState} from 'react'

const FIELD_TYPES = [
    { value: 'radio', label: 'Bouton radio (sélection unique)' },
    { value: 'checkbox', label: 'Case à cocher' },
    { value: 'select', label: 'Liste déroulante' },
]

export default function SubItemModal({ open, parentActLabel, initialValue, onSave, onClose }) {
    const [label, setLabel] = useState(initialValue?.libelle || '')
    const [description, setDescription] = useState(initialValue?.description || '')
    const [fieldType, setFieldType] = useState(initialValue?.field_type || 'radio')

    useEffect(() => {
        setLabel(initialValue?.libelle || '')
        setDescription(initialValue?.description || '')
        setFieldType(initialValue?.field_type || 'radio')
    }, [initialValue])

    if (!open) return null

    function handleSave() {
        const trimmed = label.trim()
        if (!trimmed) return
        onSave?.({
            libelle: trimmed,
            description: description.trim(),
            field_type: fieldType,
        })
    }

    return (
        <dialog className="modal modal-open">
            <div className="modal-box max-w-md">
                <h3 className="font-bold text-lg mb-2">
                    {initialValue ? 'Modifier le sous-item' : 'Nouveau sous-item'}
                </h3>
                {parentActLabel && (
                    <p className="text-sm opacity-70 mb-3">Garantie parent : {parentActLabel}</p>
                )}
                <label className="floating-label">
                    <span>Libellé</span>
                    <input
                        className="input input-bordered w-full"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="Ex: Décès accidentel"
                    />
                </label>
                <label className="floating-label mt-3">
                    <span>Description (optionnel)</span>
                    <textarea
                        className="textarea textarea-bordered w-full"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Texte explicatif pour l’UI client"
                    />
                </label>
                <label className="floating-label mt-3">
                    <span>Type de champ</span>
                    <select
                        className="select select-bordered w-full"
                        value={fieldType}
                        onChange={(e) => setFieldType(e.target.value)}
                    >
                        {FIELD_TYPES.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </label>

                <div className="modal-action">
                    <button type="button" className="btn" onClick={onClose}>Annuler</button>
                    <button type="button" className="btn btn-primary" onClick={handleSave}>Enregistrer</button>
                </div>
            </div>
            <button className="modal-backdrop" aria-label="Fermer" onClick={onClose} />
        </dialog>
    )
}
