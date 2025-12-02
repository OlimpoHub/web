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
import styles from '../styles/reset.module.css';

export default function RequestResetPage() {
  const { state, setEmail, submit } = useRequestReset();

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <img src="/logo.png" alt="El Arca logo" className={styles.logo} />
        </div>

        <h2 className={styles.heroTitle}>
          <a className={styles.heroLink} href="#">¿Olvidaste tu contraseña?</a>
        </h2>

        <p className={styles.hint} style={{marginTop:42}}>Ingresa tu correo electrónico</p>

        <div className={styles.field} style={{ marginTop: 12}}>
          <label className={styles.label} htmlFor="email"></label>
          <input
            id="email"
            type="email"
            placeholder="E.G. ejemplo@correo.com"
            value={state.email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
          />
        </div>

        {state.error && <div className={styles.error}>{state.error}</div>}
        {state.info && <div className={styles.success}>{state.info}</div>}

        <div className={styles.actions}>
          <button className={`${styles.cta} ${styles.ctaFull}`} onClick={() => submit()} disabled={state.loading}>
            {state.loading ? 'Enviando…' : 'Enviar Correo'}
          </button>
        </div>
      </div>
    </main>
  );
}
