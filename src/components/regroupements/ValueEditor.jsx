'use client'

export default function ValueEditor({ title, value, onChange }) {
    const v = value || {}
    return (
        <div className="border border-base-300 rounded-box p-3">
            <div className="text-lg font-semibold mb-2">{title}</div>

            <div className="grid grid-cols-1 gap-3">
                <label className="floating-label">
                    <span>Value</span>
                    <input
                        type="text"
                        className="input input-bordered w-full"
                        value={v.value ?? ''}
                        onChange={(e)=> onChange({ ...v, value: e.target.value })}
                        placeholder="ex: 300% BR, 400 €, Forfait annuel 160 €…"
                    />
                </label>

                <label className="floating-label">
                    <span>Expression</span>
                    <input
                        type="text"
                        className="input input-bordered w-full"
                        value={v.expression ?? ''}
                        onChange={(e)=> onChange({ ...v, expression: e.target.value })}
                        placeholder="ex: min(MONTANT, 2×BR) ou règle métier"
                    />
                </label>
            </div>
        </div>
    )
}
