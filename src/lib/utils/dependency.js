const OPERATORS = new Set(['add', 'sub', 'mul', 'div']);

function normalizeSimpleDependency(raw, context = {}) {
    const actId = raw.act_id || raw.target_act_id;
    if (!actId) return null;

    const normalized = {
        act_id: String(actId),
    };

    const rawKind = String(raw.kind || context.kind || '').toLowerCase();
    if (rawKind === 'surco') normalized.kind = 'surco';
    else if (rawKind.startsWith('option')) normalized.kind = 'option';
    else normalized.kind = 'base';

    const levelId = raw.niveau_id || context.levelId || context.defaultLevelId || null;
    normalized.niveau_id = levelId ? String(levelId) : null;

    if (normalized.kind === 'option') {
        const optionId =
            raw.option_level_id ||
            (raw.kind && raw.kind.startsWith('option-') ? raw.kind.slice('option-'.length) : null) ||
            context.optionLevelId ||
            null;
        normalized.option_level_id = optionId ? String(optionId) : null;
    }

    const rawMode = String(raw.mode || context.mode || '').toLowerCase();
    normalized.mode = rawMode === 'percent' ? 'percent' : 'copy';

    if (normalized.mode === 'percent') {
        const percent = Number(raw.percent ?? context.percent);
        normalized.percent = Number.isFinite(percent) ? percent : null;
    }

    return normalized;
}

function normalizeOperand(raw, context = {}) {
    if (!raw || typeof raw !== 'object') return null;
    const actId = raw.act_id || raw.target_act_id;
    if (!actId) return null;
    const op = {
        act_id: String(actId),
    };
    const kindRaw = String(raw.kind || context.kind || '').toLowerCase();
    if (kindRaw === 'surco') op.kind = 'surco';
    else if (kindRaw.startsWith('option')) op.kind = 'option';
    else op.kind = 'base';

    const levelId = raw.niveau_id || context.levelId || context.defaultLevelId || null;
    op.niveau_id = levelId ? String(levelId) : null;
    if (op.kind === 'option') {
        const optionId =
            raw.option_level_id ||
            (raw.kind && raw.kind.startsWith('option-') ? raw.kind.slice('option-'.length) : null) ||
            context.optionLevelId ||
            null;
        op.option_level_id = optionId ? String(optionId) : null;
    }

    const value = Number(raw.value ?? raw.amount);
    if (Number.isFinite(value)) op.value = value;
    const min = Number(raw.min);
    if (Number.isFinite(min)) op.min = min;
    const max = Number(raw.max);
    if (Number.isFinite(max)) op.max = max;

    return op;
}

export function normalizeDependency(raw, context = {}) {
    if (!raw || typeof raw !== 'object') return null;
    const rawMode = String(raw.mode || context.mode || 'copy').toLowerCase();
    if (rawMode === 'formula') {
        const operator = OPERATORS.has(raw.operator) ? raw.operator : 'add';
        const operands = Array.isArray(raw.operands)
            ? raw.operands
                .map((op) => normalizeOperand(op, context))
                .filter((op) => !!op)
            : [];
        if (operands.length === 0) return null;
        return {
            mode: 'formula',
            operator,
            operands,
        };
    }
    const base = normalizeSimpleDependency(raw, {...context, mode: rawMode});
    if (!base) return null;
    return base;
}
