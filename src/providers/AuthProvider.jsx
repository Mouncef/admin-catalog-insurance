'use client';

import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {DEFAULT_CAPABILITIES, ROLE_CAPABILITIES, STATIC_USERS} from '@/lib/auth/config';

const AuthContext = createContext(null);
const STORAGE_KEY = 'app:auth:user';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const mergeCapabilities = (roles = []) => {
    const caps = {...DEFAULT_CAPABILITIES};
    for (const role of roles || []) {
        const defs = ROLE_CAPABILITIES[role];
        if (!defs) continue;
        Object.entries(defs).forEach(([key, value]) => {
            if (value) caps[key] = true;
        });
    }
    return caps;
};

export function AuthProvider({children}) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.username) {
                    setUser(parsed);
                }
            }
        } catch (err) {
            console.warn('Impossible de lire la session', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const login = useCallback(async (username, password) => {
        await sleep(250);
        const normalizedUsername = String(username || '').trim().toLowerCase();
        const match = STATIC_USERS.find(
            (candidate) =>
                candidate.username.toLowerCase() === normalizedUsername &&
                candidate.password === String(password || '')
        );
        if (!match) {
            throw new Error('Identifiants invalides');
        }
        const payload = {
            username: match.username,
            displayName: match.displayName || match.username,
            roles: Array.isArray(match.roles) ? match.roles : [],
        };
        setUser(payload);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        return payload;
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (err) {
            console.warn('Impossible de nettoyer la session', err);
        }
    }, []);

    const hasRole = useCallback(
        (role) => {
            if (!role) return false;
            return Array.isArray(user?.roles) && user.roles.includes(role);
        },
        [user]
    );

    const hasAnyRole = useCallback(
        (roles) => {
            if (!Array.isArray(roles) || roles.length === 0) return true;
            if (!Array.isArray(user?.roles)) return false;
            return roles.some((role) => user.roles.includes(role));
        },
        [user]
    );

    const capabilities = useMemo(() => mergeCapabilities(user?.roles || []), [user?.roles]);
    const can = useCallback(
        (action) => {
            if (!action) return false;
            return !!capabilities[action];
        },
        [capabilities]
    );

    const value = useMemo(
        () => ({
            user,
            loading,
            isAuthenticated: !!user,
            login,
            logout,
            hasRole,
            hasAnyRole,
            capabilities,
            can,
        }),
        [user, loading, login, logout, hasRole, hasAnyRole, capabilities, can]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth doit être utilisé dans un AuthProvider');
    }
    return context;
}

export function usePermissions() {
    const ctx = useAuth();
    const summary = useMemo(
        () => ({
            canView: ctx.can('view'),
            canCreate: ctx.can('create'),
            canUpdate: ctx.can('update'),
            canDelete: ctx.can('delete'),
        }),
        [ctx]
    );
    return {
        ...summary,
        capabilities: ctx.capabilities,
        can: ctx.can,
    };
}
