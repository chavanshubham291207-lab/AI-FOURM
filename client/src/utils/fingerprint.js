// Browser fingerprint and device ID generator utility
export function getVoterIdentifiers() {
  let deviceId = localStorage.getItem('ai_forum_voter_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('ai_forum_voter_device_id', deviceId);
  }

  // Create browser fingerprint (User-Agent, Language, Screen Specs, Timezone)
  const nav = window.navigator || {};
  const screen = window.screen || {};
  const fingerprintData = [
    nav.userAgent || '',
    nav.language || '',
    screen.height || 0,
    screen.width || 0,
    screen.colorDepth || 0,
    new Date().getTimezoneOffset()
  ].join('|');

  let hash = 0;
  for (let i = 0; i < fingerprintData.length; i++) {
    hash = (hash << 5) - hash + fingerprintData.charCodeAt(i);
    hash |= 0;
  }
  const fingerprint = 'fp_' + Math.abs(hash).toString(36);

  return {
    deviceId,
    voterId: deviceId,
    fingerprint
  };
}
