import type { NextApiRequest, NextApiResponse } from 'next';
import { extractTokenFromHeader, validateTokenAndGetUser } from '@/lib/auth';
import {
  getAllMemories,
  getMemoryByDate,
  getMemoriesByMonth,
  createMemory,
  updateMemoryEmotion,
  deleteMemory,
  createEvent,
  getEventsByMemoryId,
  updateEvent,
  deleteEvent,
  reorderEvents
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

  const userId = user.id;

  if (req.method === 'GET') {
    // Get all memories for the user
    const { date, year, month } = req.query;
    
    if (date && typeof date === 'string') {
      // Get memory for specific date (now async)
      const memory = await getMemoryByDate(userId, date);
      if (!memory) {
        return res.status(404).json({ error: 'Memory not found' });
      }
      const events = await getEventsByMemoryId(memory.id);
      return res.status(200).json({ ...memory, events });
    }
    
    if (year && month && typeof year === 'string' && typeof month === 'string') {
      // Get memories for specific month (now async)
      const memories = await getMemoriesByMonth(userId, parseInt(year), parseInt(month));
      return res.status(200).json(memories);
    }
    
    // Get all memories (now async)
    const memories = await getAllMemories(userId);
    return res.status(200).json(memories);
  }

  if (req.method === 'POST') {
    // Create new memory or add event
    const { date, emotion, text, audioUrl } = req.body;

    if (!date || !emotion) {
      return res.status(400).json({ error: 'Date and emotion are required' });
    }

    // Create or update memory (now async)
    const memory = await createMemory(userId, date, emotion);

    // Add event if text is provided (now async)
    if (text) {
      const event = await createEvent(memory.id, text, undefined, audioUrl);
      const events = await getEventsByMemoryId(memory.id);
      return res.status(200).json({ ...memory, events });
    }

    const events = await getEventsByMemoryId(memory.id);
    return res.status(200).json({ ...memory, events });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}