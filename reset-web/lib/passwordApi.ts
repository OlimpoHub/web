/**
 * lib/passwordApi.ts
 *
 * Typed client for the password recovery/reset HTTP API used by the web fallback.
 * Purpose:
 *  - Keep all network calls in one place so pages/hooks remain simple and testable.
 *  - Throw `ApiError` with `status` and `data` for proper error handling in UI code.
 *
 * Exported helpers:
 *  - `requestRecoveryEmail(email)` -> POST /user/recover-password
 *  - `verifyToken(token)` -> GET /user/verify-token?token=...
 *  - `updatePassword(email, password)` -> POST /user/update-password
 *
 * Configuration:
 *  - Uses `process.env.NEXT_PUBLIC_API_BASE` as the API base. It supports both
 *    absolute values (e.g. `http://localhost:8080`) and relative paths
 *    (e.g. `/api/proxy`) so you can run the dev proxy or call the backend directly.
 *
 * Notes:
 *  - Network-level failures (CORS/preflight, TLS, ECONNREFUSED) throw an `ApiError`
 *    with `status === 0` and a descriptive message so the UI can display helpful text.
 */

export class ApiError extends Error {
    status: number;
    data?: any;
    constructor(status: number, message: string, data?: any) {
        super(message);
        this.status = status;
        this.data = data;
        Object.setPrototypeOf(this, ApiError.prototype);
    }
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

function buildUrl(path: string) {
    if (!API_BASE) throw new Error('NEXT_PUBLIC_API_BASE is not set');
    // If API_BASE is an absolute URL (has a scheme), use the URL constructor
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(API_BASE)) {
        return new URL(path, API_BASE).toString();
    }
    // Otherwise treat API_BASE as a relative path (e.g. '/api/proxy') and concatenate safely
    const base = API_BASE.replace(/\/$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${base}${p}`;
}

async function fetchWithHandling(input: RequestInfo, init?: RequestInit) {
    try {
        // Explicitly use CORS mode for clarity when calling cross-origin APIs
        const opts: RequestInit = { mode: 'cors', ...(init || {}) };
        const res = await fetch(input, opts);
        return res;
    } catch (err: any) {
        // Network-level failures (server down, DNS, TLS, or CORS preflight failure)
        const msg = err?.message ?? String(err);
        throw new ApiError(0, `Network error or CORS issue: ${msg}`, { originalError: err });
    }
}

async function handleResponse(res: Response) {
    const ct = res.headers.get('content-type') || '';
    let body: any = null;
    if (ct.includes('application/json')) {
        try {
            body = await res.json();
        } catch (e) {
            body = null;
        }
    } else {
        try {
            body = await res.text();
        } catch (e) {
            body = null;
        }
    }

    if (!res.ok) {
        const message =
            (body && (body.message || body.error)) || res.statusText || 'Request failed';
        throw new ApiError(res.status, String(message), body);
    }
    return body;
}

export async function requestRecoveryEmail(email: string): Promise<void> {
    const url = buildUrl('/user/recover-password');
    const res = await fetchWithHandling(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({ email }),
    });
    await handleResponse(res);
}

export async function verifyToken(
    token: string
): Promise<{ valid: boolean; email?: string | null }> {
    const url = buildUrl(`/user/verify-token?token=${encodeURIComponent(token)}`);
    const res = await fetchWithHandling(url, { method: 'GET', credentials: 'omit' });
    const body = await handleResponse(res);
    // Expect { valid: boolean, email?: string|null }
    return { valid: Boolean(body?.valid), email: body?.email ?? null };
}

export async function updatePassword(email: string, password: string): Promise<void> {
    const url = buildUrl('/user/update-password');
    const res = await fetchWithHandling(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({ email, password }),
    });
    await handleResponse(res);
}
