import type { NextApiRequest, NextApiResponse } from 'next';

// Mock implementation of token verification for local testing.
// GET /api/user/verify-token?token=...
// Returns JSON: { valid: boolean, email?: string, message?: string }

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const { token } = req.query;
  const t = Array.isArray(token) ? token[0] : token;
  if (!t) return res.status(400).json({ valid: false, message: 'token missing' });

  // Simple mock rules:
  // - token === 'valid' (or starts with 'valid') => accepted
  // - anything else => invalid
  if (String(t).startsWith('valid')) {
    return res.status(200).json({ valid: true, email: 'user@example.com' });
  }

  return res.status(200).json({ valid: false, message: 'Token inválido o expirado' });
}
