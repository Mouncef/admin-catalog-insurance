'use client';

const SYSTEM_USER = 'system';

const nowISO = () => new Date().toISOString();

export function getUsername(user) {
    return user?.username || SYSTEM_USER;
}

export function applyCreateAudit(payload, user) {
    const username = getUsername(user);
    const now = nowISO();
    return {
        ...payload,
        createdAt: payload.createdAt || now,
        createdBy: payload.createdBy || username,
        updatedAt: now,
        updatedBy: username,
        deletedAt: payload.deletedAt ?? null,
        deletedBy: payload.deletedBy ?? null,
    };
}

export function applyUpdateAudit(payload, user) {
    const username = getUsername(user);
    const now = nowISO();
    return {
        ...payload,
        updatedAt: now,
        updatedBy: username,
    };
}

export function applyDeleteAudit(payload, user) {
    const username = getUsername(user);
    const now = nowISO();
    return {
        ...payload,
        deletedAt: now,
        deletedBy: username,
    };
}

export function ensureAuditFields(entry) {
    if (entry.createdAt && entry.createdBy && entry.updatedAt && entry.updatedBy && 'deletedAt' in entry && 'deletedBy' in entry) {
        return entry;
    }
    const now = nowISO();
    const createdAt = entry.createdAt || now;
    const createdBy = entry.createdBy || SYSTEM_USER;
    return {
        ...entry,
        createdAt,
        createdBy,
        updatedAt: entry.updatedAt || createdAt,
        updatedBy: entry.updatedBy || createdBy,
        deletedAt: entry.deletedAt ?? null,
        deletedBy: entry.deletedBy ?? null,
    };
}
