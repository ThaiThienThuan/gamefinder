# Mediasoup Integration — Phase D

This folder will contain all WebRTC/SFU (Selective Forwarding Unit) logic.

## What goes here

- `worker.js` → mediasoup Worker spawn and configuration
- `router.js` → SFU Router creation per room/session
- `producer.js` → Screen/camera publish logic
- `consumer.js` → Viewer subscribe logic
- `transport.js` → WebRTC transport management
- `config.js` → Mediasoup configuration (codec, bitrate, etc.)

## Also requires

- coturn TURN server (infra/coturn/turnserver.conf)
- UDP ports 30000-30100 open on host (or configured port range)
- MEDIASOUP_ANNOUNCED_IP set to public IP for production
- TURN_SECRET for authentication
- RTC capabilities negotiation

## Integration Points

Current code contains `[MEDIASOUP_PLACEHOLDER]` comments marking where WebRTC logic should be added:

```bash
grep -r "[MEDIASOUP_PLACEHOLDER]" ../../
```

## Key Files to Create/Update in Phase D

- `Util/turnCredential.js` - Implement TURN credential generation
- `apps/controllers/index.js` - Add endpoints for transport creation
- `client/src/hooks/useMediasoup.js` - Replace stub with actual mediasoup-client
- `infra/coturn/turnserver.conf` - Configure TURN server
- `docker-compose.yml` - Add coturn service

## Phase D Deliverables

✓ mediasoup Worker and Router
✓ WebRTC transport creation
✓ Producer creation (screen/camera)
✓ Consumer subscription (peer viewing)
✓ TURN server configuration
✓ Bitrate adaptation
✓ Client-side mediasoup-client integration
✓ Peer-to-peer video/audio streaming

## Network Requirements

- Open UDP 30000-30100 (configurable) for RTC media
- TCP 5349 for TURN TLS (optional but recommended)
- STUN/TURN servers for NAT traversal
