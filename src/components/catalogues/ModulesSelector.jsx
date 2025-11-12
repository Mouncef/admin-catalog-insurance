'use client'
export default function ModulesSelector({
                                            modules,
                                            selectedSet,
                                            groupsCountByModule,
                                            onToggle,
                                            onSelectAll,
                                            onClearAll,
                                        }) {
    return (
        <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">Modules inclus dans ce catalogue</h2>
                    <div className="join">
                        <button className="btn btn-sm join-item" onClick={onSelectAll}>Tout inclure</button>
                        <button className="btn btn-sm join-item" onClick={onClearAll}>Tout retirer</button>
                    </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                    {modules.map((m) => {
                        const on = selectedSet.has(m.id);
                        const hasGroups = (groupsCountByModule.get(m.id) || 0) > 0;
                        return (
                            <button
                                key={m.id}
                                type="button"
                                className={`btn btn-sm ${on ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => onToggle(m.id)}
                                title={hasGroups ? 'Des groupes existent pour ce module' : ''}
                            >
                                <span className="font-mono">{m.libelle}</span>
                                {hasGroups ? <span className="badge badge-xs ml-2">grp</span> : null}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
