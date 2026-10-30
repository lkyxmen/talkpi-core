/**
 * PiMediaAndSdkManager - Media Permissions & Official Pi SDK 2.0 Manager for Pi Network dApps
 * 
 * Compliant with the Pi Open Source (PiOS) Software License.
 * 
 * Capabilities:
 *  1. Environment Detection: Pi Browser vs Desktop/External Web, HTTPS validation.
 *  2. Pi SDK 2.0 Integration: Biometric authentication, Sandbox/Mainnet switching, Payment callbacks.
 *  3. Media Hardware Manager: Real-time Microphone & Camera permission audit, Opus audio constraint tuning, device enumeration.
 *  4. Troubleshooting Diagnostics: Actionable resolution steps when permissions are blocked in mobile WebViews.
 */

(function (global, factory) {
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    global.PiMediaAndSdkManager = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  class PiMediaAndSdkManager {
    /**
     * @param {Object} options
     * @param {boolean} [options.sandbox=true] - Run Pi SDK in sandbox mode when outside Pi Browser
     * @param {Array<string>} [options.scopes=['username', 'payments', 'wallet_address']] - Pi Auth scopes
     * @param {Function} [options.onIncompletePaymentFound] - Callback when an incomplete payment is recovered
     */
    constructor(options = {}) {
      this.sandbox = options.sandbox !== undefined ? options.sandbox : true;
      this.scopes = options.scopes || ['username', 'payments', 'wallet_address'];
      this.onIncompletePaymentFound = options.onIncompletePaymentFound || null;

      this.isPiBrowser = this._detectPiBrowser();
      this.isSecureContext = typeof window !== 'undefined' ? (window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') : false;

      this.currentUser = null;
      this.currentAccessToken = null;
      this.localAudioStream = null;
      this.localVideoStream = null;
    }

    /**
     * Detect if running inside official Pi Browser mobile WebView
     */
    _detectPiBrowser() {
      if (typeof navigator === 'undefined') return false;
      const ua = navigator.userAgent || '';
      return /PiBrowser/i.test(ua) || !!(typeof window !== 'undefined' && (window.__PI_BRIDGE__ || (window.Pi && window.Pi.native)));
    }

    // =========================================================================
    // SECTION 1: PI SDK 2.0 INTEGRATION
    // =========================================================================

    /**
     * Initialize the official Pi SDK
     * @returns {Promise<boolean>}
     */
    async initPiSdk() {
      if (typeof window === 'undefined' || typeof window.Pi === 'undefined') {
        console.warn('[PiMediaAndSdkManager] window.Pi is not loaded. Include https://sdk.minepi.com/pi-sdk.js in your HTML');
        return false;
      }

      try {
        // In native Pi Browser, sandbox must be false for real Pioneer authentication
        const effectiveSandbox = this.isPiBrowser ? false : this.sandbox;
        window.Pi.init({ version: '2.0', sandbox: effectiveSandbox });
        console.log(`[Pi SDK] Successfully initialized (version: 2.0, sandbox: ${effectiveSandbox}, isPiBrowser: ${this.isPiBrowser})`);
        return true;
      } catch (err) {
        console.error('[Pi SDK] Initialization error:', err);
        return false;
      }
    }

    /**
     * Authenticate Pioneer with Pi Network SDK
     * If outside Pi Browser, gracefully falls back to a sandbox experience identity
     * 
     * @returns {Promise<{success: boolean, user?: Object, accessToken?: string, isDemo?: boolean, error?: string}>}
     */
    async authenticate() {
      // 1. Outside Pi Browser: Safe sandbox fallback
      if (!this.isPiBrowser || typeof window.Pi === 'undefined' || typeof window.Pi.authenticate !== 'function') {
        console.log('[Pi SDK] Outside Pi Browser - initiating sandbox demo authentication');
        const fallbackUser = {
          uid: 'demo_uid_' + Math.floor(1000 + Math.random() * 9000),
          username: 'pioneer_demo',
          roles: ['pioneer'],
          wallet_address: 'GDEMOPIWALLETADDRESSFORSANDBOXTESTINGONLY777'
        };
        this.currentUser = fallbackUser;
        this.currentAccessToken = `demo_:${fallbackUser.username}`;
        return {
          success: true,
          user: fallbackUser,
          accessToken: this.currentAccessToken,
          isDemo: true
        };
      }

      // 2. Inside native Pi Browser
      try {
        const onIncomplete = this.onIncompletePaymentFound || ((payment) => {
          console.warn('[Pi SDK] Incomplete payment found:', payment);
        });

        const authResult = await window.Pi.authenticate(this.scopes, onIncomplete);
        if (authResult && authResult.user) {
          this.currentUser = authResult.user;
          this.currentAccessToken = authResult.accessToken;
          return {
            success: true,
            user: authResult.user,
            accessToken: authResult.accessToken,
            isDemo: false
          };
        }
        return { success: false, error: 'Authentication returned empty credentials' };
      } catch (err) {
        console.error('[Pi SDK] Authentication failed:', err);
        return { success: false, error: err.message || 'Pi Authentication failed' };
      }
    }

    // =========================================================================
    // SECTION 2: MICROPHONE & CAMERA PERMISSION MANAGER
    // =========================================================================

    /**
     * Query existing permissions without prompting user
     * @returns {Promise<{mic: 'granted'|'denied'|'prompt'|'unknown', camera: 'granted'|'denied'|'prompt'|'unknown'}>}
     */
    async checkPermissions() {
      const result = { mic: 'unknown', camera: 'unknown' };
      if (typeof navigator === 'undefined' || !navigator.permissions || !navigator.permissions.query) {
        return result;
      }

      try {
        const micStatus = await navigator.permissions.query({ name: 'microphone' });
        result.mic = micStatus.state;
      } catch (e) {
        result.mic = 'unknown';
      }

      try {
        const camStatus = await navigator.permissions.query({ name: 'camera' });
        result.camera = camStatus.state;
      } catch (e) {
        result.camera = 'unknown';
      }

      return result;
    }

    /**
     * Request Microphone access tuned for WebRTC Opus 16-24 kbps low-bandwidth calls
     * @param {MediaTrackConstraints} [customConstraints]
     * @returns {Promise<{granted: boolean, stream?: MediaStream, error?: string, errorType?: string}>}
     */
    async requestMicrophone(customConstraints = null) {
      if (!this.isSecureContext) {
        return {
          granted: false,
          error: 'Microphone requires HTTPS or localhost security context',
          errorType: 'InsecureContext'
        };
      }

      const defaultAudioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000
      };

      try {
        const constraints = {
          audio: customConstraints || defaultAudioConstraints,
          video: false
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.localAudioStream = stream;
        return { granted: true, stream };
      } catch (err) {
        const errorType = err.name || 'UnknownError';
        return {
          granted: false,
          error: err.message,
          errorType: errorType,
          troubleshooting: this.getTroubleshootingTip('microphone', errorType)
        };
      }
    }

    /**
     * Request Camera access
     * @param {'user'|'environment'} [facingMode='user'] - Front or rear camera
     * @returns {Promise<{granted: boolean, stream?: MediaStream, error?: string, errorType?: string}>}
     */
    async requestCamera(facingMode = 'user') {
      if (!this.isSecureContext) {
        return {
          granted: false,
          error: 'Camera requires HTTPS or localhost security context',
          errorType: 'InsecureContext'
        };
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        this.localVideoStream = stream;
        return { granted: true, stream };
      } catch (err) {
        const errorType = err.name || 'UnknownError';
        return {
          granted: false,
          error: err.message,
          errorType: errorType,
          troubleshooting: this.getTroubleshootingTip('camera', errorType)
        };
      }
    }

    /**
     * Enumerate available audio and video hardware devices
     * @returns {Promise<{microphones: Array<MediaDeviceInfo>, cameras: Array<MediaDeviceInfo>, speakers: Array<MediaDeviceInfo>}>}
     */
    async enumerateDevices() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return { microphones: [], cameras: [], speakers: [] };
      }

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return {
          microphones: devices.filter(d => d.kind === 'audioinput'),
          cameras: devices.filter(d => d.kind === 'videoinput'),
          speakers: devices.filter(d => d.kind === 'audiooutput')
        };
      } catch (e) {
        console.warn('[PiMediaAndSdkManager] Failed to enumerate devices:', e);
        return { microphones: [], cameras: [], speakers: [] };
      }
    }

    /**
     * Comprehensive system and hardware diagnostic report
     */
    async runPreCallDiagnostics() {
      const perms = await this.checkPermissions();
      const devices = await this.enumerateDevices();

      return {
        environment: {
          isPiBrowser: this.isPiBrowser,
          isSecureContext: this.isSecureContext,
          userAgent: navigator.userAgent
        },
        permissions: perms,
        hardware: {
          micCount: devices.microphones.length,
          camCount: devices.cameras.length,
          speakerCount: devices.speakers.length,
          hasMicrophone: devices.microphones.length > 0
        },
        piAuth: {
          isAuthenticated: !!this.currentUser,
          username: this.currentUser ? this.currentUser.username : null
        }
      };
    }

    /**
     * Stop and release active media streams
     */
    releaseMediaStreams() {
      if (this.localAudioStream) {
        this.localAudioStream.getTracks().forEach(track => track.stop());
        this.localAudioStream = null;
      }
      if (this.localVideoStream) {
        this.localVideoStream.getTracks().forEach(track => track.stop());
        this.localVideoStream = null;
      }
    }

    /**
     * Provide actionable troubleshooting tips for mobile Pioneers
     */
    getTroubleshootingTip(mediaType, errorType) {
      if (errorType === 'NotAllowedError' || errorType === 'PermissionDeniedError') {
        if (this.isPiBrowser) {
          return 'Permission denied in Pi Browser. Please open Phone Settings -> Apps -> Pi Browser -> Permissions -> Allow Microphone/Camera.';
        }
        return 'Permission denied. Click the lock/permission icon in your browser URL bar and allow Microphone/Camera.';
      }
      if (errorType === 'NotFoundError' || errorType === 'DevicesNotFoundError') {
        return `No ${mediaType} device found. Please connect a headset or verify hardware.`;
      }
      if (errorType === 'NotReadableError') {
        return `${mediaType} is currently in use by another application. Close other calling apps and retry.`;
      }
      return 'Microphone/Camera access failed. Check device permissions and ensure HTTPS connection.';
    }
  }

  return PiMediaAndSdkManager;
});
