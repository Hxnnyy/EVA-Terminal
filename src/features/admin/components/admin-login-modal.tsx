'use client';

import { FormEvent, useState } from 'react';

import { useAdminAuth } from '@/features/admin/components/use-admin-auth';

const CREDENTIAL_TOOLTIP =
  'Create a user in Supabase Authentication with email/password. ' +
  'Add "role": "admin" to the user\'s app_metadata to grant admin access. ' +
  'See README for detailed setup instructions.';

export function AdminLoginModal() {
  const { isModalOpen, closeModal, signIn, status, error } = useAdminAuth();
  const [credentials, setCredentials] = useState({ email: '', password: '' });

  if (!isModalOpen) {
    return null;
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await signIn(credentials);
  };

  return (
    <div className="admin-modal" role="dialog" aria-modal="true">
      <div className="admin-modal__panel">
        <button className="admin-modal__close" onClick={closeModal} aria-label="Close admin login">
          X
        </button>
        <h2>MAGI Admin Login</h2>
        <p title={CREDENTIAL_TOOLTIP} className="admin-modal__subtitle">
          Enter your Admin credentials to continue.
          <span className="admin-modal__tooltip-hint" aria-hidden="true">
            {' '}
            ⓘ
          </span>
        </p>
        <form className="admin-modal__form" onSubmit={onSubmit}>
          <label>
            Email
            <input
              type="email"
              value={credentials.email}
              onChange={(event) =>
                setCredentials((prev) => ({ ...prev, email: event.target.value }))
              }
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={credentials.password}
              onChange={(event) =>
                setCredentials((prev) => ({ ...prev, password: event.target.value }))
              }
              required
            />
          </label>
          {error ? <p className="admin-modal__error">{error}</p> : null}
          <button type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
