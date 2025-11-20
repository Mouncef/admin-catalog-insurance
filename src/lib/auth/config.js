export const STATIC_USERS = [
    {
        username: 'admin',
        password: 'admin123',
        displayName: 'Admin Demo',
        roles: ['admin', 'editor', 'viewer'],
    },
    {
        username: 'editor',
        password: 'editor123',
        displayName: 'Éditeur Démo',
        roles: ['editor', 'viewer'],
    },
    {
        username: 'viewer',
        password: 'viewer123',
        displayName: 'Lecteur Démo',
        roles: ['viewer'],
    },
];

export const PUBLIC_ROUTES = ['/login'];

export const ROUTE_PERMISSIONS = [
    {pattern: /^\/catalogues\/[^/]+\/configure/, roles: ['viewer', 'editor', 'admin']},
    {pattern: /^\/catalogues/, roles: ['viewer', 'editor', 'admin']},
    {pattern: /^\/modules/, roles: ['viewer', 'editor', 'admin']},
    {pattern: /^\/garanties/, roles: ['viewer', 'editor', 'admin']},
    {pattern: /^\/offres/, roles: ['viewer', 'editor', 'admin']},
];

export const DEFAULT_ROLES = ['viewer'];

export const ROLE_CAPABILITIES = {
    admin: {view: true, create: true, update: true, delete: true},
    editor: {view: true, create: true, update: true, delete: false},
    viewer: {view: true, create: false, update: false, delete: false},
};

export const DEFAULT_CAPABILITIES = {view: true, create: false, update: false, delete: false};

export function isPublicRoute(pathname = '/') {
    const target = pathname || '/';
    return PUBLIC_ROUTES.some((route) => target === route || target.startsWith(`${route}/`));
}

export function getRequiredRoles(pathname = '/') {
    const target = pathname || '/';
    for (const rule of ROUTE_PERMISSIONS) {
        if (rule.pattern.test(target)) {
            return rule.roles;
        }
    }
    return DEFAULT_ROLES;
}
