'use client';

import {useEffect, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {useAuth} from '@/providers/AuthProvider';
import {STATIC_USERS} from '@/lib/auth/config';

export default function LoginPageClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextParam = searchParams.get('next') || '/';
    const {login, isAuthenticated} = useAuth();
    const [form, setForm] = useState({username: '', password: ''});
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            router.replace(nextParam || '/');
        }
    }, [isAuthenticated, nextParam, router]);

    const handleChange = (evt) => {
        const {name, value} = evt.target;
        setForm((prev) => ({...prev, [name]: value}));
    };

    const handleSubmit = async (evt) => {
        evt.preventDefault();
        setError('');
        try {
            setSubmitting(true);
            await login(form.username, form.password);
            router.replace(nextParam || '/');
        } catch (err) {
            setError(err?.message || 'Connexion impossible');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body space-y-4">
                <div>
                    <h1 className="text-2xl font-semibold">Connexion</h1>
                    <p className="text-sm opacity-70">Identifiants de démonstration statiques.</p>
                </div>

                {error && (
                    <div className="alert alert-error text-sm">
                        <span>{error}</span>
                    </div>
                )}

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <label className="form-control w-full">
                        <span className="label-text">Nom d’utilisateur</span>
                        <input
                            className="input input-bordered w-full"
                            name="username"
                            value={form.username}
                            onChange={handleChange}
                            autoComplete="username"
                            placeholder="admin"
                            required
                        />
                    </label>
                    <label className="form-control w-full">
                        <span className="label-text">Mot de passe</span>
                        <input
                            className="input input-bordered w-full"
                            name="password"
                            type="password"
                            value={form.password}
                            onChange={handleChange}
                            autoComplete="current-password"
                            placeholder="admin123"
                            required
                        />
                    </label>
                    <button className="btn btn-primary w-full" type="submit" disabled={submitting}>
                        {submitting && <span className="loading loading-spinner loading-sm" />}
                        <span className="ml-1">Se connecter</span>
                    </button>
                </form>

                <div className="divider my-2">Rôles disponibles</div>

                <ul className="space-y-2 text-sm">
                    {STATIC_USERS.map((user) => (
                        <li key={user.username} className="flex items-center justify-between">
                            <div>
                                <span className="font-semibold">{user.username}</span>{' '}
                                <span className="opacity-70">({user.roles.join(', ')})</span>
                            </div>
                            <code className="text-xs bg-base-200 px-2 py-1 rounded">mdp: {user.password}</code>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
