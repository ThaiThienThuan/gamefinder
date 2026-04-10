const setting = require('../Config/Setting.json');

// In-memory map: roomId → { router, transports, producers, consumers }
const rooms = new Map();

async function getOrCreateRouter(roomId, createRouterFn) {
  if (!rooms.has(roomId)) {
    const router = await createRouterFn();
    rooms.set(roomId, {
      router,
      transports: new Map(),    // transportId → transport
      producers: new Map(),     // producerId → producer
      consumers: new Map()      // consumerId → consumer
    });
    console.log(`✓ Router created for room ${roomId}`);
  }
  return rooms.get(roomId);
}

async function createWebRtcTransport(router) {
  const listenIps = [
    {
      ip: setting.mediasoup?.listenIp || process.env.MEDIASOUP_LISTEN_IPS || '0.0.0.0',
      announcedIp: setting.mediasoup?.announcedIp || process.env.MEDIASOUP_ANNOUNCED_IP || undefined
    }
  ];

  const transport = await router.createWebRtcTransport({
    listenIps,
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 1000000, // 1Mbps initial
  });

  transport.on('dtlsstatechange', (dtlsState) => {
    if (dtlsState === 'closed') transport.close();
  });

  return transport;
}

function cleanupRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.producers.forEach(p => p.close());
  room.consumers.forEach(c => c.close());
  room.transports.forEach(t => t.close());
  room.router.close();
  rooms.delete(roomId);
  console.log(`✓ Room ${roomId} mediasoup resources cleaned up`);
}

module.exports = { getOrCreateRouter, createWebRtcTransport, cleanupRoom };
