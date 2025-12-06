/**
 * TrackPlayer Service Worker
 * Required for background playback on Android
 */

import TrackPlayer from 'react-native-track-player';

module.exports = async function () {
  // This service is required for background playback
  // TrackPlayer will handle events automatically
  TrackPlayer.registerPlaybackService(() => {
    // Service is registered automatically
  });
};

