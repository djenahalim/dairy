import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const dbPath = path.join(process.cwd(), 'dairy.db');

let db: Database | null = null;

// Initialize SQLite database
async function getDatabase(): Promise<Database> {
  if (!db) {
    const SQL = await initSqlJs();
    
    // Load existing database or create new one
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
      initializeSchema(db);
    }
  }
  return db;
}

// Save database to file
function saveDatabase(database: Database) {
  const data = database.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
  // Note: The in-memory database is still valid and contains all the data
  // We don't need to reload it
}

// Helper to execute parameterized SELECT queries
function execQuery(database: Database, sql: string, params?: any[]): any[] {
  if (params && params.length > 0) {
    // Use a prepared statement for parameterized queries
    const stmt = database.prepare(sql);
    // Replace undefined with null for binding
    const cleanParams = params.map(p => p === undefined ? null : p);
    stmt.bind(cleanParams);
    const results: any[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } else {
    // For non-parameterized queries, use exec
    const result = database.exec(sql);
    if (result.length === 0) return [];
    return result[0].values.map(row => {
      const obj: any = {};
      result[0].columns.forEach((col, index) => {
        obj[col] = row[index];
      });
      return obj;
    });
  }
}

// Initialize database schema
function initializeSchema(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_name TEXT DEFAULT 'User',
      theme TEXT DEFAULT 'light',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      emotion TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, date)
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memory_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      audio_path TEXT,
      audio_url TEXT,
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
    );
  `);

  database.run(`CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_memories_date ON memories(date);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_events_memory_id ON events(memory_id);`);

  saveDatabase(database);
}

// User functions
export const createUser = async (username: string, email: string, password: string) => {
  const database = await getDatabase();
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  database.run(
    'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
    [username, email, hashedPassword]
  );
  
  const result = database.exec('SELECT last_insert_rowid() as id');
  const userId = result[0].values[0][0] as number;
  
  saveDatabase(database);
  return getUserById(userId);
};

export const getUserByUsername = async (username: string) => {
  const database = await getDatabase();
  const results = execQuery(database, 'SELECT * FROM users WHERE username = ?', [username]);
  
  if (results.length === 0) return null;
  
  return results[0];
};

export const getUserByEmail = async (email: string) => {
  const database = await getDatabase();
  const results = execQuery(database, 'SELECT * FROM users WHERE email = ?', [email]);
  
  if (results.length === 0) return null;
  
  return results[0];
};

export const getUserById = async (id: number) => {
  const database = await getDatabase();
  const results = execQuery(database, 'SELECT id, username, email, display_name, theme, created_at FROM users WHERE id = ?', [id]);
  
  if (results.length === 0) return null;
  
  return results[0];
};

export const updateUserSettings = async (userId: number, displayName: string, theme: string) => {
  const database = await getDatabase();
  database.run(
    'UPDATE users SET display_name = ?, theme = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [displayName, theme, userId]
  );
  saveDatabase(database);
  return true;
};

// Memory functions
export const createMemory = async (userId: number, date: string, emotion: string) => {
  const database = await getDatabase();
  
  // Check if memory exists
  const existing = execQuery(database, 'SELECT * FROM memories WHERE user_id = ? AND date = ?', [userId, date]);
  
  if (existing.length > 0) {
    // Update existing
    database.run(
      'UPDATE memories SET emotion = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND date = ?',
      [emotion, userId, date]
    );
    saveDatabase(database);
    
    const results = execQuery(database, 'SELECT * FROM memories WHERE user_id = ? AND date = ?', [userId, date]);
    return results[0] || null;
  } else {
    // Create new
    database.run(
      'INSERT INTO memories (user_id, date, emotion) VALUES (?, ?, ?)',
      [userId, date, emotion]
    );
    
    // Get the last inserted ID before saving
    const idResult = database.exec('SELECT last_insert_rowid() as id');
    const memoryId = idResult[0].values[0][0] as number;
    
    // Now save
    saveDatabase(database);
    
    // Query the memory directly
    const results = execQuery(database, 'SELECT * FROM memories WHERE id = ?', [memoryId]);
    return results[0] || null;
  }
};

export const getMemoryByDate = async (userId: number, date: string) => {
  const database = await getDatabase();
  const results = execQuery(database, 'SELECT * FROM memories WHERE user_id = ? AND date = ?', [userId, date]);
  
  if (results.length === 0) return null;
  
  return results[0];
};

export const getMemoryById = async (memoryId: number) => {
  const database = await getDatabase();
  const results = execQuery(database, 'SELECT * FROM memories WHERE id = ?', [memoryId]);
  
  if (results.length === 0) return null;
  
  return results[0];
};

export const getMemoriesByMonth = async (userId: number, year: number, month: number) => {
  const database = await getDatabase();
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  
  const results = execQuery(database, 'SELECT * FROM memories WHERE user_id = ? AND date >= ? AND date < ? ORDER BY date DESC', [userId, startDate, endDate]);
  
  return results;
};

export const getAllMemories = async (userId: number) => {
  const database = await getDatabase();
  const results = execQuery(database, 'SELECT * FROM memories WHERE user_id = ? ORDER BY date DESC', [userId]);
  
  return results;
};

export const updateMemoryEmotion = async (memoryId: number, emotion: string) => {
  const database = await getDatabase();
  database.run(
    'UPDATE memories SET emotion = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [emotion, memoryId]
  );
  saveDatabase(database);
  return true;
};

export const deleteMemory = async (memoryId: number) => {
  const database = await getDatabase();
  // Delete events first (foreign key constraint)
  database.run('DELETE FROM events WHERE memory_id = ?', [memoryId]);
  database.run('DELETE FROM memories WHERE id = ?', [memoryId]);
  saveDatabase(database);
  return true;
};

// Event functions
export const createEvent = async (memoryId: number, text: string, audioPath?: string, audioUrl?: string) => {
  const database = await getDatabase();
  
  // Get next order index
  const maxOrderResults = execQuery(database, 'SELECT MAX(order_index) as maxOrder FROM events WHERE memory_id = ?', [memoryId]);
  const maxOrder = maxOrderResults.length > 0 && maxOrderResults[0].maxOrder !== null
    ? maxOrderResults[0].maxOrder as number 
    : 0;
  const nextOrder = maxOrder + 1;
  
  // Replace undefined with null for SQL binding
  const cleanAudioPath = audioPath === undefined ? null : audioPath;
  const cleanAudioUrl = audioUrl === undefined ? null : audioUrl;
  
  database.run(
    'INSERT INTO events (memory_id, text, audio_path, audio_url, order_index) VALUES (?, ?, ?, ?, ?)',
    [memoryId, text, cleanAudioPath, cleanAudioUrl, nextOrder]
  );
  
  // Get the last inserted ID before saving
  const idResult = database.exec('SELECT last_insert_rowid() as id');
  const eventId = idResult[0].values[0][0] as number;
  
  // Now save
  saveDatabase(database);
  
  // Query the event directly
  const results = execQuery(database, 'SELECT * FROM events WHERE id = ?', [eventId]);
  return results[0] || null;
};

export const getEventsByMemoryId = async (memoryId: number) => {
  const database = await getDatabase();
  const results = execQuery(database, 'SELECT * FROM events WHERE memory_id = ? ORDER BY order_index ASC', [memoryId]);
  
  return results;
};

export const getEventById = async (eventId: number) => {
  const database = await getDatabase();
  const results = execQuery(database, 'SELECT * FROM events WHERE id = ?', [eventId]);
  
  if (results.length === 0) return null;
  
  return results[0];
};

export const updateEvent = async (eventId: number, text: string) => {
  const database = await getDatabase();
  database.run(
    'UPDATE events SET text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [text, eventId]
  );
  saveDatabase(database);
  return true;
};

export const deleteEvent = async (eventId: number) => {
  const database = await getDatabase();
  database.run('DELETE FROM events WHERE id = ?', [eventId]);
  saveDatabase(database);
  return true;
};

export const reorderEvents = async (memoryId: number, eventIds: number[]) => {
  const database = await getDatabase();
  
  // Use a transaction for atomic updates
  database.run('BEGIN TRANSACTION');
  
  eventIds.forEach((eventId, index) => {
    database.run(
      'UPDATE events SET order_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [index, eventId]
    );
  });
  
  database.run('COMMIT');
  saveDatabase(database);
};

// Helper function to convert SQL row to object
function rowToObject(row: any[], columns: string[]): any {
  const obj: any = {};
  columns.forEach((col, index) => {
    obj[col] = row[index];
  });
  return obj;
}

export default { getDatabase, saveDatabase };