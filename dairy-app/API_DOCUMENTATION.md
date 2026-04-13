# Dairy App API Documentation

This document provides comprehensive documentation for the Dairy App REST API. The API is designed to be used by both the Next.js web application and future React Native mobile apps.

## Base URL

```
http://localhost:3000/api
```

## Authentication

All authenticated endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### Authentication

#### 1. Register User
**POST** `/auth/register`

Creates a new user account.

**Request Body:**
```json
{
  "username": "string (required, unique)",
  "email": "string (required, unique)",
  "password": "string (required, min 6 characters)"
}
```

**Success Response (201):**
```json
{
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "display_name": "User",
    "theme": "light",
    "created_at": "2026-04-12T18:00:00.000Z"
  },
  "token": "jwt_token_here"
}
```

**Error Responses:**
- `400 Bad Request` - Missing fields or user already exists
- `500 Internal Server Error`

---

#### 2. Login
**POST** `/auth/login`

Authenticates a user and returns a JWT token.

**Request Body:**
```json
{
  "username": "string (required)",
  "password": "string (required)"
}
```

**Success Response (200):**
```json
{
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "display_name": "User",
    "theme": "light",
    "created_at": "2026-04-12T18:00:00.000Z"
  },
  "token": "jwt_token_here"
}
```

**Error Responses:**
- `400 Bad Request` - Missing credentials
- `401 Unauthorized` - Invalid credentials
- `500 Internal Server Error`

---

### User

#### 3. Get Current User
**GET** `/user/me`

Retrieves the currently authenticated user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "display_name": "John Doe",
    "theme": "dark",
    "created_at": "2026-04-12T18:00:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `405 Method Not Allowed`

---

#### 4. Update User Settings
**PUT** `/user/settings`

Updates the user's display name and theme preferences.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "displayName": "string (required)",
  "theme": "string (required) - 'light' | 'dark' | 'purple'"
}
```

**Success Response (200):**
```json
{
  "message": "Settings updated successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Missing fields
- `401 Unauthorized` - Invalid or missing token
- `500 Internal Server Error`

---

### Memories

#### 5. Get All Memories
**GET** `/memories`

Retrieves all memories for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `date` (optional) - Filter by specific date (YYYY-MM-DD format)
- `year` (optional) - Filter by year (used with month)
- `month` (optional) - Filter by month (used with year)

**Success Response (200):**
```json
[
  {
    "id": 1,
    "user_id": 1,
    "date": "2026-04-12",
    "emotion": "happy",
    "created_at": "2026-04-12T18:00:00.000Z",
    "updated_at": "2026-04-12T18:00:00.000Z"
  }
]
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token

---

#### 6. Get Memory by Date
**GET** `/memories?date=2026-04-12`

Retrieves a specific memory and its events for a given date.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "id": 1,
  "user_id": 1,
  "date": "2026-04-12",
  "emotion": "happy",
  "events": [
    {
      "id": 1,
      "memory_id": 1,
      "text": "Had a great day at the park",
      "audio_url": "/api/audio/123.webm",
      "order_index": 1,
      "created_at": "2026-04-12T18:00:00.000Z",
      "updated_at": "2026-04-12T18:00:00.000Z"
    }
  ],
  "created_at": "2026-04-12T18:00:00.000Z",
  "updated_at": "2026-04-12T18:00:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Memory not found

---

#### 7. Create Memory / Add Event
**POST** `/memories`

Creates a new memory or adds an event to an existing memory.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "date": "2026-04-12 (required, YYYY-MM-DD)",
  "emotion": "happy (required)",
  "text": "Event description (optional)",
  "audioUrl": "/api/audio/123.webm (optional)"
}
```

**Success Response (200):**
```json
{
  "id": 1,
  "user_id": 1,
  "date": "2026-04-12",
  "emotion": "happy",
  "events": [
    {
      "id": 1,
      "memory_id": 1,
      "text": "Had a great day at the park",
      "audio_url": "/api/audio/123.webm",
      "order_index": 1,
      "created_at": "2026-04-12T18:00:00.000Z",
      "updated_at": "2026-04-12T18:00:00.000Z"
    }
  ],
  "created_at": "2026-04-12T18:00:00.000Z",
  "updated_at": "2026-04-12T18:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields
- `401 Unauthorized` - Invalid or missing token

---

#### 8. Delete Memory
**DELETE** `/memories/{memoryId}`

Deletes a memory and all its associated events.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "message": "Memory deleted"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid memory ID
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Memory not found

---

#### 9. Reorder Events
**PUT** `/memories/{memoryId}`

Reorders events within a memory (for drag-and-drop functionality).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "action": "reorder",
  "eventIds": [2, 1, 3] // New order of event IDs
}
```

**Success Response (200):**
```json
{
  "message": "Events reordered"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid action or missing fields
- `401 Unauthorized` - Invalid or missing token

---

## Data Models

### User
```typescript
{
  id: number;
  username: string;
  email: string;
  display_name: string;
  theme: 'light' | 'dark' | 'purple';
  created_at: string;
}
```

### Memory
```typescript
{
  id: number;
  user_id: number;
  date: string; // YYYY-MM-DD format
  emotion: string; // 'happy', 'sad', 'angry', 'excited', 'calm', 'anxious'
  created_at: string;
  updated_at: string;
}
```

### Event
```typescript
{
  id: number;
  memory_id: number;
  text: string;
  audio_url?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}
```

## Error Handling

All API errors follow a consistent format:

```json
{
  "error": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `200 OK` - Success
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required or failed
- `404 Not Found` - Resource not found
- `405 Method Not Allowed` - HTTP method not supported
- `500 Internal Server Error` - Server error

## Rate Limiting

Currently, there are no rate limits implemented. In production, rate limiting should be added to prevent abuse.

## CORS

The API supports Cross-Origin Resource Sharing (CORS) to allow requests from different origins (e.g., React Native apps).

## Security Notes

1. **JWT Tokens**: Tokens expire after 7 days. Users must re-authenticate after expiration.
2. **Password Hashing**: Passwords are hashed using bcryptjs before storage.
3. **Input Validation**: All inputs are validated on the server side.
4. **Authentication**: All endpoints except `/auth/register` and `/auth/login` require authentication.

## Future Enhancements

- Audio file upload endpoint
- Memory search and filtering
- Export memories as JSON/PDF
- Batch operations
- Pagination for large datasets
- Real-time updates with WebSockets