
/*
  pages/reset-password.tsx
  Reads ?token=... and mirrors iOS flow:
  - verifies token via GET /user/verify-token
  - if valid: prefill email (disabled) and show change password form
  - if invalid: show message and link to /request-reset
*/

/**
 * pages/reset-password.tsx
 *
 * Web fallback page for the password-reset flow. Intended behavior:
 *  - Read `?token=...` from the URL (the app's email link may target the app scheme).
 *  - Verify the token with `GET /user/verify-token` and reveal the verified email.
 *  - Provide a web form to submit a new password which calls `POST /user/update-password`.
 *  - Offer an "Abrir en la app" deep-link; the page itself is the fallback when the app
 *    does not open.
 *
 * Notes:
 *  - This page uses `lib/passwordApi` so it respects `NEXT_PUBLIC_API_BASE` and the
 *    dev proxy (`/api/proxy`) if configured.
 *  - Keep the UI minimal; the hook `useResetPassword` manages verify/update state.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { verifyToken as apiVerifyToken, updatePassword as apiUpdatePassword } from '../lib/passwordApi';
import styles from '../styles/reset.module.css';

/**
 * Top-level config — change these values to point to your backend / app scheme.
 * These are intentionally simple constants so testers can change them quickly.
 */
const APP_SCHEME = process.env.NEXT_PUBLIC_APP_SCHEME || 'ElArcaApp';
const MIN_PASSWORD_LENGTH = Number(process.env.NEXT_PUBLIC_MIN_PASSWORD_LENGTH) || 8;
const SHOW_TOKEN_COPY = (process.env.NEXT_PUBLIC_SHOW_TOKEN_COPY || 'true') === 'true';

type VerifyResponse = {
  valid: boolean;
  email?: string;
  message?: string;
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const rawToken = router.query.token;
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  // verify states
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);

  // (no automatic app-open attempt — page is a fallback)

  // web form state
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const successRef = useRef<HTMLDivElement | null>(null);

  // paste-token input for when no token is provided
  const [pasteToken, setPasteToken] = useState('');

  useEffect(() => {
    if (!token) {
      // clear previous verify when token removed
      setVerifyResult(null);
      setVerifyError(null);
      return;
    }
    // run verification
    verifyToken(String(token));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function verifyToken(tok: string) {
    setVerifying(true);
    setVerifyError(null);
    setVerifyResult(null);
    try {
      const data: any = await apiVerifyToken(tok);
      setVerifyResult({ valid: Boolean(data?.valid), email: data?.email ?? undefined, message: data?.message ?? undefined });
    } catch (err: any) {
      setVerifyError(err?.message || 'Error verifying token');
    } finally {
      setVerifying(false);
    }
  }

  // Try to open the native app using the scheme (used by the "Abrir en la app" button).
  // This function does not trigger any automatic fallback behavior — the page
  // itself is the fallback and remains available to the user.
  function attemptOpenApp(tok: string) {
    if (!tok) return;
    const appLink = `${APP_SCHEME}://update-password?token=${encodeURIComponent(tok)}`;
    try {
      // primary attempt
      window.location.href = appLink;
    } catch (e) {
      // ignore
    }

    // best-effort iframe fallback for older iOS iframes
    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = appLink;
      document.body.appendChild(iframe);
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1000);
    } catch (e) {
      // ignore
    }
  }

  function onPasteTokenUse() {
    if (!pasteToken) return;
    // navigate to same page with token param
    router.push(`/reset-password?token=${encodeURIComponent(pasteToken)}`);
  }

  function focusFirstInvalid() {
    // focus password field if invalid
    const el = document.querySelector('input[name="password"]') as HTMLInputElement | null;
    if (el) el.focus();
  }

  function validateForm(): string | null {
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }
    if (password !== confirm) {
      return 'Las contraseñas no coinciden.';
    }
    return null;
  }

  async function onSubmitForm(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setFormError(null);
    const v = validateForm();
    if (v) {
      setFormError(v);
      focusFirstInvalid();
      return;
    }
    setFormLoading(true);
    try {
      // We expect verifyResult.email to be present after successful verify
      const email = verifyResult?.email;
      if (!email) throw new Error('No email available from token verification');
      await apiUpdatePassword(email, password);
      setFormSuccess(true);
      setTimeout(() => successRef.current?.focus(), 50);
    } catch (err: any) {
      setFormError(err?.message || 'Error enviando la nueva contraseña');
    } finally {
      setFormLoading(false);
    }
  }

  // no standalone UI helper functions remain; buttons below use inline handlers/links

  return (
    <main className={styles.container}>
      <div className={styles.card} role="main">
        <div className={styles.headerRow}>
          <img src="/logo.png" alt="El Arca logo" className={styles.logo} />
          <div className={styles.orgText}>El Arca en Querétaro I.A.P</div>
          <h1 className={styles.heroTitle}>Restablecer contraseña</h1>
        </div>

        {!token && (
          <div>
            <p>
              Este es el fallback web para restablecer contraseñas. Si tienes un token,
              pégalo abajo y pulsa "Usar token".
            </p>

            <label className={styles.label} htmlFor="paste-token">
              Token
            </label>
            <input
              id="paste-token"
              name="paste-token"
              className={styles.input}
              value={pasteToken}
              onChange={(e) => setPasteToken(e.target.value)}
              placeholder="pega el token aquí"
              aria-describedby="paste-token-desc"
            />
            <div id="paste-token-desc" className={styles.hint}>
              Luego de pegar el token, pulsa "Usar token" para continuar.
            </div>
            <div className={styles.actions}>
              <button className={`${styles.cta} ${styles.ctaFull}`} onClick={onPasteTokenUse}>
                Usar token
              </button>
            </div>
          </div>
        )}

        {token && (
          <div>
            {verifying && <p aria-live="polite">Verificando token…</p>}
            {verifyError && (
              <div className={styles.centerText}>
                <p className={styles.error}>Error: {verifyError}</p>
                <div className={styles.actionsCenter}>
                  <button
                    className={styles.button}
                    onClick={() => {
                      verifyToken(String(token));
                    }}
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            )}

            {verifyResult && verifyResult.valid === false && (
              <div className={styles.centerText}>
                <p className={styles.error}>
                  {verifyResult.message || '!Token! Invalido intente de nuev'}
                </p>
                <div className={styles.actionsCenter}>
                  <a className={styles.button} href="/login">Volver al inicio de sesión</a>
                </div>
              </div>
            )}

            {verifyResult && verifyResult.valid === true && (
              <div>

                {verifyResult.email && (
                  <div className={styles.field} style={{ marginBottom: 12 }}>
                    <label>Email verificado</label>
                    <input className={styles.input} value={verifyResult.email} readOnly disabled />
                  </div>
                )}

                {/* "Abrir en la app" removed */}

                <div className={styles.hint}>
                  Si la app se abre, continúa allí. Si no, usa el formulario web a
                  continuación para cambiar tu contraseña.
                </div>

                {/* Inline web form */}
                <div className={styles.formWrapper}>
                  {formSuccess ? (
                    <div
                      tabIndex={-1}
                      ref={successRef}
                      className={styles.success}
                      aria-live="polite"
                    >
                      Contraseña actualizada con éxito.
                      {/* success action removed: "Abrir en la app" removed */}
                    </div>
                  ) : (
                    <form onSubmit={(e) => onSubmitForm(e)} className={styles.form} noValidate>
                      <div className={styles.field}>
                        <label htmlFor="password">Nueva contraseña</label>
                        <input
                          id="password"
                          name="password"
                          type="password"
                          className={styles.input}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          minLength={MIN_PASSWORD_LENGTH}
                          required
                          aria-describedby="password-desc"
                        />
                        <div id="password-desc" className={styles.hint}>
                          Al menos {MIN_PASSWORD_LENGTH} caracteres.
                        </div>
                      </div>

                      <div className={styles.field}>
                        <label htmlFor="confirm">Confirmar contraseña</label>
                        <input
                          id="confirm"
                          name="confirm"
                          type="password"
                          className={styles.input}
                          value={confirm}
                          onChange={(e) => setConfirm(e.target.value)}
                          minLength={MIN_PASSWORD_LENGTH}
                          required
                        />
                      </div>

                      {formError && <div className={styles.error}>{formError}</div>}

                      <div className={styles.actions}>
                        <button className={`${styles.cta} ${styles.ctaFull}`} type="submit" disabled={formLoading}>
                          {formLoading ? 'Enviando…' : 'Actualizar contraseña'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
