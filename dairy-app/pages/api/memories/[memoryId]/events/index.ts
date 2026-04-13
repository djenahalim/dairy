import type { NextApiRequest, NextApiResponse } from 'next';
import { extractTokenFromHeader, validateTokenAndGetUser } from '@/lib/auth';
import {
  getMemoryById,
  createEvent,
  getEventsByMemoryId,
} from '@/lib/db-sqlite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = extractTokenFromHeader(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = await validateTokenAndGetUser(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { memoryId } = req.query;
  const memoryIdNum = parseInt(memoryId as string);

  if (isNaN(memoryIdNum)) {
    return res.status(400).json({ error: 'Invalid memory ID' });
  }

  const memory = await getMemoryById(memoryIdNum);
  if (!memory || memory.user_id !== user.id) {
    return res.status(404).json({ error: 'Memory not found' });
  }

  if (req.method === 'GET') {
    const events = await getEventsByMemoryId(memoryIdNum);
    return res.status(200).json(events);
  }

  if (req.method === 'POST') {
    const { text, audioUrl } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Event text is required' });
    }

    const event = await createEvent(memoryIdNum, text, undefined, audioUrl);
    return res.status(201).json(event);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
