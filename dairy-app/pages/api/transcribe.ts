import type { NextApiRequest, NextApiResponse } from 'next';
import { extractTokenFromHeader, validateTokenAndGetUser } from '@/lib/auth';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false, // we handle multipart ourselves
  },
};

const ASSEMBLYAI_API_KEY = '2ed41fb9b3244c62b464610c68a8d337';
const BASE_URL = 'https://api.assemblyai.com';

// ── helpers ──────────────────────────────────────────────────────────────────

async function uploadAudioToAssemblyAI(filePath: string): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);

  const uploadRes = await fetch(`${BASE_URL}/v2/upload`, {
    method: 'POST',
    headers: {
      authorization: ASSEMBLYAI_API_KEY,
      'content-type': 'application/octet-stream',
    },
    body: fileBuffer,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`AssemblyAI upload failed: ${err}`);
  }

  const { upload_url } = await uploadRes.json();
  return upload_url as string;
}

async function requestTranscript(audioUrl: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/v2/transcript`, {
    method: 'POST',
    headers: {
      authorization: ASSEMBLYAI_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      speaker_labels: false, // single speaker
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AssemblyAI transcript request failed: ${err}`);
  }

  const { id } = await res.json();
  return id as string;
}

async function pollTranscript(transcriptId: string): Promise<string> {
  const pollingUrl = `${BASE_URL}/v2/transcript/${transcriptId}`;

  // Poll every 3 seconds, up to 5 minutes (100 attempts)
  for (let i = 0; i < 100; i++) {
    await new Promise<void>((r) => setTimeout(r, 3000));

    const res = await fetch(pollingUrl, {
      headers: { authorization: ASSEMBLYAI_API_KEY },
    });

    if (!res.ok) throw new Error('AssemblyAI polling request failed');

    const data = await res.json();

    if (data.status === 'completed') {
      return (data.text as string) || '(no speech detected)';
    }

    if (data.status === 'error') {
      throw new Error(`AssemblyAI transcription error: ${data.error}`);
    }

    // status === 'queued' | 'processing' — keep polling
  }

  throw new Error('AssemblyAI transcription timed out');
}

// ── handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth
  const token = extractTokenFromHeader(req.headers.authorization);
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  const user = await validateTokenAndGetUser(token);
  if (!user) return res.status(401).json({ error: 'Invalid or expired token' });

  // Parse multipart form
  const form = formidable({ keepExtensions: true, maxFileSize: 25 * 1024 * 1024 });

  let filePath: string | undefined;

  try {
    const [, files] = await form.parse(req);

    const uploaded = files.audio;
    const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;

    if (!file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    filePath = file.filepath;

    // 1. Upload raw audio to AssemblyAI
    const audioUrl = await uploadAudioToAssemblyAI(filePath);

    // 2. Request transcription
    const transcriptId = await requestTranscript(audioUrl);

    // 3. Poll until done
    const text = await pollTranscript(transcriptId);

    return res.status(200).json({ text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Transcription failed';
    console.error('Transcription error:', err);
    return res.status(500).json({ error: message });
  } finally {
    // Clean up temp file
    if (filePath) {
      try { fs.unlinkSync(filePath); } catch { /* ignore */ }
    }
  }
}
