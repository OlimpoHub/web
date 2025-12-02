import type { NextApiRequest, NextApiResponse } from 'next';

// POST /api/user/update-password
// Body: { email: string, password: string }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'email and password required' });
    if (typeof password !== 'string' || password.length < 8)
      return res.status(400).json({ message: 'password must be at least 8 characters' });

    // Simulate work and success
    await new Promise((r) => setTimeout(r, 300));

    return res.status(200).json({ ok: true, message: 'Password updated (mock)' });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'internal error' });
  }
}
