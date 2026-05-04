/**
 * Utility to generate and persist a unique device identifier.
 * This is used to identify specific machines/browsers for granular moderation.
 */

const STORAGE_KEY = 'syncify_device_id';

/**
 * Generates a stable signature based on hardware and browser signals.
 * This is not 100% unique but helps identify "cloned" device IDs or 
 * track users who clear their local storage.
 */
function getHardwareSignature() {
  const signals = [
    navigator.userAgent,
    screen.width + 'x' + screen.height,
    navigator.language,
    new Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency || 'unknown',
    navigator.platform || 'unknown'
  ];
  
  // Simple hash function for the signals
  const str = signals.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 'sig_' + Math.abs(hash).toString(36);
}

export function getDeviceId() {
  let deviceId = localStorage.getItem(STORAGE_KEY);
  const signature = getHardwareSignature();
  
  if (!deviceId) {
    // Generate a new UUID-like string and append hardware signature
    const uuid = Math.random().toString(36).substring(2, 15) + 
                Math.random().toString(36).substring(2, 15);
    deviceId = `dv_${uuid}_${signature}`;
    localStorage.setItem(STORAGE_KEY, deviceId);
  } else if (!deviceId.includes('_sig_')) {
    // Upgrade old IDs with the new signature format
    deviceId = `${deviceId}_${signature}`;
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  
  return deviceId;
}

/**
 * Resetting the device ID (useful for testing or if the user requests data deletion)
 */
export function resetDeviceId() {
  localStorage.removeItem(STORAGE_KEY);
  return getDeviceId();
}
