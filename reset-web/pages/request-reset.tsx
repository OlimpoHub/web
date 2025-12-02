/**
 * pages/request-reset.tsx
 *
 * Simple page that lets the user request a recovery email. The implementation
 * uses the `useRequestReset` hook which:
 *  - validates the email client-side
 *  - calls `requestRecoveryEmail(email)` via `lib/passwordApi`
 *  - always shows a generic message (so the UI doesn't leak whether an email exists)
 *
 * This page is intentionally minimal — it is the visible entry point when users
 * click "I forgot my password" or when the app falls back to the web.
 */
import React from 'react';
import { useRequestReset } from '../hooks/useResetPassword';

export default function RequestResetPage() {
  const { state, setEmail, submit } = useRequestReset();

  return (
    <main style={{ padding: 20, maxWidth: 640, margin: '0 auto' }}>
      <h1>Solicitar recuperación de contraseña</h1>
      <p>Ingresa tu correo para recibir instrucciones para restablecer tu contraseña.</p>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="email">Correo</label>
        <input
          id="email"
          type="email"
          value={state.email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: 'block', width: '100%', padding: 8, marginTop: 6 }}
        />
      </div>

      {state.error && <div style={{ color: 'crimson', marginTop: 8 }}>{state.error}</div>}
      {state.info && <div style={{ color: 'green', marginTop: 8 }}>{state.info}</div>}

      <div style={{ marginTop: 12 }}>
        <button onClick={() => submit()} disabled={state.loading}>
          {state.loading ? 'Enviando…' : 'Enviar correo de recuperación'}
        </button>
      </div>
    </main>
  );
}
