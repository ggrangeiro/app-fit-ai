/**
 * Geolocation utility for weather-based achievements.
 * Requests user's location to enable "Rainy Day" and other weather achievements.
 */

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

/**
 * Gets the user's current location using the browser's Geolocation API.
 * Returns null if location is unavailable or permission is denied.
 *
 * @param timeout - Maximum time to wait for location (default: 10 seconds)
 * @returns Promise with coordinates or null if unavailable
 */
export const getCurrentLocation = (timeout: number = 10000): Promise<GeoLocation | null> => {
  return new Promise((resolve) => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.log('[Geolocation] Not supported by browser');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: GeoLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        console.log('[Geolocation] Location obtained:', location);
        resolve(location);
      },
      (error) => {
        // Don't treat as error - location is optional for achievements
        switch (error.code) {
          case error.PERMISSION_DENIED:
            console.log('[Geolocation] Permission denied by user');
            break;
          case error.POSITION_UNAVAILABLE:
            console.log('[Geolocation] Position unavailable');
            break;
          case error.TIMEOUT:
            console.log('[Geolocation] Request timed out');
            break;
          default:
            console.log('[Geolocation] Unknown error:', error.message);
        }
        resolve(null);
      },
      {
        enableHighAccuracy: false, // Low accuracy is fine for weather
        timeout: timeout,
        maximumAge: 300000 // Cache for 5 minutes
      }
    );
  });
};

/**
 * Checks if the browser supports geolocation.
 */
export const isGeolocationSupported = (): boolean => {
  return 'geolocation' in navigator;
};
