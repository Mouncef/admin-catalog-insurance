'use client'

import {useEffect, useMemo, useState} from 'react'
import {useRef} from 'react'

const BASIS_OPTIONS = [
    {id: 'reference', label: '% salaire de référence'},
    {id: 'brut', label: '% salaire brut'},
];

const makeId = (() => {
    let n = 0;
    return () => {
        n += 1;
        return `pv-row-${Date.now()}-${n}`;
    };
})();

function sanitizeNumber(input) {
    if (input === '' || input === null || input === undefined) return null;
    const num = Number(input);
    return Number.isFinite(num) ? num : null;
}

const buildLabel = (basis, values = []) => {
    const basisLabel = BASIS_OPTIONS.find((b) => b.id === basis)?.label || '% salaire';
    if (!values.length) return `— (${basisLabel})`;
    const first = `${values[0]}%`;
    if (values.length === 1) return `${first} (${basisLabel})`;
    return `${first} (+${values.length - 1}) (${basisLabel})`;
};

export default function PrevoyanceValueEditor({value, onChange}) {
    const initialBasis = useMemo(() => {
        if (value?.data?.basis === 'brut') return 'brut';
        return 'reference';
    }, [value?.data?.basis]);
    const initialValues = useMemo(() => {
        const arr = Array.isArray(value?.data?.values) ? value.data.values : [];
        const cleaned = arr.map(sanitizeNumber).filter((n) => n !== null);
        const base = cleaned.length ? cleaned : [100];
        return base.map((val, idx) => ({id: makeId() + idx, value: val}));
    }, [value?.data?.values]);

    const [basis, setBasis] = useState(initialBasis);
    const [rows, setRows] = useState(initialValues);

    const sanitizedRows = useMemo(
        () => rows.map((r) => sanitizeNumber(r.value)).filter((n) => n !== null),
        [rows]
    );

    const label = useMemo(() => buildLabel(basis, sanitizedRows), [basis, sanitizedRows]);
    const fullLabel = useMemo(() => sanitizedRows.map((n) => `${n}%`).join(' • '), [sanitizedRows]);

    const lastEmittedRef = useRef('');
    useEffect(() => {
        const key = `${basis}::${JSON.stringify(sanitizedRows)}`;
        if (key === lastEmittedRef.current) return;
        lastEmittedRef.current = key;
        onChange?.({
            type: 'prev_salary_table',
            data: {basis, values: sanitizedRows, full_label: fullLabel},
            expression: '',
            value: label,
            depends_on: null,
        });
    }, [basis, sanitizedRows, label, fullLabel, onChange]);

    const numberPattern = /^\d{0,4}$/; // simple guard, 0-4 digits

    function updateRow(idx, next) {
        if (!numberPattern.test(String(next))) return;
        setRows((prev) => {
            const arr = prev.slice();
            if (!arr[idx]) return prev;
            arr[idx] = {...arr[idx], value: next};
            return arr;
        });
    }

    function removeRow(idx) {
        setRows((prev) => prev.filter((_, i) => i !== idx));
    }

    function addEmptyRow() {
        setRows((prev) => [...prev, {id: makeId(), value: ''}]);
    }

    return (
        <div className="space-y-4">
            <label className="floating-label">
                <span>Type de base</span>
                <select
                    className="select select-bordered w-full"
                    value={basis}
                    onChange={(e) => {
                        const next = e.target.value;
                        setBasis(next);
                    }}
                >
                    {BASIS_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                </select>
            </label>

            <div className="card bg-base-200">
                <div className="card-body p-4 space-y-3">
                    <button className="btn btn-sm" onClick={addEmptyRow}>+ Ajouter une valeur</button>

                    <div className="overflow-x-auto">
                        <table className="table table-sm">
                            <thead>
                            <tr>
                                <th>Valeur</th>
                                <th></th>
                            </tr>
                            </thead>
                            <tbody>
                            {rows.map((row, idx) => (
                                <tr key={row.id || idx}>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                pattern="\\d*"
                                                className="input input-bordered input-sm w-24"
                                                value={row.value ?? ''}
                                                onChange={(e) => updateRow(idx, e.target.value)}
                                            />
                                            <span className="opacity-70">%</span>
                                        </div>
                                    </td>
                                    <td className="text-right">
                                        <button
                                            type="button"
                                            className="btn btn-xs btn-ghost text-error"
                                            onClick={() => removeRow(idx)}
                                        >
                                            Supprimer
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={2} className="opacity-60">Aucune valeur. Ajoute au moins une ligne.</td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
