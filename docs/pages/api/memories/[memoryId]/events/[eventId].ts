import type { NextApiRequest, NextApiResponse } from 'next';
import { extractTokenFromHeader, validateTokenAndGetUser } from '@/lib/auth';
import {
  getMemoryById,
  getEventById,
  updateEvent,
  deleteEvent,
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

  const { memoryId, eventId } = req.query;
  const memoryIdNum = parseInt(memoryId as string);
  const eventIdNum = parseInt(eventId as string);

  if (isNaN(memoryIdNum) || isNaN(eventIdNum)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  const memory = await getMemoryById(memoryIdNum);
  if (!memory || memory.user_id !== user.id) {
    return res.status(404).json({ error: 'Memory not found' });
  }

  if (req.method === 'PUT') {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    await updateEvent(eventIdNum, text);
    return res.status(200).json({ message: 'Event updated' });
  }

  if (req.method === 'DELETE') {
    await deleteEvent(eventIdNum);
    return res.status(200).json({ message: 'Event deleted' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
