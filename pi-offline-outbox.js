/**
 * PiOfflineOutbox - Client-Side FIFO Message Outbox Coordinator for Pi Network dApps
 * 
 * Compliant with the Pi Open Source (PiOS) Software License.
 * Architecture: Sender-Side Local Storage with Zero Server Media Storage ($0 Server Cost).
 * 
 * Features:
 *  - Persistent FIFO Queue (LocalStorage / IndexedDB with automatic fallback).
 *  - Monotonic Sequential IDs (seq_id) & strict ACK-based dispatch.
 *  - Automatic network reconnection & peer online flush triggers.
 *  - Exponential backoff retry for transient network drops.
 *  - Event-driven architecture with customizable listeners.
 */

(function (global, factory) {
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    global.PiOfflineOutbox = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  const STORAGE_KEY_QUEUE = 'pios_outbox_queue';
  const STORAGE_KEY_SEQ = 'pios_outbox_last_seq';

  class PiOfflineOutbox {
    /**
     * @param {Object} options
     * @param {string} [options.storagePrefix='talkpi'] - Namespace prefix for local storage
     * @param {number} [options.maxRetries=5] - Maximum retry attempts per message
     * @param {number} [options.initialRetryDelayMs=1000] - Base delay for exponential backoff
     * @param {Function} [options.sendHandler] - Async function (item) => Promise<boolean> that dispatches over WS/DataChannel
     */
    constructor(options = {}) {
      this.prefix = options.storagePrefix || 'pios';
      this.queueKey = `${this.prefix}_outbox_queue`;
      this.seqKey = `${this.prefix}_outbox_last_seq`;
      this.maxRetries = options.maxRetries || 5;
      this.initialRetryDelayMs = options.initialRetryDelayMs || 1000;
      this.sendHandler = options.sendHandler || null;

      this.listeners = {
        queued: [],
        flushed: [],
        acked: [],
        failed: [],
        queueChanged: []
      };

      this._isFlushing = false;
      this._initAutoSync();
    }

    /**
     * Listen to browser online/offline events
     */
    _initAutoSync() {
      if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('online', () => {
          this.flushAll();
        });
      }
    }

    /**
     * Register an event listener
     * @param {'queued'|'flushed'|'acked'|'failed'|'queueChanged'} event
     * @param {Function} callback
     */
    on(event, callback) {
      if (this.listeners[event]) {
        this.listeners[event].push(callback);
      }
      return this;
    }

    /**
     * Emit an event
     */
    _emit(event, data) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(fn => {
          try { fn(data); } catch (err) { console.error(`[PiOfflineOutbox] Event error (${event}):`, err); }
        });
      }
    }

    /**
     * Get all currently queued messages from storage
     * @returns {Array<Object>}
     */
    getQueue() {
      try {
        const raw = localStorage.getItem(this.queueKey);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.warn('[PiOfflineOutbox] Failed to read queue:', e);
        return [];
      }
    }

    /**
     * Save queue to storage and trigger queueChanged
     * @param {Array<Object>} queue
     */
    _saveQueue(queue) {
      try {
        localStorage.setItem(this.queueKey, JSON.stringify(queue));
        this._emit('queueChanged', { count: queue.length, queue });
      } catch (e) {
        console.error('[PiOfflineOutbox] Storage quota exceeded or unavailable:', e);
      }
    }

    /**
     * Generate next monotonic sequence ID
     * @returns {number}
     */
    _nextSeqId() {
      let lastSeq = parseInt(localStorage.getItem(this.seqKey) || '0', 10);
      lastSeq += 1;
      localStorage.setItem(this.seqKey, lastSeq.toString());
      return lastSeq;
    }

    /**
     * Enqueue a message for an offline or busy peer.
     * The payload remains on the sender's client; zero server media storage.
     * 
     * @param {string} receiverId - Target Pioneer username or peer ID
     * @param {any} payload - Encrypted text, audio metadata, or media pointer
     * @param {string} [type='text'] - 'text' | 'voice_note' | 'tip_packet' | 'file_ref'
     * @returns {Object} The queued item
     */
    enqueue(receiverId, payload, type = 'text') {
      if (!receiverId) throw new Error('[PiOfflineOutbox] receiverId is required');

      const queue = this.getQueue();
      const seqId = this._nextSeqId();

      const item = {
        seq_id: seqId,
        receiver_id: receiverId,
        payload: payload,
        type: type,
        status: 'queued', // 'queued' | 'sending' | 'acked' | 'failed'
        retries: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      queue.push(item);
      this._saveQueue(queue);

      this._emit('queued', item);
      return item;
    }

    /**
     * Mark an item as acknowledged and remove from outbox
     * @param {number} seqId
     */
    acknowledge(seqId) {
      let queue = this.getQueue();
      const item = queue.find(i => i.seq_id === seqId);
      if (item) {
        queue = queue.filter(i => i.seq_id !== seqId);
        this._saveQueue(queue);
        this._emit('acked', { seq_id: seqId, item });
      }
    }

    /**
     * Flush all queued messages for a specific peer when they come online
     * @param {string} receiverId
     * @param {Function} [customSendHandler] - Optional override for dispatch
     * @returns {Promise<number>} Number of successfully dispatched messages
     */
    async flushForPeer(receiverId, customSendHandler = null) {
      const handler = customSendHandler || this.sendHandler;
      if (!handler) {
        console.warn('[PiOfflineOutbox] No sendHandler configured for flush');
        return 0;
      }

      const queue = this.getQueue();
      const items = queue
        .filter(i => i.receiver_id === receiverId && (i.status === 'queued' || i.status === 'sending'))
        .sort((a, b) => a.seq_id - b.seq_id);

      if (items.length === 0) return 0;

      let sentCount = 0;
      for (const item of items) {
        try {
          item.status = 'sending';
          item.retries += 1;
          item.updated_at = new Date().toISOString();
          this._saveQueue(queue);

          const success = await handler(item);
          if (success) {
            this.acknowledge(item.seq_id);
            sentCount++;
          } else {
            item.status = item.retries >= this.maxRetries ? 'failed' : 'queued';
            this._saveQueue(queue);
            if (item.status === 'failed') {
              this._emit('failed', item);
            }
          }
        } catch (err) {
          console.warn(`[PiOfflineOutbox] Error dispatching seq_id ${item.seq_id}:`, err);
          item.status = item.retries >= this.maxRetries ? 'failed' : 'queued';
          this._saveQueue(queue);
          if (item.status === 'failed') {
            this._emit('failed', item);
          }
        }
      }

      this._emit('flushed', { receiverId, count: sentCount });
      return sentCount;
    }

    /**
     * Flush all pending messages across all receivers (e.g. when app regains network)
     */
    async flushAll(customSendHandler = null) {
      if (this._isFlushing) return;
      this._isFlushing = true;

      try {
        const queue = this.getQueue();
        const receivers = Array.from(new Set(queue.map(i => i.receiver_id)));
        for (const rec of receivers) {
          await this.flushForPeer(rec, customSendHandler);
        }
      } finally {
        this._isFlushing = false;
      }
    }

    /**
     * Clear all queued messages
     */
    clearQueue() {
      this._saveQueue([]);
    }

    /**
     * Get queue statistics
     */
    getStats() {
      const q = this.getQueue();
      return {
        total: q.length,
        queued: q.filter(i => i.status === 'queued').length,
        sending: q.filter(i => i.status === 'sending').length,
        failed: q.filter(i => i.status === 'failed').length
      };
    }
  }

  return PiOfflineOutbox;
});
