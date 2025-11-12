'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { uuid } from '@/hooks/useGroupData';
import { useRefCatPersonnel, useRefTranchesAges, useRefRegimes } from '@/providers/AppDataProvider';
import { Trash2, Copy } from "lucide-react";

// helpers format %
function parseToNumber(str) {
    if (str == null) return null;
    const s = String(str).replace('%','').replace(/\s+/g,'').replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}
function toPctString(x) {
    if (x == null || !Number.isFinite(x)) return '';
    return `${x.toFixed(2)}%`;
}
// input <-> stored
function uiFromStoredPct(stored) {
    if (!stored) return '';
    const m = String(stored).match(/-?\d+(?:[.,]\d+)?/);
    if (!m) return '';
    return m[0].replace(',', '.');
}

export default function TarifsEditor({
                                         group,
                                         niveauxBase = [],
                                         niveauxSurco = [],
                                         allowSurco = true,
                                         initialRowsBase = [],
                                         initialRowsSurco = [],
                                         onSave,
                                         onClose,
                                     }) {
    const modalRef = useRef(null);
    const [active, setActive] = useState('base'); // 'base' | 'surco'
    const tabsName = useMemo(() => `tarifs_tabs_${group?.id || uuid()}`, [group?.id]);

    const { refCatPersonnel } = useRefCatPersonnel();
    const { refTranchesAges } = useRefTranchesAges();
    const { refRegimes } = useRefRegimes();

    const cats    = useMemo(() => [...(refCatPersonnel||[])].filter(x=>x.is_enabled!==false).sort((a,b)=>(a.ordre||0)-(b.ordre||0)), [refCatPersonnel]);
    const ages    = useMemo(() => [...(refTranchesAges||[])].filter(x=>x.is_enabled!==false).sort((a,b)=>(a.ordre||0)-(b.ordre||0)), [refTranchesAges]);
    const regimes = useMemo(() => [...(refRegimes||[])].filter(x=>x.is_enabled!==false).sort((a,b)=>(a.ordre||0)-(b.ordre||0)), [refRegimes]);

    const niveauxBaseSorted  = useMemo(()=> (niveauxBase||[]).slice().sort((a,b)=>(a.ordre||0)-(b.ordre||0)), [niveauxBase]);
    const niveauxSurcoSorted = useMemo(()=> !allowSurco ? [] : (niveauxSurco||[]).slice().sort((a,b)=>(a.ordre||0)-(b.ordre||0)), [allowSurco, niveauxSurco]);

    // états séparés par onglet
    const [rowsBase, setRowsBase]   = useState(() => initialRowsBase?.length ? initialRowsBase : []);
    const [rowsSurco, setRowsSurco] = useState(() => allowSurco && initialRowsSurco?.length ? initialRowsSurco : []);

    useEffect(() => {
        const dlg = modalRef.current;
        if (dlg && typeof dlg.showModal === 'function') {
            try { dlg.showModal(); } catch {}
        }
    }, []);

    function addEmpty(kind) {
        if (kind === 'surco' && !allowSurco) return;
        const niv = (kind === 'surco' ? niveauxSurcoSorted : niveauxBaseSorted)[0]?.id || '';
        const s = {
            id: uuid(), groupe_id: group.id, kind,
            cat_id: cats[0]?.id || '', age_id: ages[0]?.id || '', regime_id: regimes[0]?.id || '',
            niveau_id: niv, cle: '',
            tx_uniforme: '', tx_isole: '', tx_famille: '', tx_asse_enfants_ss: '',
            tx_conjoint_fac: '', tx_salarie_seul: '', tx_adulte: '', tx_enfant: '',
        };
        if (kind === 'surco') setRowsSurco(prev => [...prev, s]);
        else setRowsBase(prev => [...prev, s]);
    }

    function genDefaultGrid(kind) {
        if (kind === 'surco' && !allowSurco) return;
        const niv = (kind === 'surco' ? niveauxSurcoSorted : niveauxBaseSorted)[0]?.id || '';
        const base = [];
        for (const c of cats) for (const a of ages) for (const r of regimes) {
            base.push({
                id: uuid(), groupe_id: group.id, kind,
                cat_id: c.id, age_id: a.id, regime_id: r.id,
                niveau_id: niv, cle: '',
                tx_uniforme: '', tx_isole: '', tx_famille: '', tx_asse_enfants_ss: '',
                tx_conjoint_fac: '', tx_salarie_seul: '', tx_adulte: '', tx_enfant: '',
            });
        }
        if (kind === 'surco') setRowsSurco(base); else setRowsBase(base);
    }

    function setCell(kind, i, key, val) {
        const setter = kind === 'surco' ? setRowsSurco : setRowsBase;
        setter(prev => {
            const next = prev.slice();
            next[i] = { ...next[i], [key]: val };
            return next;
        });
    }

    // champs % : on tape sans %, on stocke "xx.yy%"
    function setPct(kind, i, key, val) {
        const n = parseToNumber(val);
        const stored = (val === '' || n === null) ? '' : toPctString(n);
        setCell(kind, i, key, stored);
    }

    function removeRow(kind, i) {
        const setter = kind === 'surco' ? setRowsSurco : setRowsBase;
        setter(prev => prev.filter((_, idx) => idx !== i));
    }

    // ✅ Dupliquer ligne : insère une copie juste après
    function duplicateRow(kind, i) {
        const setter = kind === 'surco' ? setRowsSurco : setRowsBase;
        setter(prev => {
            if (i < 0 || i >= prev.length) return prev;
            const src = prev[i];
            const copy = {
                ...src,
                id: uuid(),
                // optionnel : marquer la clé si présente
                cle: src.cle ? `${src.cle}-copie` : src.cle,
            };
            const next = prev.slice();
            next.splice(i + 1, 0, copy);
            return next;
        });
    }

    function saveAll() {
        const norm = (rows, kind) => (rows||[])
            .filter(r => r.groupe_id && r.cat_id && r.age_id && r.regime_id && r.niveau_id)
            .map(r => ({ ...r, id: r.id || uuid(), kind }));

        const out = allowSurco
            ? [...norm(rowsBase, 'base'), ...norm(rowsSurco, 'surco')]
            : [...norm(rowsBase, 'base')];
        onSave?.(out);
    }

    // cellules d’une table
    function Table({ kind, rows, niveaus, onAdd, onGen, onSetCell, onSetPct, onRemove, onDuplicate }) {
        return (
            <div>
                <div className="flex justify-end gap-2 mb-3">
                    <button type="button" className="btn btn-sm" onClick={onAdd}>+ Ligne</button>
                    {/* <button type="button" className="btn btn-sm" onClick={onGen}>Générer grilles usuelles</button> */}
                </div>

                <div className="overflow-auto max-h-[60vh] border border-base-300 rounded-box">
                    <table className="table table-xs">
                        <thead>
                        <tr className="bg-base-200 sticky top-0 z-10">
                            <th>Cat. pers.</th>
                            <th>Tranche d'âge</th>
                            <th>Régime</th>
                            <th>Niveau</th>
                            {/* <th>clé</th> */}
                            <th>Famille uniforme</th>
                            <th>Isolé</th>
                            <th>Famille</th>
                            <th>Assé + enfants SS</th>
                            <th>Conjoint fac</th>
                            <th>Salarié seul</th>
                            <th>Adulte</th>
                            <th>Enfant</th>
                            <th align="right">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {(!rows || rows.length === 0) && (
                            <tr><td colSpan={14} className="text-center opacity-60">Aucune ligne — utilise “+ Ligne”.</td></tr>
                        )}
                        {rows.map((r, i) => (
                            <tr key={r.id || i}>
                                <td>
                                    <select className="select select-bordered select-xs w-30" value={r.cat_id || ''} onChange={e=>onSetCell(kind, i, 'cat_id', e.target.value)}>
                                        {cats.map(c => <option key={c.id} value={c.id}>{c.libelle || c.code}</option>)}
                                    </select>
                                </td>
                                <td>
                                    <select className="select select-bordered select-xs w-30" value={r.age_id || ''} onChange={e=>onSetCell(kind, i, 'age_id', e.target.value)}>
                                        {ages.map(a => <option key={a.id} value={a.id}>{a.libelle || a.code}</option>)}
                                    </select>
                                </td>
                                <td>
                                    <select className="select select-bordered select-xs w-30" value={r.regime_id || ''} onChange={e=>onSetCell(kind, i, 'regime_id', e.target.value)}>
                                        {regimes.map(z => <option key={z.id} value={z.id}>{z.libelle || z.code}</option>)}
                                    </select>
                                </td>
                                <td>
                                    <select className="select select-bordered select-xs w-25" value={r.niveau_id || ''} onChange={e=>onSetCell(kind, i, 'niveau_id', e.target.value)}>
                                        {niveaus.map(n => <option key={n.id} value={n.id}>{(n.code || n.libelle || '').toUpperCase()}</option>)}
                                    </select>
                                </td>
                                {/* <td><input className="input input-bordered input-xs w-28" value={r.cle || ''} onChange={e=>onSetCell(kind, i, 'cle', e.target.value)} /></td> */}

                                {/* Champs % avec suffixe DaisyUI */}
                                {[
                                    ['tx_uniforme',        ''],
                                    ['tx_isole',           ''],
                                    ['tx_famille',         ''],
                                    ['tx_asse_enfants_ss', ''],
                                    ['tx_conjoint_fac',    ''],
                                    ['tx_salarie_seul',    ''],
                                    ['tx_adulte',          ''],
                                    ['tx_enfant',          ''],
                                ].map(([key, w]) => (
                                    <td key={key}>
                                        <label className={`input input-bordered input-xs flex items-center gap-1 ${w}`}>
                                            <input
                                                className="grow"
                                                inputMode="decimal"
                                                value={uiFromStoredPct(r[key])}
                                                onChange={e => onSetPct(kind, i, key, e.target.value)}
                                                onBlur={e => {
                                                    const n = parseToNumber(e.target.value);
                                                    onSetPct(kind, i, key, (n==null?'':n));
                                                }}
                                                placeholder="0.00"
                                            />
                                            <span className="opacity-70">%</span>
                                        </label>
                                    </td>
                                ))}

                                <td align="right" className="w-100">
                                    <div className="join">
                                        {/* 📄 Dupliquer */}
                                        <button
                                            type="button"
                                            className="btn join-item btn-primary btn-xs"
                                            title="Dupliquer cette ligne"
                                            onClick={()=>onDuplicate(kind, i)}
                                        >
                                            <Copy size={16} />
                                        </button>
                                        {/* 🗑️ Supprimer */}
                                        <button
                                            type="button"
                                            className="btn join-item btn-error btn-xs"
                                            title="Supprimer cette ligne"
                                            onClick={()=>onRemove(kind, i)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <dialog ref={modalRef} className="modal" onClose={onClose}>
            <div className="modal-box !max-w-none w-[min(96rem,calc(100vw-3rem))] h-[85vh] overflow-y-auto">
                <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg">Tarification — {group?.nom || ''}</h3>
                </div>

                {/* Tabs DaisyUI (radio) */}
                <div className="tabs tabs-lift">
                    {/* Base */}
                    <input
                        type="radio"
                        name={tabsName}
                        className="tab"
                        aria-label="Base"
                        checked={active === 'base'}
                        onChange={() => setActive('base')}
                    />
                    <div className="tab-content bg-base-100 border-base-300 p-4">
                        <Table
                            kind="base"
                            rows={rowsBase}
                            niveaus={niveauxBaseSorted}
                            onAdd={()=>addEmpty('base')}
                            onGen={()=>genDefaultGrid('base')}
                            onSetCell={setCell}
                            onSetPct={setPct}
                            onRemove={removeRow}
                            onDuplicate={duplicateRow}
                        />
                    </div>

                    {allowSurco && (
                        <>
                            <input
                                type="radio"
                                name={tabsName}
                                className="tab"
                                aria-label="Surco"
                                checked={active === 'surco'}
                                onChange={() => setActive('surco')}
                            />
                            <div className="tab-content bg-base-100 border-base-300 p-4">
                                <Table
                                    kind="surco"
                                    rows={rowsSurco}
                                    niveaus={niveauxSurcoSorted}
                                    onAdd={()=>addEmpty('surco')}
                                    onGen={()=>genDefaultGrid('surco')}
                                    onSetCell={setCell}
                                    onSetPct={setPct}
                                    onRemove={removeRow}
                                    onDuplicate={duplicateRow}
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="modal-action">
                    <button className="btn" onClick={onClose}>Annuler</button>
                    <button className="btn btn-primary" onClick={saveAll}>Enregistrer</button>
                </div>
            </div>

            <form method="dialog" className="modal-backdrop">
                <button aria-label="Fermer">close</button>
            </form>
        </dialog>
    );
}
