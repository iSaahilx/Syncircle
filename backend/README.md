# SyncCircle Backend

This is the backend API for SyncCircle, a comprehensive event planning platform that integrates calendar syncing, expense splitting, and group coordination.

## Setup

1. Install dependencies:
```
npm install
```

2. Create `.env` file in the root directory with the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/syncircle
JWT_SECRET=your_jwt_secret_key_change_in_production
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
```

3. Start the development server:
```
npm run dev
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user profile
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback

### Users

- `GET /api/users?search=query` - Search users by name or email
- `GET /api/users/friends` - Get user's friends list
- `POST /api/users/friends/:id` - Add a friend
- `DELETE /api/users/friends/:id` - Remove a friend
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/calendar/connect` - Connect Google Calendar
- `DELETE /api/users/calendar/disconnect` - Disconnect Google Calendar

### Events

- `POST /api/events` - Create a new event
- `GET /api/events` - Get all events for current user
- `GET /api/events/:id` - Get event by ID
- `PUT /api/events/:id` - Update an event
- `DELETE /api/events/:id` - Delete an event
- `POST /api/events/:id/invite` - Invite users to an event
- `POST /api/events/:id/rsvp` - Update user RSVP status
- `GET /api/events/:id/calendar` - Get calendar availability for event participants

### Expenses

- `POST /api/expenses` - Create a new expense
- `GET /api/expenses/event/:eventId` - Get all expenses for an event
- `GET /api/expenses/:id` - Get expense by ID
- `PUT /api/expenses/:id` - Update an expense
- `PUT /api/expenses/:id/settle/:userId` - Mark a share as paid/settled
- `DELETE /api/expenses/:id` - Delete an expense
- `GET /api/expenses/summary/:eventId` - Get expense summary for an event

## Technologies Used

- Node.js and Express
- MongoDB with Mongoose
- JWT for authentication
- Socket.io for real-time updates
- Google OAuth and Calendar API integration 