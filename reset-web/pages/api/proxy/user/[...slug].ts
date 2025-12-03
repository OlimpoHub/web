import type { NextApiRequest, NextApiResponse } from 'next';

/*
  pages/api/proxy/user/[...slug].ts

  Development convenience proxy
  -----------------------------
  This file implements a small server-side proxy that forwards requests from
  `/api/proxy/user/...` to your real backend (configured via `BACKEND_BASE`).

  Why this exists:
  - Browsers enforce CORS; when you cannot change the backend, running a
  server-side proxy keeps requests same-origin and avoids CORS failures in dev.
  - The proxy also includes helpful debug logs and a retry to `127.0.0.1`
    for local backend resolution issues.

  Important:
  - This is strictly a development helper.We do not use an open proxy like this
    in production without restricting allowed targets and adding auth.
  - Do not expose sensitive environment variables to the client. Use server-side
  - This file whole purpose whas to avoid CORS issues during development given i was
    having some problems while trying to connect to the backend.
  - Configure the proxy target with `BACKEND_BASE` (server-side env) or
    `NEXT_PUBLIC_API_BASE` will be used as fallback.
*/
// Server-side only: backend base (do not expose secrets here)
const BACKEND_BASE =
    process.env.BACKEND_BASE || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

function stripHopByHopHeaders(headers: Record<string, string | string[] | undefined>) {
    const hopByHop = new Set([
        'connection',
        'keep-alive',
        'proxy-authenticate',
        'proxy-authorization',
        'te',
        'trailers',
        'transfer-encoding',
        'upgrade',
    ]);
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
        if (!v) continue;
        const key = k.toLowerCase();
        if (hopByHop.has(key)) continue;
        if (Array.isArray(v)) out[k] = v.join(',');
        else out[k] = v;
    }
    return out;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { slug } = req.query as { slug?: string[] };
        const path = Array.isArray(slug) ? slug.join('/') : slug || '';

        // Rebuild query string excluding the slug param
        const qs = Object.entries(req.query)
            .filter(([k]) => k !== 'slug')
            .flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : [[k, String(v)]]))
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');

        const backendUrl = `${BACKEND_BASE.replace(/\/$/, '')}/user/${path}${qs ? `?${qs}` : ''}`;

        const forwardedHeaders = stripHopByHopHeaders(req.headers as Record<string, any>);

        delete forwardedHeaders.host;

        const body = ['GET', 'HEAD', 'OPTIONS'].includes(req.method || '')
            ? undefined
            : JSON.stringify(req.body ?? {});

        console.log('Proxy: forwarding to backendUrl=', backendUrl, 'method=', req.method);
        // Show a subset of forwarded headers for debugging (avoid large logs)
        console.log(
            'Proxy: forwardedHeaders sample=',
            Object.fromEntries(Object.entries(forwardedHeaders).slice(0, 10))
        );

        let backendRes;
        try {
            backendRes = await fetch(backendUrl, {
                method: req.method as string,
                headers: forwardedHeaders,
                body,
                // follow redirects
                redirect: 'follow',
            });
        } catch (err: any) {
            console.error(
                'Proxy: initial fetch failed:',
                err?.message ?? err,
                'cause=',
                err?.cause
            );
            // Retry with 127.0.0.1 if the backend target used localhost and the error looks like ECONNREFUSED
            const causeStr = String(err?.cause ?? err);
            const isConnRefused = causeStr.includes('ECONNREFUSED') || err?.code === 'ECONNREFUSED';
            if (isConnRefused && backendUrl.includes('localhost')) {
                const altUrl = backendUrl.replace('localhost', '127.0.0.1');
                console.warn('Proxy: retrying with altUrl=', altUrl);
                backendRes = await fetch(altUrl, {
                    method: req.method as string,
                    headers: forwardedHeaders,
                    body,
                    redirect: 'follow',
                });
            } else {
                throw err;
            }
        }

        // Forward status and headers (excluding hop-by-hop)
        res.status(backendRes.status);
        backendRes.headers.forEach((value, key) => {
            const lk = key.toLowerCase();
            if (['transfer-encoding', 'connection', 'keep-alive'].includes(lk)) return;
            res.setHeader(key, value);
        });

        const arrayBuffer = await backendRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        res.send(buffer);
    } catch (err: any) {
        console.error('Proxy error:', err);
        res.status(502).json({ error: 'Bad gateway', details: String(err?.message ?? err) });
    }
}
