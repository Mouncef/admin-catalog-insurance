'use client'
import { Fragment, useId } from 'react'

export default function ModuleTabs({ modules, activeId, onChange, renderPanel }) {
    const tabsId = useId()
    const name = `mod_tabs_${tabsId}`

    if (!modules || modules.length === 0) {
        return <div className="alert alert-info">Sélectionne au moins un module pour commencer à créer des groupes.</div>
    }

    return (
        <div role="tablist" className="tabs tabs-lift mt-2">
            {modules.map((m, i) => {
                const checked = activeId ? activeId === m.id : i === 0
                return (
                    <Fragment key={m.id}>
                        <input
                            type="radio"
                            role="tab"
                            name={name}
                            aria-label={m.libelle}
                            className="tab"
                            checked={checked}
                            onChange={() => onChange(m.id)}
                        />
                        <div role="tabpanel" className="tab-content bg-base-100 border-base-300 p-4">
                            {renderPanel(m)}
                        </div>
                    </Fragment>
                )
            })}
        </div>
    )
}
