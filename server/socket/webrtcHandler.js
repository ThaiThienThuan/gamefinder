// WebRTC Signaling Handler — Phase D
const { createRouter } = require('../mediasoup/worker');
const {
  getOrCreateRouter,
  createWebRtcTransport,
  cleanupRoom
} = require('../mediasoup/router');
const { createProducer, startBitrateAdaptation } = require('../mediasoup/producer');
const { createConsumer } = require('../mediasoup/consumer');

// Track bitrate adaptation intervals per room
const adaptationIntervals = new Map();

// Track socket-to-resources: socketId → { roomId, transportIds: [], producerIds: [] }
const socketResources = new Map();

function registerWebRTCHandlers(io, socket) {
  // Track this socket's resources for cleanup on disconnect
  if (!socketResources.has(socket.id)) {
    socketResources.set(socket.id, { roomId: null, transportIds: new Set(), producerIds: new Set() });
  }

  const socketResourcesData = socketResources.get(socket.id);

  // Client requests to join mediasoup room
  socket.on('webrtc:join-room', async ({ roomId } = {}) => {
    try {
      const roomState = await getOrCreateRouter(roomId, createRouter);
      socket.emit('webrtc:router-capabilities', {
        rtpCapabilities: roomState.router.rtpCapabilities
      });
    } catch (err) {
      socket.emit('error', { message: `webrtc:join-room failed: ${err.message}` });
    }
  });

  // Client creates a transport (one for send, one for receive)
  socket.on('webrtc:create-transport', async ({ roomId, direction } = {}) => {
    try {
      const roomState = await getOrCreateRouter(roomId, createRouter);
      const transport = await createWebRtcTransport(roomState.router);

      roomState.transports.set(transport.id, transport);

      socket.emit('webrtc:transport-created', {
        transportId: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters
      });
    } catch (err) {
      socket.emit('error', { message: `webrtc:create-transport failed: ${err.message}` });
    }
  });

  // Client connects transport (DTLS handshake)
  socket.on('webrtc:connect-transport', async ({ roomId, transportId, dtlsParameters } = {}) => {
    try {
      const roomState = await getOrCreateRouter(roomId, createRouter);
      const transport = roomState.transports.get(transportId);
      if (!transport) throw new Error('Transport not found');
      await transport.connect({ dtlsParameters });
      socket.emit('webrtc:transport-connected', { transportId });
    } catch (err) {
      socket.emit('error', { message: `webrtc:connect-transport failed: ${err.message}` });
    }
  });

  // Streamer starts producing (screen share or camera)
  socket.on('webrtc:produce', async ({ roomId, transportId, kind, rtpParameters } = {}) => {
    try {
      const roomState = await getOrCreateRouter(roomId, createRouter);
      const transport = roomState.transports.get(transportId);
      if (!transport) throw new Error('Transport not found');

      const producer = await createProducer(transport, kind, rtpParameters);
      roomState.producers.set(producer.id, producer);

      // Start adaptive bitrate monitoring
      const interval = startBitrateAdaptation(producer, roomState.consumers);
      adaptationIntervals.set(producer.id, interval);

      socket.emit('webrtc:produced', { producerId: producer.id });

      // Notify other clients in room that a new producer is available
      socket.to(`room:${roomId}`).emit('webrtc:new-producer', {
        roomId,
        producerId: producer.id,
        kind
      });

      producer.on('close', () => {
        clearInterval(adaptationIntervals.get(producer.id));
        adaptationIntervals.delete(producer.id);
        roomState.producers.delete(producer.id);
        socket.to(`room:${roomId}`).emit('webrtc:producer-closed', { producerId: producer.id });
      });
    } catch (err) {
      socket.emit('error', { message: `webrtc:produce failed: ${err.message}` });
    }
  });

  // Viewer starts consuming
  socket.on('webrtc:consume', async ({ roomId, transportId, producerId, rtpCapabilities } = {}) => {
    try {
      const roomState = await getOrCreateRouter(roomId, createRouter);
      const transport = roomState.transports.get(transportId);
      const producer = roomState.producers.get(producerId);
      if (!transport) throw new Error('Transport not found');
      if (!producer) throw new Error('Producer not found');

      const consumer = await createConsumer(
        roomState.router, producer, transport, rtpCapabilities
      );
      roomState.consumers.set(consumer.id, consumer);

      socket.emit('webrtc:consumed', {
        consumerId: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters
      });
    } catch (err) {
      socket.emit('error', { message: `webrtc:consume failed: ${err.message}` });
    }
  });

  // Client resumes consumer after transport connected
  socket.on('webrtc:resume-consumer', async ({ roomId, consumerId } = {}) => {
    try {
      const roomState = await getOrCreateRouter(roomId, createRouter);
      const consumer = roomState.consumers.get(consumerId);
      if (!consumer) throw new Error('Consumer not found');
      await consumer.resume();
      socket.emit('webrtc:consumer-resumed', { consumerId });
    } catch (err) {
      socket.emit('error', { message: `webrtc:resume-consumer failed: ${err.message}` });
    }
  });

  // Clean up WebRTC resources on disconnect
  socket.on('disconnect', async () => {
    const resources = socketResources.get(socket.id);
    if (resources && resources.roomId) {
      console.log(`WebRTC: socket ${socket.id} disconnected from room ${resources.roomId}`);
      // TODO: Implement per-socket resource cleanup (close specific transports/producers/consumers)
    }
    socketResources.delete(socket.id);
  });
}

module.exports = registerWebRTCHandlers;
