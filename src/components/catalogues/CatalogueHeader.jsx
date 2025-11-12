'use client'
export default function CatalogueHeader({ offer, catalogue, catPersonnel = [], onBack, onVisualise }) {
    const hasCatPersonnel = Array.isArray(catPersonnel) && catPersonnel.length > 0
    return (
        <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
                <h1 className="text-2xl font-bold">
                    {offer?.code} — {offer?.libelle}
                </h1>
                <div className="opacity-70">
                    Catalogue : {[catalogue?.risque, catalogue?.annee, catalogue?.version].filter(Boolean).join(' · ')}
                </div>
                {hasCatPersonnel && (
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
                        <span className="opacity-60">Collèges:</span>
                        {catPersonnel.map((cat) => (
                            <span key={cat.id} className="badge badge-outline badge-sm">
                                {cat.libelle || cat.code || cat.id}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            <div className="join">
                {/*<button className="btn join-item" onClick={onSwitchMode}>↔ Mode modal</button>*/}
                <button className="btn join-item" onClick={onBack}>← Retour liste</button>
                <button className="btn join-item" onClick={onVisualise}>Visualiser</button>
            </div>
        </div>
    );
}
