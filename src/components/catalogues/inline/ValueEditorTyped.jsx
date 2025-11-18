'use client'

import {useMemo} from 'react'
import {useRefValueTypes} from '@/providers/AppDataProvider'
import {normalizeDependency} from '@/lib/utils/dependency'

const cloneFields = (fields = []) => fields.map((f) => ({...f}));

const mergeFieldDefinitions = (base = [], override = []) => {
    const map = new Map();
    for (const field of base) {
        if (!field?.name) continue;
        map.set(field.name, {...field});
    }
    for (const field of override || []) {
        if (!field?.name) continue;
        const prev = map.get(field.name) || {};
        map.set(field.name, {...prev, ...field});
    }
    return Array.from(map.values());
};

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
    {
        id: 'percent_salary_reference_select',
        code: '%REF_LIST',
        libelle: 'Pourcentage du salaire de référence (liste)',
        fields: [
            {
                name: 'percent',
                kind: 'enum',
                required: true,
                label: 'Pourcentage',
                options: [
                    {id: '100%', label: '100 %'},
                    {id: '125%', label: '125 %'},
                    {id: '150%', label: '150 %'},
                    {id: '175%', label: '175 %'},
                    {id: '200%', label: '200 %'},
                    {id: '250%', label: '250 %'},
                ],
            },
        ],
    },
    {
        id: 'percent_salary_reference_input',
        code: '%REF_IN',
        libelle: 'Pourcentage du salaire de référence (saisie)',
        fields: [
            {name: 'percent', kind: 'number', required: true, label: 'Pourcentage', min: 0, max: 500, step: 1, suffix: '%'},
        ],
    },
    {
        id: 'percent_salary_brut_input',
        code: '%BRUT',
        libelle: 'Pourcentage du salaire brut',
        fields: [
            {name: 'percent', kind: 'number', required: true, label: 'Pourcentage', min: 0, max: 100, step: 1, suffix: '%'},
        ],
    },
    {
        id: 'percent_salary_net_input',
        code: '%NET',
        libelle: 'Pourcentage du salaire net',
        fields: [
            {name: 'percent', kind: 'number', required: true, label: 'Pourcentage', min: 0, max: 100, step: 1, suffix: '%'},
        ],
    },
    {
        id: 'franchise_days',
        code: 'FRANCHISE',
        libelle: 'Franchise (jours)',
        fields: [
            {name: 'days', kind: 'number', required: true, label: 'Nombre de jours', min: 0, max: 365, step: 1, suffix: 'j'},
            {
                name: 'type',
                kind: 'enum',
                required: false,
                label: 'Type de franchise',
                options: [
                    {id: 'standard', label: 'Standard'},
                    {id: 'ecourtee', label: 'Écourtée (hospitalisation + 3 j)'},
                ],
            },
        ],
    },
    {
        id: 'amount_euros',
        code: '€',
        libelle: 'Montant en euros',
        fields: [
            {name: 'amount', kind: 'number', required: true, label: 'Montant', min: 0, step: 1, suffix: '€'},
        ],
    },
]

const mergeTypes = (primary = [], fallback = []) => {
    const map = new Map()
    for (const type of fallback) {
        if (!type?.id) continue
        map.set(type.id, {
            ...type,
            fields: cloneFields(type.fields),
        })
    }
    for (const type of primary) {
        if (!type?.id) continue
        const prev = map.get(type.id)
        if (!prev) {
            map.set(type.id, {
                ...type,
                fields: cloneFields(type.fields),
            })
        } else {
            map.set(type.id, {
                ...prev,
                ...type,
                fields: mergeFieldDefinitions(prev.fields, type.fields),
            })
        }
    }
    return Array.from(map.values())
}

const normalizeValue = (val) => {
    if (val && typeof val === 'object' && val.type) {
        const depends_on = normalizeDependency(val.depends_on || val.dependency);
        return {
            type: val.type,
            data: val.data || {},
            expression: val.expression ?? '',
            value: val.value ?? '',
            depends_on: depends_on || null,
        }
    }
    return {type: 'free_text', data: {label: val?.value ?? ''}, expression: val?.expression ?? '', value: val?.value ?? '', depends_on: null}
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
    if (type === 'percent_salary_reference_select' || type === 'percent_salary_reference_input') {
        const val = data?.percent
        if (!val && val !== 0) return ''
        const suffix = String(val).includes('%') ? val : `${val}%`
        return `${suffix} du salaire de référence`
    }
    if (type === 'percent_salary_brut_input') {
        const val = data?.percent
        if (!val && val !== 0) return ''
        const suffix = String(val).includes('%') ? val : `${val}%`
        return `${suffix} du salaire brut`
    }
    if (type === 'percent_salary_net_input') {
        const val = data?.percent
        if (!val && val !== 0) return ''
        const suffix = String(val).includes('%') ? val : `${val}%`
        return `${suffix} du salaire net`
    }
    if (type === 'franchise_days') {
        const days = data?.days
        const typeLabel = def.fields.find((f) => f.name === 'type')?.options?.find((o) => o.id === data?.type)?.label
        return [days != null && `${days} jours`, typeLabel].filter(Boolean).join(' — ')
    }
    if (type === 'amount_euros') {
        const amount = data?.amount
        return amount != null && amount !== '' ? `${amount} €` : ''
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
    const prev = normalizeValue(current)
    const def = types.find((t) => t.id === newType) || types[0]
    const initialData = {}
    def?.fields?.forEach((field) => {
        if (field.kind === 'boolean') {
            initialData[field.name] = false
        } else if (field.kind === 'number' && typeof field.default === 'number') {
            initialData[field.name] = field.default
        } else if (field.kind === 'enum' && field.options?.length) {
            initialData[field.name] = field.options[0].id
        } else {
            initialData[field.name] = ''
        }
    })
    const label = computeLabel(def?.id, initialData, def)
    return {type: def?.id || 'free_text', data: initialData, expression: '', value: label, depends_on: prev.depends_on || null}
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
                        min={field.min ?? undefined}
                        max={field.max ?? undefined}
                        step={field.step ?? undefined}
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

export default function ValueEditor({
                                        title,
                                        value,
                                        onChange,
                                        valueTypes: valueTypesProp,
                                        dependencyOptions = [],
                                        dependencyLevelOptions = [],
                                        defaultLevelId = null,
                                        allowDependencies = true,
                                    }) {
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

    const dependencyEnabled = allowDependencies && !!normalizedValue.depends_on

    const effectiveDependencyOptions = allowDependencies && dependencyOptions.length
        ? dependencyOptions
        : (dependencyEnabled && normalizedValue.depends_on?.act_id
            ? [{value: normalizedValue.depends_on.act_id, label: normalizedValue.depends_on.act_id}]
            : []);

    const defaultLevelOption = dependencyLevelOptions.length
        ? dependencyLevelOptions[0]?.value || ''
        : (defaultLevelId || '');

    const defaultActId = normalizedValue.depends_on?.act_id || effectiveDependencyOptions[0]?.value || '';
    const defaultNiveauId = normalizedValue.depends_on?.niveau_id || defaultLevelOption || null;
    const levelSelectOptions = dependencyLevelOptions.length
        ? dependencyLevelOptions
        : [{value: defaultNiveauId || '', label: 'Niveau courant'}];
    const dependencyMode = normalizedValue.depends_on?.mode || 'copy';
    const dependencySectionVisible = allowDependencies && (dependencyOptions.length > 0 || dependencyEnabled);

    const setDependency = (dep) => {
        onChange?.({...normalizedValue, depends_on: dep});
    };

    const toggleDependency = (enabled) => {
        if (!enabled) {
            setDependency(null);
            return;
        }
        if (!defaultActId) return;
        setDependency({
            act_id: defaultActId,
            niveau_id: defaultNiveauId,
            kind: 'base',
            mode: 'copy',
        });
    };

    const buildOperand = () => ({
        act_id: defaultActId,
        niveau_id: defaultNiveauId,
        kind: 'base',
        value: '',
        min: '',
        max: '',
    });

    const handleDependencyModeChange = (mode) => {
        if (!defaultActId) return;
        if (mode === 'formula') {
            const existing = normalizedValue.depends_on?.mode === 'formula'
                ? (normalizedValue.depends_on.operands || [])
                : [];
            const operands = existing.length ? existing : [buildOperand(), buildOperand()];
            setDependency({
                mode: 'formula',
                operator: normalizedValue.depends_on?.operator || 'add',
                operands,
            });
        } else if (mode === 'percent') {
            setDependency({
                act_id: defaultActId,
                niveau_id: defaultNiveauId,
                kind: 'base',
                mode: 'percent',
                percent: normalizedValue.depends_on?.percent ?? 100,
            });
        } else {
            setDependency({
                act_id: defaultActId,
                niveau_id: defaultNiveauId,
                kind: 'base',
                mode: 'copy',
            });
        }
    };

    const updateDependency = (patch) => {
        if (!normalizedValue.depends_on) {
            handleDependencyModeChange(patch?.mode || 'copy');
            return;
        }
        setDependency({
            ...normalizedValue.depends_on,
            ...patch,
        });
    };

    const updateOperand = (index, patch) => {
        if (!normalizedValue.depends_on) return;
        const list = Array.isArray(normalizedValue.depends_on.operands) ? normalizedValue.depends_on.operands.slice() : [];
        if (!list[index]) return;
        list[index] = {...list[index], ...patch};
        setDependency({
            ...normalizedValue.depends_on,
            operands: list,
        });
    };

    const addOperand = () => {
        if (!normalizedValue.depends_on || normalizedValue.depends_on.mode !== 'formula') return;
        setDependency({
            ...normalizedValue.depends_on,
            operands: [...(normalizedValue.depends_on.operands || []), buildOperand()],
        });
    };

    const removeOperand = (index) => {
        if (!normalizedValue.depends_on || normalizedValue.depends_on.mode !== 'formula') return;
        const list = Array.isArray(normalizedValue.depends_on.operands) ? normalizedValue.depends_on.operands.slice() : [];
        if (list.length <= 1) return;
        list.splice(index, 1);
        setDependency({
            ...normalizedValue.depends_on,
            operands: list,
        });
    };

    const handleMetaChange = (metaKey, metaValue) => {
        const data = {...(normalizedValue.data || {}), [metaKey]: metaValue};
        onChange?.({...normalizedValue, data});
    };

    return (
        <div className="border border-base-300 rounded-box p-3 space-y-4">
            {title && <div className="text-lg font-semibold">{title}</div>}

            {dependencySectionVisible && (
                <div className="space-y-3">
                    <label className="label cursor-pointer justify-start gap-3">
                        <input
                            type="checkbox"
                            className="toggle"
                            checked={dependencyEnabled}
                            onChange={(e) => toggleDependency(e.target.checked)}
                        />
                        <span className="label-text">Cette valeur dépend d’une autre garantie</span>
                    </label>
                    <div className="divider my-0">Dépendance</div>

                    {dependencyEnabled && (
                        <div className="grid grid-cols-1 gap-3">
                            {/* Type de dépendance */}
                            <label className="floating-label">
                                <span>Type de dépendance</span>
                                <select
                                    className="select select-bordered w-full"
                                    value={dependencyMode}
                                    onChange={(e) => handleDependencyModeChange(e.target.value)}
                                >
                                    <option value="copy">Copier la valeur</option>
                                    <option value="percent">Appliquer un pourcentage</option>
                                    <option value="formula">Formule (addition, soustraction, etc.)</option>
                                </select>
                            </label>

                            {/* Mode simple : copie / pourcentage */}
                            {dependencyMode !== 'formula' && (
                                effectiveDependencyOptions.length === 0 ? (
                                    <div className="alert alert-info text-sm">
                                        Aucune garantie disponible pour définir la dépendance.
                                    </div>
                                ) : (
                                    <>
                                        <label className="floating-label">
                                            <span>Garantie source</span>
                                            <select
                                                className="select select-bordered w-full"
                                                value={normalizedValue.depends_on?.act_id || ''}
                                                onChange={(e) => updateDependency({ act_id: e.target.value })}
                                            >
                                                {effectiveDependencyOptions.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        <label className="floating-label">
                                            <span>Niveau</span>
                                            <select
                                                className="select select-bordered w-full"
                                                value={normalizedValue.depends_on?.niveau_id || defaultNiveauId || ''}
                                                onChange={(e) =>
                                                    updateDependency({
                                                        niveau_id: e.target.value || null,
                                                    })
                                                }
                                            >
                                                {levelSelectOptions.map((opt) => (
                                                    <option
                                                        key={opt.value || 'current'}
                                                        value={opt.value || ''}
                                                    >
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    </>
                                )
                            )}

                            {/* Pourcentage appliqué */}
                            {dependencyMode === 'percent' && (
                                <label className="floating-label relative">
                                    <span>Pourcentage appliqué</span>
                                    <input
                                        type="number"
                                        className="input input-bordered w-full pr-12"
                                        value={normalizedValue.depends_on?.percent ?? ''}
                                        min={0}
                                        max={1000}
                                        step={1}
                                        onChange={(e) =>
                                            updateDependency({
                                                percent:
                                                    e.target.value === ''
                                                        ? null
                                                        : Number(e.target.value),
                                            })
                                        }
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 opacity-70">
                    %
                </span>
                                </label>
                            )}

                            {/* Mode formule */}
                            {dependencyMode === 'formula' && (
                                <div className="space-y-3">
                                    <label className="floating-label">
                                        <span>Opération</span>
                                        <select
                                            className="select select-bordered w-full"
                                            value={normalizedValue.depends_on?.operator || 'add'}
                                            onChange={(e) => updateDependency({ operator: e.target.value })}
                                        >
                                            <option value="add">Addition</option>
                                            <option value="sub">Soustraction</option>
                                            <option value="mul">Multiplication</option>
                                            <option value="div">Division</option>
                                        </select>
                                    </label>

                                    {effectiveDependencyOptions.length === 0 ? (
                                        <div className="alert alert-info text-sm">
                                            Aucune garantie disponible pour construire la formule.
                                        </div>
                                    ) : (
                                        <>
                                            {(normalizedValue.depends_on?.operands || []).map(
                                                (operand, idx) => (
                                                    <div
                                                        key={`operand-${idx}`}
                                                        className="border border-base-300 rounded-box p-3 space-y-3"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="font-semibold text-sm">
                                                                Terme {idx + 1}
                                                            </div>
                                                            {(normalizedValue.depends_on?.operands || [])
                                                                .length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-xs btn-ghost text-error"
                                                                    onClick={() => removeOperand(idx)}
                                                                >
                                                                    Supprimer
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <label className="floating-label">
                                                                <span>Garantie</span>
                                                                <select
                                                                    className="select select-bordered w-full"
                                                                    value={operand.act_id || ''}
                                                                    onChange={(e) =>
                                                                        updateOperand(idx, {
                                                                            act_id: e.target.value,
                                                                        })
                                                                    }
                                                                >
                                                                    {effectiveDependencyOptions.map(
                                                                        (opt) => (
                                                                            <option
                                                                                key={opt.value}
                                                                                value={opt.value}
                                                                            >
                                                                                {opt.label}
                                                                            </option>
                                                                        )
                                                                    )}
                                                                </select>
                                                            </label>

                                                            <label className="floating-label">
                                                                <span>Niveau</span>
                                                                <select
                                                                    className="select select-bordered w-full"
                                                                    value={
                                                                        operand.niveau_id ||
                                                                        defaultNiveauId ||
                                                                        ''
                                                                    }
                                                                    onChange={(e) =>
                                                                        updateOperand(idx, {
                                                                            niveau_id:
                                                                                e.target.value || null,
                                                                        })
                                                                    }
                                                                >
                                                                    {levelSelectOptions.map((opt) => (
                                                                        <option
                                                                            key={opt.value || 'current'}
                                                                            value={opt.value || ''}
                                                                        >
                                                                            {opt.label}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </label>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                            <label className="floating-label">
                                                                <span>Valeur</span>
                                                                <input
                                                                    type="number"
                                                                    className="input input-bordered w-full"
                                                                    value={operand.value ?? ''}
                                                                    onChange={(e) =>
                                                                        updateOperand(idx, {
                                                                            value:
                                                                                e.target.value === ''
                                                                                    ? null
                                                                                    : Number(
                                                                                        e.target.value
                                                                                    ),
                                                                        })
                                                                    }
                                                                />
                                                            </label>

                                                            <label className="floating-label">
                                                                <span>Min</span>
                                                                <input
                                                                    type="number"
                                                                    className="input input-bordered w-full"
                                                                    value={operand.min ?? ''}
                                                                    onChange={(e) =>
                                                                        updateOperand(idx, {
                                                                            min:
                                                                                e.target.value === ''
                                                                                    ? null
                                                                                    : Number(
                                                                                        e.target.value
                                                                                    ),
                                                                        })
                                                                    }
                                                                />
                                                            </label>

                                                            <label className="floating-label">
                                                                <span>Max</span>
                                                                <input
                                                                    type="number"
                                                                    className="input input-bordered w-full"
                                                                    value={operand.max ?? ''}
                                                                    onChange={(e) =>
                                                                        updateOperand(idx, {
                                                                            max:
                                                                                e.target.value === ''
                                                                                    ? null
                                                                                    : Number(
                                                                                        e.target.value
                                                                                    ),
                                                                        })
                                                                    }
                                                                />
                                                            </label>
                                                        </div>
                                                    </div>
                                                )
                                            )}

                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline"
                                                onClick={addOperand}
                                            >
                                                + Ajouter un terme
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="text-xs opacity-70">
                                Les dépendances calculent automatiquement la valeur affichée (ainsi que les
                                minima/maxima) à partir des garanties sélectionnées.
                            </div>
                        </div>
                    )}

                </div>
            )}

            <div className="grid grid-cols-1 gap-3">
                <label className="floating-label">
                    <span>Type de valeur</span>
                    <select
                        className="select select-bordered w-full"
                        value={normalizedValue.type}
                        onChange={(e) => handleSetType(e.target.value)}
                        disabled={dependencyEnabled}
                    >
                        {resolvedTypes.map((t) => (
                            <option key={t.id} value={t.id}>{t.code} — {t.libelle}</option>
                        ))}
                    </select>
                </label>

                {!dependencyEnabled && (
                    <>
                        {typeDef?.fields?.map((field) =>
                            renderField(field, normalizedValue.data?.[field.name], handleFieldChange)
                        )}

                        <label className="floating-label">
                            <span>Valeur minimale (affichage)</span>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                value={normalizedValue.data?.min_hint ?? ''}
                                onChange={(e) => handleMetaChange('min_hint', e.target.value)}
                                placeholder="Ex: ≥ 100 %"
                            />
                        </label>

                        <label className="floating-label">
                            <span>Valeur maximale (affichage)</span>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                value={normalizedValue.data?.max_hint ?? ''}
                                onChange={(e) => handleMetaChange('max_hint', e.target.value)}
                                placeholder="Ex: ≤ 250 %"
                            />
                        </label>

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
                    </>
                )}
            </div>
        </div>
    )
}
