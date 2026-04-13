import type { NextApiRequest, NextApiResponse } from 'next';
import { extractTokenFromHeader, validateTokenAndGetUser } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = extractTokenFromHeader(req.headers.authorization);
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = await validateTokenAndGetUser(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  res.status(200).json({ user });
}