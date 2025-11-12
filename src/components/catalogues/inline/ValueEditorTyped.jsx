'use client'

import {useMemo} from 'react'
import {useRefValueTypes} from '@/providers/AppDataProvider'

const FALLBACK_VALUE_TYPES = [
    {
        id: 'percent_base',
        code: '%BASE',
        libelle: 'Pourcentage sur base (BR/TM)',
        fields: [
            {
                name: 'base',
                kind: 'enum',
                required: true,
                options: [
                    {id: 'br', label: 'BR'},
                    {id: 'tm', label: 'TM'},
                ],
            },
            {name: 'taux', kind: 'number', required: true, min: 0, max: 1000, step: 1, suffix: '%'},
            {name: 'plafond_montant', kind: 'number', required: false, min: 0, step: 1, suffix: '€'},
            {
                name: 'periodicite',
                kind: 'enum',
                required: false,
                options: [
                    {id: 'par_acte', label: 'par acte'},
                    {id: 'par_an', label: 'par an'},
                    {id: 'par_an_par_beneficiaire', label: 'par an/bénéficiaire'},
                ],
            },
        ],
    },
    {
        id: 'forfait',
        code: 'FORFAIT',
        libelle: 'Montant forfaitaire',
        fields: [
            {name: 'montant', kind: 'number', required: true, min: 0, step: 1, suffix: '€'},
            {
                name: 'periodicite',
                kind: 'enum',
                required: true,
                options: [
                    {id: 'par_acte', label: 'par acte'},
                    {id: 'par_an', label: 'par an'},
                    {id: 'par_an_par_beneficiaire', label: 'par an/bénéficiaire'},
                    {id: 'par_jour', label: 'par jour'},
                ],
            },
            {name: 'plafond_montant', kind: 'number', required: false, min: 0, step: 1, suffix: '€'},
        ],
    },
    {
        id: 'free_text',
        code: 'LIBRE',
        libelle: 'Texte libre',
        fields: [
            {
                name: 'label',
                kind: 'text',
                required: true,
                placeholder: 'ex: 200% TM, 300% BR, Forfait 160 €/an...',
            },
        ],
    },
]

const mergeTypes = (primary = [], fallback = []) => {
    const out = []
    const seen = new Set()
    for (const list of [primary, fallback]) {
        for (const type of list) {
            if (!type?.id || seen.has(type.id)) continue
            seen.add(type.id)
            out.push(type)
        }
    }
    return out.length ? out : fallback
}

const normalizeValue = (val) => {
    if (val && typeof val === 'object' && val.type) {
        return {
            type: val.type,
            data: val.data || {},
            expression: val.expression ?? '',
            value: val.value ?? '',
        }
    }
    return {type: 'free_text', data: {label: val?.value ?? ''}, expression: val?.expression ?? '', value: val?.value ?? ''}
}

const labelFromName = (name) => {
    switch (name) {
        case 'base':
            return 'Base de remboursement'
        case 'taux':
            return 'Taux'
        case 'montant':
            return 'Montant'
        case 'periodicite':
            return 'Périodicité'
        case 'plafond_montant':
            return 'Plafond montant'
        default:
            return name
    }
}

const computeLabel = (type, data, def) => {
    if (!def) return ''
    if (type === 'free_text') return (data?.label ?? '').trim()
    if (type === 'percent_base') {
        const percent = data?.taux != null && data.taux !== '' ? `${data.taux}%` : ''
        const baseOpt = def.fields.find((f) => f.name === 'base')?.options || []
        const baseLabel = baseOpt.find((o) => o.id === data?.base)?.label
        const periodiciteOpt = def.fields.find((f) => f.name === 'periodicite')?.options || []
        const periodiciteLabel = periodiciteOpt.find((o) => o.id === data?.periodicite)?.label
        return [percent && `${percent} ${baseLabel ?? ''}`.trim(), periodiciteLabel, data?.plafond_montant && `plafond ${data.plafond_montant} €`]
            .filter(Boolean)
            .join(', ')
    }
    if (type === 'forfait') {
        const periodiciteOpt = def.fields.find((f) => f.name === 'periodicite')?.options || []
        const periodiciteLabel = periodiciteOpt.find((o) => o.id === data?.periodicite)?.label
        return [data?.montant != null && `${data.montant} €`, periodiciteLabel, data?.plafond_montant && `plafond ${data.plafond_montant} €`]
            .filter(Boolean)
            .join(', ')
    }
    const summary = []
    for (const field of def.fields || []) {
        const raw = data?.[field.name]
        if (raw === '' || raw === undefined) continue
        if (field.kind === 'boolean') {
            summary.push(`${field.label || labelFromName(field.name)}: ${raw ? 'oui' : 'non'}`)
        } else {
            summary.push(`${field.label || labelFromName(field.name)}: ${raw}`)
        }
    }
    return summary.join(', ')
}

const withUpdatedField = (current, fieldName, value, types) => {
    const next = normalizeValue(current)
    const def = types.find((t) => t.id === next.type)
    const data = {...(next.data || {}), [fieldName]: value}
    const computed = computeLabel(next.type, data, def)
    return {...next, data, value: computed}
}

const withTypeChanged = (current, newType, types) => {
    const def = types.find((t) => t.id === newType) || types[0]
    const initialData = {}
    def?.fields?.forEach((field) => {
        if (field.kind === 'boolean') {
            initialData[field.name] = false
        } else {
            initialData[field.name] = ''
        }
    })
    const label = computeLabel(def?.id, initialData, def)
    return {type: def?.id || 'free_text', data: initialData, expression: '', value: label}
}

const renderField = (field, fieldValue, setField) => {
    const commonProps = {required: !!field.required}
    switch (field.kind) {
        case 'enum':
            return (
                <label key={field.name} className="floating-label">
                    <span>{field.label || labelFromName(field.name)}</span>
                    <select
                        className="select select-bordered w-full"
                        {...commonProps}
                        value={fieldValue ?? ''}
                        onChange={(e) => setField(field.name, e.target.value)}
                    >
                        <option value="" disabled={field.required}>—</option>
                        {(field.options || []).map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                    </select>
                </label>
            )
        case 'number':
            return (
                <label key={field.name} className="floating-label relative">
                    <span>{field.label || labelFromName(field.name)}</span>
                    <input
                        type="number"
                        className={`input input-bordered w-full ${field.suffix ? 'pr-14' : ''}`}
                        {...commonProps}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        value={fieldValue ?? ''}
                        onChange={(e) => setField(field.name, e.target.value === '' ? '' : Number(e.target.value))}
                    />
                    {field.suffix && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70">{field.suffix}</span>
                    )}
                </label>
            )
        case 'textarea':
            return (
                <label key={field.name} className="floating-label">
                    <span>{field.label || labelFromName(field.name)}</span>
                    <textarea
                        className="textarea textarea-bordered w-full"
                        {...commonProps}
                        placeholder={field.placeholder || ''}
                        value={fieldValue ?? ''}
                        onChange={(e) => setField(field.name, e.target.value)}
                    />
                </label>
            )
        case 'boolean':
            return (
                <label key={field.name} className="label cursor-pointer gap-2">
                    <span className="label-text">{field.label || labelFromName(field.name)}</span>
                    <input
                        type="checkbox"
                        className="toggle"
                        checked={!!fieldValue}
                        onChange={(e) => setField(field.name, e.target.checked)}
                    />
                </label>
            )
        default:
            return (
                <label key={field.name} className="floating-label">
                    <span>{field.label || labelFromName(field.name)}</span>
                    <input
                        type="text"
                        className="input input-bordered w-full"
                        {...commonProps}
                        placeholder={field.placeholder || ''}
                        value={fieldValue ?? ''}
                        onChange={(e) => setField(field.name, e.target.value)}
                    />
                </label>
            )
    }
}

export default function ValueEditor({title, value, onChange, valueTypes: valueTypesProp}) {
    const {refValueTypes} = useRefValueTypes()
    const resolvedTypes = useMemo(() => {
        const primary = Array.isArray(valueTypesProp) && valueTypesProp.length ? valueTypesProp : refValueTypes
        return mergeTypes(primary, FALLBACK_VALUE_TYPES)
    }, [valueTypesProp, refValueTypes])

    const normalizedValue = useMemo(() => normalizeValue(value), [value])
    const typeDef = useMemo(() => resolvedTypes.find((t) => t.id === normalizedValue.type) || resolvedTypes[0], [resolvedTypes, normalizedValue.type])
    const preview = useMemo(() => computeLabel(normalizedValue.type, normalizedValue.data, typeDef), [normalizedValue, typeDef])

    const handleSetType = (typeId) => {
        const next = withTypeChanged(normalizedValue, typeId, resolvedTypes)
        onChange?.(next)
    }

    const handleFieldChange = (fieldName, fieldValue) => {
        const next = withUpdatedField(normalizedValue, fieldName, fieldValue, resolvedTypes)
        onChange?.(next)
    }

    return (
        <div className="border border-base-300 rounded-box p-3">
            {title && <div className="text-lg font-semibold mb-2">{title}</div>}
            <div className="grid grid-cols-1 gap-3">
                <label className="floating-label">
                    <span>Type de valeur</span>
                    <select
                        className="select select-bordered w-full"
                        value={normalizedValue.type}
                        onChange={(e) => handleSetType(e.target.value)}
                    >
                        {resolvedTypes.map((t) => (
                            <option key={t.id} value={t.id}>{t.code} — {t.libelle}</option>
                        ))}
                    </select>
                </label>

                {typeDef?.fields?.map((field) =>
                    renderField(field, normalizedValue.data?.[field.name], handleFieldChange)
                )}

                {normalizedValue.type !== 'free_text' && (
                    <label className="floating-label">
                        <span>Prévisualisation</span>
                        <input className="input input-bordered w-full" value={preview} readOnly />
                    </label>
                )}

                <label className="floating-label">
                    <span>Expression</span>
                    <input
                        type="text"
                        className="input input-bordered w-full"
                        value={normalizedValue.expression ?? ''}
                        onChange={(e) => onChange?.({...normalizedValue, expression: e.target.value})}
                        placeholder="ex: min(MONTANT, 2×BR) ou règle métier"
                    />
                </label>
            </div>
        </div>
    )
}
