# @pios/media-sdk

[![License: PiOS](https://img.shields.io/badge/License-PiOS-F1B82D.svg)](../LICENSE)
[![Pi Network SDK](https://img.shields.io/badge/Pi%20SDK-2.0%20Ready-8A2BE2)](https://minepi.com)
[![WebRTC Opus](https://img.shields.io/badge/Audio-Opus%20AEC%20%2F%20NS%20%2F%20AGC-00ADD8)](#webrtc-audio-tuning)

A unified **Pi SDK 2.0 Integration & Microphone/Camera Permissions Manager** designed for **Pi Network dApps** and **WebRTC Voice/Video Calling** apps.

---

## 🎯 Key Capabilities

1. **Automatic Pi Browser Detection**:
   - Accurately detects whether running inside the native **Pi Browser mobile WebView** (`/PiBrowser/i`, `__PI_BRIDGE__`, `window.Pi.native`) or in an external desktop browser.
2. **Official Pi SDK 2.0 Authentication**:
   - Biometric/OAuth login with requested scopes (`username`, `payments`, `wallet_address`).
   - Graceful sandbox demo fallback when testing in desktop browsers outside Pi Browser.
3. **WebRTC-Optimized Microphone Access**:
   - Pre-configured acoustic constraints: Acoustic Echo Cancellation (AEC), Noise Suppression (NS), and Auto Gain Control (AGC) tuned for Opus 16–24 kbps low-bandwidth calls.
4. **Camera Controls**:
   - Front/rear camera toggle with `facingMode: 'user'` or `'environment'`.
5. **Mobile Permission Diagnostics**:
   - Pre-call diagnostics report and step-by-step guidance when a Pioneer denies microphone permissions in the mobile WebView.

---

## 📦 Installation & Usage

### 1. Include in HTML
```html
<!-- Include official Pi SDK -->
<script src="https://sdk.minepi.com/pi-sdk.js"></script>

<!-- Include PiMediaAndSdkManager -->
<script src="pi-media-sdk.js"></script>
```

### 2. Initialize
```javascript
const piMedia = new PiMediaAndSdkManager({
  sandbox: true, // Sandbox mode for external browsers
  scopes: ['username', 'payments', 'wallet_address'],
  onIncompletePaymentFound: (payment) => {
    console.log('Recovering incomplete payment:', payment);
  }
});

// Initialize Pi SDK
await piMedia.initPiSdk();
```

### 3. Authenticate Pioneer
```javascript
const auth = await piMedia.authenticate();
if (auth.success) {
  console.log(`Authenticated as @${auth.user.username}`);
  console.log(`Access Token: ${auth.accessToken}`);
} else {
  console.error(`Login error: ${auth.error}`);
}
```

### 4. Check & Request Microphone for WebRTC Audio Call
```javascript
// Request high-quality echo-cancelled microphone stream
const micResult = await piMedia.requestMicrophone();

if (micResult.granted) {
  const localStream = micResult.stream;
  // Attach stream to WebRTC PeerConnection
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
} else {
  // Show user-friendly troubleshooting alert
  alert(micResult.troubleshooting);
}
```

### 5. Run Pre-Call Diagnostic Check
```javascript
const diag = await piMedia.runPreCallDiagnostics();
console.log('Hardware and SDK status:', diag);
// Returns: { environment, permissions, hardware, piAuth }
```

### 6. Clean Up Streams on Hangup
```javascript
piMedia.releaseMediaStreams();
```

---

## 📄 License
Licensed under the **Pi Open Source (PiOS) Software License**. Free for all developers building on the Pi Network ecosystem.
