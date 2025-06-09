# SyncCircle

SyncCircle is a comprehensive event planning platform that helps users coordinate schedules, manage shared expenses, and plan gatherings efficiently.

## Features

- **User Authentication**: Register, login, Google OAuth integration
- **Event Management**: Create, edit, and manage events of different types
- **Calendar Syncing**: Google Calendar integration for schedule coordination
- **RSVP Management**: Track participant responses
- **Expense Tracking & Splitting**: Add expenses and split them among participants
- **Real-time Chat**: Communicate with event participants
- **Mobile-Responsive UI**: Works across devices

## Tech Stack

### Backend
- Node.js with Express.js
- MongoDB with Mongoose
- JWT Authentication
- Socket.io for real-time features
- Google API integrations

### Frontend
- React.js with React Router
- TailwindCSS for styling
- Axios for API requests
- Socket.io client
- date-fns for date handling

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB (local or Atlas)
- Google Developer account (for OAuth and Calendar API)

### Installation

1. Clone the repository
```
git clone https://github.com/yourusername/syncircle.git
cd syncircle
```

2. Install backend dependencies
```
cd backend
npm install
```

3. Configure environment variables: Create a `.env` file in the backend directory with the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/syncircle
JWT_SECRET=your_jwt_secret_key_change_in_production
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
```

4. Install frontend dependencies
```
cd ../frontend
npm install
```

### Running the Application

1. Start the backend server
```
cd backend
npm run dev
```

2. Start the frontend development server
```
cd frontend
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

## Development Roadmap

- [ ] Enhanced calendar availability visualization
- [ ] Advanced expense analytics
- [ ] Venue suggestions via integration with external APIs
- [ ] Mobile app versions (React Native)
- [ ] Email and SMS notifications 