'use client';

import {useMemo} from 'react';
import {usePathname} from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import Footer from '@/components/layout/Footer';
import Sidebar from '@/components/layout/Sidebar';
import AuthGate from '@/components/auth/AuthGate';
import {isPublicRoute} from '@/lib/auth/config';

export default function AppShell({children}) {
    const pathname = usePathname() || '/';
    const drawerId = 'my-drawer-2';
    const publicRoute = isPublicRoute(pathname);

    const shell = useMemo(() => {
        if (publicRoute) {
            return (
                <div className="min-h-svh flex items-center justify-center bg-base-200 px-4">
                    <div className="w-full max-w-lg">{children}</div>
                </div>
            );
        }

        return (
            <div className="drawer lg:drawer-open min-h-svh">
                <div className="drawer-content flex flex-col min-h-svh">
                    <Navbar drawerId={drawerId} />
                    <main className="flex-1 p-4 md:p-6 lg:p-8">
                        <div className="mx-auto space-y-4">
                            <Breadcrumbs />
                            {children}
                        </div>
                    </main>
                    <Footer />
                </div>
                <Sidebar drawerId={drawerId} />
            </div>
        );
    }, [children, drawerId, publicRoute]);

    return <AuthGate>{shell}</AuthGate>;
}
