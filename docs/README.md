# Dairy App - A Full-Stack Diary Application

A modern, full-stack diary application built with Next.js that allows users to record their daily memories with emotions, events, and audio notes. Features user authentication, audio recording, and a beautiful UI with multiple themes. The application includes a complete REST API suitable for both web and mobile clients.

## 🚀 Key Features

### Authentication & Security
- **JWT-based Authentication**: Secure token-based auth system
- **Password Hashing**: bcryptjs for secure password storage
- **User Profiles**: Customizable display names and themes

### Diary Features
- **Today's Entry Tab**: Record daily experiences with emotion selection
- **Past Memory Tab**: View and edit memories from specific dates
- **Emotion Selection**: 6 different emotions (happy, sad, angry, excited, calm, anxious)
- **Text Input**: Rich textarea for detailed event descriptions
- **Audio Recording**: Record audio notes using MediaRecorder API
- **Draggable Events List**: Reorder events with drag-and-drop
- **Edit/Delete**: Modify or remove individual events and memories

### User Interface
- **Calendar View**: Visual calendar with green indicators for days with memories
- **Memory Preview**: Full-screen view of any memory with all events
- **User Settings**: Customize display name and choose from 3 themes (light, dark, purple)
- **Responsive Design**: Works on desktop and mobile devices

### Backend API
- **RESTful API**: Complete API for CRUD operations
- **SQLite Database**: File-based JSON database (easily upgradable to SQLite)
- **CORS Support**: Ready for cross-origin requests from mobile apps
- **Token Authentication**: JWT tokens for secure API access

## 🛠 Technical Stack

### Frontend
- **Framework**: Next.js 13.5.6 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **Drag & Drop**: @dnd-kit
- **Date Handling**: date-fns
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js
- **Database**: File-based JSON (with SQLite migration path)
- **Authentication**: JWT (jsonwebtoken)
- **Password Security**: bcryptjs
- **File Upload**: Multer (for future audio uploads)

## 📦 Installation & Setup

### Prerequisites

- **Node.js 16.x or higher**
- npm or yarn

### Installation Steps

1. Clone or navigate to the project directory:
   ```bash
   cd dairy-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env and set your JWT_SECRET
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and visit:
   ```
   http://localhost:3000
   ```

## 📱 API Documentation

The application includes a complete REST API suitable for use with React Native mobile apps. See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for detailed documentation.

### Base URL
```
http://localhost:3000/api
```

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - User login

#### User
- `GET /api/user/me` - Get current user profile
- `PUT /api/user/settings` - Update user settings

#### Memories
- `GET /api/memories` - Get all memories (with optional date/year/month filters)
- `POST /api/memories` - Create memory or add event
- `DELETE /api/memories/:memoryId` - Delete memory
- `PUT /api/memories/:memoryId` - Reorder events

### Example API Usage

```javascript
// Register a new user
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'john_doe',
    email: 'john@example.com',
    password: 'password123'
  })
});

const { user, token } = await response.json();

// Create a memory
const memoryResponse = await fetch('/api/memories', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    date: '2026-04-12',
    emotion: 'happy',
    text: 'Had a great day today!'
  })
});
```

## 📂 Project Structure

```
dairy-app/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Main application page
│   ├── auth/
│   │   └── page.tsx             # Login/Register page
│   └── globals.css              # Global styles
├── pages/api/                    # API Routes
│   ├── auth/
│   │   ├── login.ts             # Login endpoint
│   │   └── register.ts          # Registration endpoint
│   ├── memories/
│   │   ├── index.ts             # Memories CRUD
│   │   └── [memoryId].ts        # Individual memory operations
│   └── user/
│       ├── me.ts                # Current user profile
│       └── settings.ts          # User settings
├── lib/                          # Utility functions
│   ├── db.ts                    # Database operations
│   └── auth.ts                  # Authentication utilities
├── components/ui/                # Reusable UI components
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   └── label.tsx
├── hooks/                        # Custom React hooks
│   └── useAuth.ts               # Authentication hook
├── public/                       # Static assets
├── dairy-data.json              # SQLite database file (auto-created)
├── API_DOCUMENTATION.md         # Detailed API documentation
├── README.md                    # This file
├── package.json                 # Dependencies
├── tailwind.config.ts           # Tailwind configuration
├── tsconfig.json                # TypeScript configuration
└── .env.example                 # Environment variables template
```

## 🎨 Usage Guide

### Creating an Account
1. Navigate to the login page
2. Click "Sign up" to switch to registration mode
3. Enter your username, email, and password
4. Click "Create Account"
5. You'll be automatically logged in and redirected to the main app

### Recording a Memory
1. On the main page, select the "Today's Entry" tab
2. Choose your current emotion from the emoji grid
3. Write your event in the textarea or click the microphone icon to record audio
4. Press "Add Event" to save
5. Drag events to reorder them
6. The memory is automatically saved to the database

### Viewing Past Memories
1. Switch to the "Past Memory" tab
2. Use the date navigation arrows or click the calendar icon
3. If a memory exists for that date, it will be displayed
4. Click "View Memory" for a full-screen preview
5. You can edit events or delete the entire memory

### Calendar View
1. Click the calendar icon in the header
2. Dates with memories are highlighted in green
3. Click any date to view that memory
4. Navigate months with the arrow buttons

### User Settings
1. Click the settings icon in the header
2. Update your display name
3. Choose a theme (Light, Dark, or Purple)
4. Click "Save" to apply changes

## 🔒 Security Features

- **JWT Authentication**: Tokens expire after 7 days
- **Password Hashing**: bcryptjs with salt rounds
- **Input Validation**: Server-side validation for all inputs
- **CORS Support**: Configured for cross-origin requests
- **Secure Headers**: Standard security headers

## 🗄 Database

The application uses a file-based JSON database (`dairy-data.json`) that automatically initializes on first run. The database structure includes:

- **users**: User accounts and preferences
- **memories**: Memory records with dates and emotions
- **events**: Individual events within memories

### Database Schema

```json
{
  "users": [
    {
      "id": 1,
      "username": "string",
      "email": "string",
      "password": "hashed_password",
      "display_name": "string",
      "theme": "light|dark|purple",
      "created_at": "ISO_date",
      "updated_at": "ISO_date"
    }
  ],
  "memories": [
    {
      "id": 1,
      "user_id": 1,
      "date": "YYYY-MM-DD",
      "emotion": "string",
      "created_at": "ISO_date",
      "updated_at": "ISO_date"
    }
  ],
  "events": [
    {
      "id": 1,
      "memory_id": 1,
      "text": "string",
      "audio_url": "string (optional)",
      "order_index": "number",
      "created_at": "ISO_date",
      "updated_at": "ISO_date"
    }
  ]
}
```

### Migrating to SQLite

The codebase is designed for easy migration to SQLite. To migrate:

1. Install SQLite dependencies:
   ```bash
   npm install better-sqlite3
   ```

2. Update `lib/db.ts` to use SQLite instead of JSON file operations

3. The API endpoints will continue to work without changes

## 📱 Mobile App Integration

The REST API is designed to be compatible with React Native mobile applications. Key considerations:

- **Authentication**: Use JWT tokens stored securely in AsyncStorage
- **API Calls**: All endpoints support JSON request/response
- **CORS**: API supports cross-origin requests
- **Audio**: Audio can be recorded on mobile and uploaded to the API

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for detailed endpoint specifications.

## 🚀 Deployment

### Production Considerations

1. **Environment Variables**: Set `JWT_SECRET` to a secure random string
2. **Database**: Consider migrating to SQLite or PostgreSQL for production
3. **File Storage**: Set up proper file storage for audio recordings
4. **HTTPS**: Use HTTPS in production for security
5. **Rate Limiting**: Implement rate limiting to prevent abuse
6. **Backup**: Regular backups of the database file

### Deployment Options

- **Vercel**: Deploy Next.js app with serverless functions
- **Railway**: Easy deployment with database support
- **DigitalOcean**: Traditional VPS deployment
- **AWS**: Full cloud infrastructure

## 🤝 Contributing

This is an open-source project. Feel free to:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - Feel free to use this project for personal or commercial purposes.

## 🆘 Support

For issues or questions:
1. Check the [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
2. Review the code comments
3. Create an issue in the repository

## 🗺 Roadmap

### Completed ✅
- User authentication with JWT
- Memory CRUD operations
- Audio recording functionality
- Drag-and-drop event reordering
- Calendar view
- User settings
- Full REST API

### Planned 🔮
- Audio file upload and storage
- Memory search and filtering
- Export memories as PDF/JSON
- Memory tags and categories
- Photo attachments
- Cloud backup and sync
- Mobile app (React Native)
- Real-time collaboration
- Memory sharing

---

**Built with ❤️ using Next.js, TypeScript, and Tailwind CSS**