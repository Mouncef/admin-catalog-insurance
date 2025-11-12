'use client'
export default function ModuleOrderList({
                                            includedRows,
                                            moduleMap,
                                            groupsCountByModule,
                                            onMove,
                                        }) {
    return (
        <div className="mt-4">
            <div className="font-semibold mb-2">Ordre d’affichage (onglets)</div>

            {includedRows.length === 0 ? (
                <div className="alert alert-info">Sélectionne des modules ci-dessus pour les réordonner.</div>
            ) : (
                <div className="space-y-2">
                    {includedRows.map((row, idx) => {
                        const mod = moduleMap.get(row.ref_module_id);
                        const isFirst = idx === 0;
                        const isLast = idx === includedRows.length - 1;
                        const groups = groupsCountByModule.get(row.ref_module_id) || 0;

                        return (
                            <div key={row.id} className="flex items-center gap-3 border border-base-300 rounded-box p-2">
                                <div className="join">
                                    <button
                                        type="button"
                                        className="btn btn-xs join-item"
                                        disabled={isFirst}
                                        onClick={() => onMove(row.ref_module_id, 'up')}
                                        title="Monter"
                                    >
                                        ▲
                                    </button>
                                    <span className="btn btn-xs btn-ghost join-item w-10 justify-center">{row.ordre}</span>
                                    <button
                                        type="button"
                                        className="btn btn-xs join-item"
                                        disabled={isLast}
                                        onClick={() => onMove(row.ref_module_id, 'down')}
                                        title="Descendre"
                                    >
                                        ▼
                                    </button>
                                </div>

                                {/*<div className="badge badge-outline">{mod?.code}</div>*/}
                                <div className="truncate opacity-70">{mod?.libelle || '—'}</div>

                                <div className="ml-auto flex items-center gap-2">
                                    {groups > 0 && <div className="badge">{groups} grp</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="opacity-60 text-xs mt-2">
                L’ordre ci-dessus détermine l’ordre des onglets de configuration.
            </div>
        </div>
    );
}
