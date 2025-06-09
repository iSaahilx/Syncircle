# SyncCircle Frontend

This is the React frontend for SyncCircle, a comprehensive event planning platform.

## Tech Stack

- React.js
- React Router for navigation
- TailwindCSS for styling
- Axios for API requests
- Socket.io client for real-time features
- date-fns for date handling
- Headless UI & Heroicons for UI components

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

## Project Structure

```
src/
├── contexts/       # React contexts including auth
├── layouts/        # Layout components
├── pages/          # Page components
├── components/     # Reusable components
├── utils/          # Utility functions
├── App.js          # Main App component with routes
└── index.js        # Entry point
```

## Features

### Authentication
- Register with email/password
- Login with email/password
- Google OAuth integration

### Event Management
- Create events with various details
- View event details
- Edit and update events
- RSVP to events

### Expense Tracking
- Add expenses to events
- Split expenses among participants
- Track who owes what

### Participant Management
- Invite participants via email
- Track RSVPs
- Chat with participants

## API Communication

This frontend communicates with the SyncCircle backend API. The API URL is configured via the proxy setting in package.json and/or the `REACT_APP_API_URL` environment variable.

## Styling

The app uses TailwindCSS for styling. Custom styles and Tailwind configurations can be found in the following files:

- `tailwind.config.js` - Tailwind configuration
- `src/index.css` - Global styles and Tailwind directives 