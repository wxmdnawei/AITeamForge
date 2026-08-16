
import type { PeerJSOption } from 'peerjs';

export const PEER_CONFIG: PeerJSOption = {
  debug: 0, // 0: Prints no logs, effectively silencing "Lost connection" errors in console
  config: {
    iceServers: [
      // Google Public STUN
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      // OpenSTUN
      { urls: 'stun:stun.openstun.net:3478' },
      { urls: 'stun:stun.time4vps.com:3478' }
    ],
    iceCandidatePoolSize: 10,
  },
  // Ping frequently to keep NAT mappings alive
  pingInterval: 5000, 
};
