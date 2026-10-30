# @pios/offline-outbox

[![License: PiOS](https://img.shields.io/badge/License-PiOS-F1B82D.svg)](../LICENSE)
[![Pi Network](https://img.shields.io/badge/Pi%20Network-Ecosystem%20Ready-8A2BE2)](https://minepi.com)
[![Zero Storage](https://img.shields.io/badge/Cost-%240%20Server%20Storage-brightgreen)](#zero-server-storage-principle)

A lightweight, standalone **Client-Side FIFO Message Outbox Coordinator** designed specifically for **Pi Network dApps** (chat, audio messaging, micro-payments, and WebRTC signaling).

## 💡 The Problem It Solves (Zero Server Storage)
In standard web apps, when a user sends a message to an offline contact, servers store heavy text, voice notes, and media files in cloud databases (PostgreSQL/S3/Firebase), causing massive hosting costs.

**PiOfflineOutbox** enforces the **Zero Server Media Storage ($0 Cost)** architecture:
- Payloads remain securely cached inside the sender's client local storage (`localStorage`/`IndexedDB`).
- The central signaling server only transmits lightweight presence flags.
- Once the recipient comes online, messages are flushed sequentially (`seq_1` -> `ACK_1`) peer-to-peer without packet inversion or data loss.

---

## 📦 Installation & Usage

### 1. Plain JavaScript / Pi Browser
Include the script in your `index.html`:
```html
<script src="pi-offline-outbox.js"></script>
```

### 2. Basic Initialization
```javascript
const outbox = new PiOfflineOutbox({
  storagePrefix: 'talkpi',
  maxRetries: 3,
  sendHandler: async (item) => {
    // Dispatch via your WebSocket or WebRTC DataChannel
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'chat_message',
        receiver_id: item.receiver_id,
        seq_id: item.seq_id,
        data: item.payload
      }));
      return true; // Return true on successful dispatch
    }
    return false;
  }
});
```

### 3. Enqueuing Messages (When Peer is Offline)
```javascript
// Enqueue encrypted text or voice note
outbox.enqueue('pioneer_alice', {
  text: 'Hello from PiOS!',
  timestamp: Date.now()
}, 'text');
```

### 4. Flushing When Peer Comes Online
```javascript
// Triggered when a presence ping announces pioneer_alice is now online
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'peer_online' && msg.username === 'pioneer_alice') {
    outbox.flushForPeer('pioneer_alice');
  }
};
```

### 5. Event Listeners
```javascript
outbox.on('queueChanged', ({ count }) => {
  console.log(`Outbox pending messages: ${count}`);
});

outbox.on('acked', ({ seq_id }) => {
  console.log(`Message ${seq_id} delivered & acknowledged!`);
});
```

---

## 📄 License
This module is licensed under the **Pi Open Source (PiOS) Software License**. Free for all Pi Community Developers building on the Pi Network.
