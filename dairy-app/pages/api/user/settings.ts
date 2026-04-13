import type { NextApiRequest, NextApiResponse } from 'next';
import { extractTokenFromHeader, validateTokenAndGetUser } from '@/lib/auth';
import { updateUserSettings } from '@/lib/db-sqlite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = extractTokenFromHeader(req.headers.authorization);
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = await validateTokenAndGetUser(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { displayName, theme } = req.body;

  if (!displayName || !theme) {
    return res.status(400).json({ error: 'Display name and theme are required' });
  }

  // Update settings (now async)
  const result = await updateUserSettings(user.id, displayName, theme);
  
  if (result) {
    res.status(200).json({ message: 'Settings updated successfully' });
  } else {
    res.status(500).json({ error: 'Failed to update settings' });
  }
}