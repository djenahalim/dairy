import type { NextApiRequest, NextApiResponse } from 'next';
import { extractTokenFromHeader, validateTokenAndGetUser } from '@/lib/auth';
import {
  getMemoryById,
  deleteMemory,
  getEventsByMemoryId,
  createEvent,
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
  const { memoryId } = req.query;

  if (req.method === 'GET') {
    // Get memory details with events
    const memoryIdNum = parseInt(memoryId as string);
    if (isNaN(memoryIdNum)) {
      return res.status(400).json({ error: 'Invalid memory ID' });
    }

    // Get memory by ID (now async)
    const memory = await getMemoryById(memoryIdNum);
    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    // Get events for this memory (now async)
    const events = await getEventsByMemoryId(memoryIdNum);
    return res.status(200).json({ ...memory, events });
  }

  if (req.method === 'DELETE') {
    // Delete memory
    const memoryIdNum = parseInt(memoryId as string);
    if (isNaN(memoryIdNum)) {
      return res.status(400).json({ error: 'Invalid memory ID' });
    }

    // Delete memory (now async)
    const result = await deleteMemory(memoryIdNum);
    if (result) {
      return res.status(200).json({ message: 'Memory deleted' });
    }
    return res.status(404).json({ error: 'Memory not found' });
  }

  if (req.method === 'PUT') {
    // Update memory or reorder events
    const { action, eventIds } = req.body;
    
    if (action === 'reorder' && Array.isArray(eventIds)) {
      // Reorder events (now async)
      await reorderEvents(parseInt(memoryId as string), eventIds);
      return res.status(200).json({ message: 'Events reordered' });
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}