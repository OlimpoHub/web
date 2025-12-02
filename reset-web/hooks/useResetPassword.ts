import { useCallback, useState } from 'react';
import * as api from '../lib/passwordApi';

/**
 * hooks/useResetPassword.ts
 *
 * Two hooks used by the reset pages:
 *  - `useRequestReset` handles the "request recovery email" flow (validates email,
 *     calls `requestRecoveryEmail`, and exposes loading/error/info state).
 *  - `useResetPassword` handles the token verification + password update flow.
 *
 * Both hooks use the typed `lib/passwordApi` client so error and network handling
 * is consistent across the app. Keep UI logic in the pages and use these hooks
 * for state and side-effects to make components easier to test.
 */

type RequestState = {
  email: string;
  loading: boolean;
  error?: string | null;
  info?: string | null;
};

export function useRequestReset(): {
  state: RequestState;
  setEmail: (e: string) => void;
  submit: () => Promise<void>;
} {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setError(null);
    setInfo(null);
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('Ingresa un correo válido');
      return;
    }
    setLoading(true);
    try {
      await api.requestRecoveryEmail(email);
      // Always show generic message regardless of backend
      setInfo('Si existe una cuenta con ese correo, se envió un email con instrucciones.');
    } catch (err: any) {
      setError(err?.message || 'Error enviando solicitud');
    } finally {
      setLoading(false);
    }
  }, [email]);

  return {
    state: { email, loading, error, info },
    setEmail,
    submit
  };
}

type ResetState = {
  token?: string;
  verifiedEmail?: string | null;
  isTokenValid?: boolean | null;
  loadingVerify: boolean;
  loadingSubmit: boolean;
  error?: string | null;
  success?: string | null;
};

export function useResetPassword(initialToken?: string) {
  const [token] = useState<string | undefined>(initialToken);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null | undefined>(undefined);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const verify = useCallback(async () => {
    if (!token) {
      setIsTokenValid(null);
      setVerifiedEmail(null);
      return;
    }
    setLoadingVerify(true);
    setError(null);
    try {
      const res = await api.verifyToken(token);
      setIsTokenValid(Boolean(res.valid));
      setVerifiedEmail(res.email ?? null);
    } catch (err: any) {
      setError(err?.message || 'Error verificando token');
      setIsTokenValid(false);
      setVerifiedEmail(null);
    } finally {
      setLoadingVerify(false);
    }
  }, [token]);

  const submit = useCallback(
    async (password: string) => {
      setError(null);
      setSuccess(null);
      if (!verifiedEmail) return setError('Email verificado no disponible');
      if (!password || password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres');
      setLoadingSubmit(true);
      try {
        await api.updatePassword(verifiedEmail, password);
        setSuccess('Contraseña actualizada con éxito. Puedes iniciar sesión.');
      } catch (err: any) {
        if (err?.status === 422) setError('La contraseña no cumple con la política del servidor');
        else setError(err?.message || 'Error actualizando la contraseña');
      } finally {
        setLoadingSubmit(false);
      }
    },
    [verifiedEmail]
  );

  return {
    state: { token, verifiedEmail, isTokenValid, loadingVerify, loadingSubmit, error, success },
    verify,
    submit
  };
}
