# Dujyo Mobile App

React Native mobile application for DUJYO platform.

## Setup

### Prerequisites

- Node.js 18+
- React Native CLI
- iOS: Xcode 14+ (for iOS development)
- Android: Android Studio (for Android development)

### Installation

```bash
# Install dependencies
npm install

# iOS
cd ios && pod install && cd ..

# Run iOS
npm run ios

# Run Android
npm run android
```

## Project Structure

```
src/
├── screens/          # Main app screens
├── components/       # Reusable components
├── navigation/       # Navigation setup
├── services/         # API clients and services
└── utils/            # Utility functions
```

## Features

- ✅ Bottom Tab Navigation
- ✅ Home Screen (Content feed)
- ✅ Search Screen
- ✅ S2E Screen (Stream-to-Earn)
- ✅ Profile Screen
- 🚧 Player with background playback (coming soon)
- 🚧 Push notifications (coming soon)
- 🚧 Deep linking (coming soon)

## Development

```bash
# Start Metro bundler
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## API Integration

The app uses the same API as the web frontend. See `src/services/api.ts` for API client configuration.

## Environment Variables

Create a `.env` file:

```
API_BASE_URL=http://localhost:8083
```

