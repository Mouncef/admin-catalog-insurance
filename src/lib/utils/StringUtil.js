
export function sanitizeUpperKeep(input = '', keep = '') {
    const escaped = keep.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'); // échapper pour la classe de caractères

    return String(input)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')   // enlever les accents
        .replace(/œ/gi, 'oe')              // ligatures
        .replace(/æ/gi, 'ae')
        .toUpperCase()
        .replace(/\s+/g, '_')              // ESPACES -> "_"
        .replace(new RegExp(`[^A-Z0-9_${escaped}]+`, 'g'), ''); // ne garder que A-Z, 0-9, "_" et keep
}

export function normalizeRisk(value, fallback = 'sante') {
    const raw = (value ?? '').toString().trim().toLowerCase();
    if (!raw) return fallback;
    if (raw === 'santé') return 'sante';
    if (raw === 'prevoyance' || raw === 'prévoyance') return 'prevoyance';
    if (raw === 'sante') return 'sante';
    return raw;
}
