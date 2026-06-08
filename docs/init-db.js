const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'dairy-data.json');

// Initialize database if it doesn't exist
function initDatabase() {
  if (!fs.existsSync(dbPath)) {
    const initialData = {
      users: [],
      memories: [],
      events: [],
      nextUserId: 1,
      nextMemoryId: 1,
      nextEventId: 1
    };
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
    console.log('✅ Database initialized at:', dbPath);
    console.log('📁 Database structure:');
    console.log(JSON.stringify(initialData, null, 2));
  } else {
    console.log('✅ Database already exists at:', dbPath);
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    console.log('📊 Current database content:');
    console.log(JSON.stringify(data, null, 2));
  }
}

initDatabase();