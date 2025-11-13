'use client';

import { useEffect, useState } from 'react';

export default function SubItemModal({ open, initialValue, onSave, onClose }) {
    const [label, setLabel] = useState(initialValue?.libelle || '');

    useEffect(() => {
        setLabel(initialValue?.libelle || '');
    }, [initialValue]);

    if (!open) return null;

    const handleSave = () => {
        const trimmed = label.trim();
        if (!trimmed) return;
        onSave?.({ libelle: trimmed });
    };

    return (
        <dialog className="modal modal-open">
            <div className="modal-box max-w-md">
                <h3 className="font-bold text-lg mb-2">
                    {initialValue ? 'Modifier le sous-item' : 'Nouveau sous-item'}
                </h3>
                <label className="floating-label">
                    <span>Libellé</span>
                    <input
                        className="input input-bordered w-full"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="Ex: Détail rente"
                    />
                </label>

                <div className="modal-action">
                    <button type="button" className="btn" onClick={onClose}>Annuler</button>
                    <button type="button" className="btn btn-primary" onClick={handleSave}>Enregistrer</button>
                </div>
            </div>
            <button className="modal-backdrop" aria-label="Fermer" onClick={onClose} />
        </dialog>
    );
}
