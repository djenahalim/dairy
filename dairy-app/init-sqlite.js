const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function initSQLite() {
  try {
    const SQL = await initSqlJs();
    const dbPath = path.join(__dirname, 'dairy.db');
    
    let db;
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
      console.log('✅ SQLite database loaded from:', dbPath);
    } else {
      db = new SQL.Database();
      console.log('✅ New SQLite database created');
      
      // Create tables
      db.run(`
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

      db.run(`
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

      db.run(`
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

      db.run(`CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_memories_date ON memories(date);`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_events_memory_id ON events(memory_id);`);
      
      console.log('✅ Database schema created');
    }
    
    // Save database
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
    console.log('💾 Database saved to:', dbPath);
    
    // Show tables
    console.log('\n📊 Database Tables:');
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
    if (tables.length > 0) {
      tables[0].values.forEach(row => {
        console.log(`  - ${row[0]}`);
      });
    }
    
    // Show sample data
    console.log('\n📋 Sample Queries:');
    
    const users = db.exec('SELECT id, username, email, display_name, theme FROM users;');
    console.log('\n👥 Users:');
    if (users.length > 0 && users[0].values.length > 0) {
      users[0].values.forEach(row => {
        console.log(`  ID: ${row[0]}, Username: ${row[1]}, Email: ${row[2]}, Name: ${row[3]}, Theme: ${row[4]}`);
      });
    } else {
      console.log('  (No users yet)');
    }
    
    const memories = db.exec('SELECT id, user_id, date, emotion FROM memories;');
    console.log('\n📝 Memories:');
    if (memories.length > 0 && memories[0].values.length > 0) {
      memories[0].values.forEach(row => {
        console.log(`  ID: ${row[0]}, User: ${row[1]}, Date: ${row[2]}, Emotion: ${row[3]}`);
      });
    } else {
      console.log('  (No memories yet)');
    }
    
    const events = db.exec('SELECT id, memory_id, text FROM events;');
    console.log('\n🎯 Events:');
    if (events.length > 0 && events[0].values.length > 0) {
      events[0].values.forEach(row => {
        console.log(`  ID: ${row[0]}, Memory: ${row[1]}, Text: ${row[2].substring(0, 50)}...`);
      });
    } else {
      console.log('  (No events yet)');
    }
    
    db.close();
    
    console.log('\n✅ SQLite database is ready!');
    console.log('\n🔍 To view the database:');
    console.log('   1. Use DB Browser for SQLite: https://sqlitebrowser.org/');
    console.log('   2. Use command line: sqlite3 dairy-app/dairy.db');
    console.log('   3. Use VS Code SQLite extension');
    
  } catch (error) {
    console.error('❌ Error initializing SQLite:', error);
  }
}

initSQLite();