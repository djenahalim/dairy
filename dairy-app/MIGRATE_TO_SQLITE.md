# Migration Guide: JSON Database to SQLite

This guide shows you how to migrate from the current JSON-based database to a proper SQLite database.

## Current Setup (JSON)

Currently, the app uses `dairy-data.json` which stores data in JSON format:
- **File location:** `dairy-app/dairy-data.json`
- **Database logic:** `lib/db.ts`
- **Pros:** Simple, no dependencies, works with any Node.js version
- **Cons:** Not suitable for large datasets, no SQL queries, no concurrent access

## New Setup (SQLite with sql.js)

The new setup uses `sql.js` which provides a pure JavaScript implementation of SQLite:
- **File location:** `dairy-app/dairy.db`
- **Database logic:** `lib/db-sqlite.ts`
- **Pros:** Real SQL database, better performance, supports complex queries
- **Cons:** Requires async/await, slightly more complex

## Migration Steps

### 1. Install Dependencies

```bash
cd dairy-app
npm install sql.js
```

### 2. Update API Routes

Update your API routes to use the new SQLite database. Here's an example for the auth routes:

**Before (lib/db.ts):**
```typescript
import { getUserByUsername, createUser } from '@/lib/db';

const user = getUserByUsername(username);
```

**After (lib/db-sqlite.ts):**
```typescript
import { getUserByUsername, createUser } from '@/lib/db-sqlite';

const user = await getUserByUsername(username); // Now async!
```

### 3. Update All Database Calls

All database functions are now async, so you need to:
- Add `await` to all database calls
- Make your API route handlers async

Example API route update:

```typescript
// pages/api/auth/login.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ... existing code ...
  
  const user = await getUserByUsername(username); // Add await
  
  // ... rest of code ...
}
```

### 4. Quick Migration Script

To make the transition easier, create a wrapper that handles both:

**lib/db-wrapper.ts:**
```typescript
// Use this to switch between JSON and SQLite
const USE_SQLITE = process.env.USE_SQLITE === 'true';

if (USE_SQLITE) {
  export * from './db-sqlite';
} else {
  export * from './lib/db';
}
```

Then update your API routes to import from `@/lib/db-wrapper` instead of `@/lib/db`.

### 5. Set Environment Variable

Add to your `.env` file:
```
USE_SQLITE=true
```

### 6. Test the Migration

1. Start the development server
2. Try registering a new user
3. Create some memories
4. Verify data is stored in `dairy.db`

## Viewing SQLite Data

### Using SQLite CLI

```bash
# Install SQLite if you don't have it
brew install sqlite  # macOS
sudo apt install sqlite3  # Linux

# Open the database
sqlite3 dairy-app/dairy.db

# View tables
.tables

# View users
SELECT * FROM users;

# View memories
SELECT * FROM memories;

# View events
SELECT * FROM events;
```

### Using a GUI Tool

- **DB Browser for SQLite** (Free, cross-platform)
- **SQLite Studio** (Free, cross-platform)
- **VS Code SQLite Extension** (Free)

## Database Schema

The SQLite database has the following schema:

```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  display_name TEXT DEFAULT 'User',
  theme TEXT DEFAULT 'light',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Memories table
CREATE TABLE memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  emotion TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, date)
);

-- Events table
CREATE TABLE events (
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

-- Indexes for better performance
CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_date ON memories(date);
CREATE INDEX idx_events_memory_id ON events(memory_id);
```

## Important Notes

1. **Async Functions:** All database functions are now async, so remember to use `await`
2. **File Locking:** SQLite doesn't support concurrent writes well, so avoid multiple simultaneous writes
3. **Backup:** Keep a backup of your `dairy.db` file
4. **Migration:** Existing JSON data won't automatically migrate - you'll need to write a script to import it

## Migration Script (JSON to SQLite)

If you have existing data in `dairy-data.json`, you can migrate it:

```typescript
// scripts/migrate-json-to-sqlite.ts
import fs from 'fs';
import path from 'path';
import { getDatabase, saveDatabase } from '@/lib/db-sqlite';

async function migrate() {
  const jsonPath = path.join(process.cwd(), 'dairy-data.json');
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  const db = await getDatabase();
  
  // Migrate users
  for (const user of jsonData.users) {
    db.run(
      'INSERT INTO users (id, username, email, password, display_name, theme, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [user.id, user.username, user.email, user.password, user.display_name, user.theme, user.created_at, user.updated_at]
    );
  }
  
  // Migrate memories
  for (const memory of jsonData.memories) {
    db.run(
      'INSERT INTO memories (id, user_id, date, emotion, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [memory.id, memory.user_id, memory.date, memory.emotion, memory.created_at, memory.updated_at]
    );
  }
  
  // Migrate events
  for (const event of jsonData.events) {
    db.run(
      'INSERT INTO events (id, memory_id, text, audio_path, audio_url, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [event.id, event.memory_id, event.text, event.audio_path, event.audio_url, event.order_index, event.created_at, event.updated_at]
    );
  }
  
  saveDatabase(db);
  console.log('Migration completed successfully!');
}

migrate().catch(console.error);
```

## Switching Back to JSON

If you want to switch back to JSON, simply:
1. Change the import back to `@/lib/db`
2. Remove the `await` keywords from database calls
3. Delete the `dairy.db` file if you don't need it

## Need Help?

If you encounter any issues during migration:
1. Check the TypeScript errors
2. Ensure all database calls are awaited
3. Verify the `dairy.db` file is created in the correct location
4. Check file permissions

Good luck with your migration! 🚀