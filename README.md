# TalkPi Core — E2EE WebRTC P2P & Anti-Phishing Security Modules
[![Live MVP](https://img.shields.io/badge/Live_Working_MVP-6860979.xyz-brightgreen)](https://6860979.xyz)
[![License: PiOS / MIT](https://img.shields.io/badge/License-PiOS_%2F_MIT-blue.svg)](LICENSE)

> **Live Working MVP (1-Click Demo Sandbox):** [https://6860979.xyz](https://6860979.xyz)

**TalkPi** is a next-generation End-to-End Encrypted (E2EE) Peer-to-Peer (P2P) voice calling and messaging dApp built natively for the Pi Network ecosystem and multi-chain Web3 environments. This repository (`talkpi-core`) contains the open-source client-side security, cryptographic verification, and WebRTC Dual-Stack IPv6 routing modules.

---

## 🌟 Open-Source Modules Included in `talkpi-core`
To protect production server infrastructure while contributing to Web3 Public Goods and the Pi Open Source (PiOS) initiative, we open-source our core client-side security and P2P modules:

1. **Deterministic 4-Word SAS Verification (`src/sas_verifier.js`)**
   - Derives a 4-word Short Authentication String (SAS) from DTLS-SRTP session keys (`X25519` + `AES-256-GCM`) so both peers can visually verify zero Man-in-the-Middle (MITM) eavesdropping.
2. **24-Word Seed Phrase Anti-Phishing Shield (`src/anti_phishing_guard.js`)**
   - Client-side real-time regex and entropy scanner that detects and blocks attempts to solicit or leak 24-word wallet passphrases inside chat streams before transmission.
3. **Dual-Stack IPv6 ICE Candidate Prioritizer (`src/webrtc_ipv6_router.js`)**
   - Harvests and sorts WebRTC ICE candidates to prioritize native mobile 4G/5G Public IPv6 connections (>95% direct P2P bypass rate) before falling back to embedded `pion/turn` relays (UDP 3478).
4. **Sender-Side Local FIFO Outbox (`src/local_fifo_outbox.js`)**
   - Zero-server-storage offline message queue (`seq_id` -> `ACK`) storing AES-256-GCM encrypted payloads locally until P2P DataChannel reconnection.

---

## 💰 Tokenomics & 120% TVL SAFU Cold Reserve
TalkPi enforces an economic anti-spam firewall via our Live Price Oracle:
- **Mutual Friends:** 100% FREE voice calls, text, and voice notes forever.
- **Two-Way Stranger Interactions ($0.001 Call Handshake / $0.005 Greeting):**
  - `30%` Instant User Tip to Receiver | `30%` SAFU Cold Reserve | `20%` Server & TURN Infra | `20%` Core R&D.
- **System Utility Fees (Vanity Usernames `@handle`, VIP Ad-Free Tiers & Ads):**
  - `30%` Core R&D | `30%` Server & TURN Infra | `30%` SAFU Cold Reserve | `10%` Community Competition Pool.
- **Dynamic 120% TVL Overflow Rule:** Whenever the SAFU Insurance Pool exceeds **120% of Total Internal User Balances**, 100% of excess funds automatically overflow into the Community Rewards Pool.

---

## 🗺️ 5-Phase Development Roadmap
- **Phase 1 (Completed - Live at [6860979.xyz](https://6860979.xyz)):** Pi SDK Auth, Opus P2P Voice Calls, E2EE Text/Image/Voice Notes, Speech-to-Text, Live Price Oracle, `TPW...` Software Wallet (5% fee discount), TLP Rewards, and `@talkpi_echo_bot`.
- **Phase 2 (In Progress):** Regional TURN routing, Web Companion App with dynamic QR Code pairing, and Zero-Knowledge personal cloud backup (Google Drive / OneDrive / WebDAV).
- **Phase 3:** Multi-TURN clusters, 1:1 HD Video Calling, and customizable user profiles/status.
- **Phase 4:** Standalone Native Mobile Apps (iOS CallKit / Android FCM VoIP Push) & Desktop Clients (Windows / macOS / Linux).
- **Phase 5:** Trustless In-Chat P2P Escrow smart contracts for live video-inspected commerce.

## 📜 Compliance & Legal
- **Privacy Policy:** [https://6860979.xyz/privacy.html](https://6860979.xyz/privacy.html)
- **Terms of Service:** [https://6860979.xyz/terms.html](https://6860979.xyz/terms.html)
