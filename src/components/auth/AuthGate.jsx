'use client';

import {useEffect} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {useAuth} from '@/providers/AuthProvider';
import {getRequiredRoles, isPublicRoute} from '@/lib/auth/config';

export default function AuthGate({children}) {
    const {isAuthenticated, loading, hasAnyRole} = useAuth();
    const pathname = usePathname() || '/';
    const router = useRouter();
    const publicRoute = isPublicRoute(pathname);

    useEffect(() => {
        if (publicRoute || loading) return;
        if (!isAuthenticated) {
            const suffix = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
            router.replace(`/login${suffix}`);
        }
    }, [publicRoute, loading, isAuthenticated, pathname, router]);

    if (publicRoute) {
        return <>{children}</>;
    }

    if (loading) {
        return (
            <div className="min-h-svh flex items-center justify-center bg-base-200">
                <div className="space-y-2 text-center">
                    <div className="loading loading-spinner loading-lg mx-auto" />
                    <p className="text-sm opacity-70">Chargement de votre session…</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-svh flex items-center justify-center bg-base-200">
                <div className="text-center space-y-2">
                    <p className="text-lg font-semibold">Redirection vers la connexion…</p>
                </div>
            </div>
        );
    }

    const requiredRoles = getRequiredRoles(pathname);
    const authorized = hasAnyRole(requiredRoles);

    if (!authorized) {
        return (
            <div className="min-h-svh flex items-center justify-center bg-base-200 px-4">
                <div className="card bg-base-100 shadow-lg max-w-md w-full">
                    <div className="card-body space-y-3">
                        <h2 className="card-title text-error">Accès refusé</h2>
                        <p className="text-sm opacity-70">
                            Vous ne disposez pas des autorisations nécessaires pour consulter cette page.
                        </p>
                        <div className="badge badge-outline">
                            Accès requis&nbsp;: {requiredRoles.join(', ')}
                        </div>
                        <button className="btn btn-outline" type="button" onClick={() => router.push('/')}>
                            ← Retour à l’accueil
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
