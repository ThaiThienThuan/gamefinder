import { useState, useRef, useCallback } from 'react';
import * as mediasoupClient from 'mediasoup-client';
import apiClient from '../lib/apiClient';
import { useSocket } from './useSocket';

export function useMediasoup(roomId) {
  const { on, emit } = useSocket();
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const producerRef = useRef(null);

  const [consumers, setConsumers] = useState(new Map()); // producerId → { consumer, stream }
  const [isProducing, setIsProducing] = useState(false);
  const [error, setError] = useState(null);

  // Step 1: Load router capabilities and create device
  const initDevice = useCallback(async () => {
    return new Promise((resolve, reject) => {
      emit('webrtc:join-room', { roomId });
      const cleanup = on('webrtc:router-capabilities', async ({ rtpCapabilities }) => {
        cleanup();
        try {
          const device = new mediasoupClient.Device();
          await device.load({ routerRtpCapabilities: rtpCapabilities });
          deviceRef.current = device;
          resolve(device);
        } catch (err) {
          reject(err);
        }
      });
    });
  }, [roomId, emit, on]);

  // Step 2: Create send transport for producing
  const createSendTransport = useCallback(async (device) => {
    return new Promise((resolve, reject) => {
      emit('webrtc:create-transport', { roomId, direction: 'send' });
      const cleanup = on('webrtc:transport-created', async (transportParams) => {
        cleanup();
        try {
          const transport = device.createSendTransport(transportParams);
          
          // Handle DTLS connection
          transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            emit('webrtc:connect-transport', {
              roomId,
              transportId: transport.id,
              dtlsParameters
            });

            const confirmCleanup = on('webrtc:transport-connected', ({ transportId }) => {
              if (transportId === transport.id) {
                confirmCleanup();
                callback();
              }
            });

            const errorCleanup = on('error', (err) => {
              confirmCleanup?.();
              errorCleanup?.();
              errback(err);
            });
          });

          transport.on('produce', async (parameters, callback, errback) => {
            try {
              emit('webrtc:produce', {
                roomId,
                transportId: transport.id,
                kind: parameters.kind,
                rtpParameters: parameters.rtpParameters
              });

              const producedCleanup = on('webrtc:produced', ({ producerId }) => {
                producedCleanup();
                callback({ id: producerId });
              });
            } catch (err) {
              errback(err);
            }
          });

          sendTransportRef.current = transport;
          resolve(transport);
        } catch (err) {
          reject(err);
        }
      });
    });
  }, [roomId, emit, on]);

  // Step 3: Start producing (camera or screen share)
  const startProducing = useCallback(async (stream, kind = 'camera') => {
    try {
      if (!deviceRef.current || !sendTransportRef.current) {
        throw new Error('Device or transport not initialized');
      }

      const track = kind === 'screen' 
        ? stream.getVideoTracks()[0] 
        : stream.getAudioTracks()[0] || stream.getVideoTracks()[0];

      const producer = await sendTransportRef.current.produce({
        track,
        encodings: kind === 'screen' ? undefined : [
          { maxBitrate: 100000, scaleResolutionDownBy: 10 },
          { maxBitrate: 300000, scaleResolutionDownBy: 5 },
          { maxBitrate: 1500000 }
        ]
      });

      producerRef.current = producer;
      setIsProducing(true);

      // Listen for new producers from other clients
      const newProducerCleanup = on('webrtc:new-producer', async ({ producerId, kind: producerKind }) => {
        if (producerId !== producer.id) {
          await startConsuming(producerId, producerKind);
        }
      });

      return producer;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [on]);

  // Step 4: Create receive transport and start consuming
  const startConsuming = useCallback(async (producerId, kind) => {
    try {
      if (!deviceRef.current) {
        await initDevice();
      }

      if (!recvTransportRef.current) {
        await createRecvTransport();
      }

      emit('webrtc:consume', {
        roomId,
        transportId: recvTransportRef.current.id,
        producerId,
        rtpCapabilities: deviceRef.current.rtpCapabilities
      });

      const consumeCleanup = on('webrtc:consumed', async ({ consumerId, rtpParameters }) => {
        consumeCleanup();
        try {
          const consumer = await recvTransportRef.current.consume({
            id: consumerId,
            producerId,
            kind,
            rtpParameters
          });

          await consumer.resume();

          emit('webrtc:resume-consumer', { roomId, consumerId });

          setConsumers(prev => new Map(prev).set(producerId, { consumer, stream: consumer.track }));
        } catch (err) {
          setError(err.message);
        }
      });
    } catch (err) {
      setError(err.message);
    }
  }, [roomId, initDevice, on, emit]);

  // Helper: Create receive transport
  const createRecvTransport = useCallback(async () => {
    return new Promise((resolve, reject) => {
      emit('webrtc:create-transport', { roomId, direction: 'recv' });
      const cleanup = on('webrtc:transport-created', (transportParams) => {
        cleanup();
        try {
          const transport = deviceRef.current.createRecvTransport(transportParams);
          
          transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            emit('webrtc:connect-transport', {
              roomId,
              transportId: transport.id,
              dtlsParameters
            });

            const confirmCleanup = on('webrtc:transport-connected', ({ transportId }) => {
              if (transportId === transport.id) {
                confirmCleanup();
                callback();
              }
            });
          });

          recvTransportRef.current = transport;
          resolve(transport);
        } catch (err) {
          reject(err);
        }
      });
    });
  }, [roomId, emit, on]);

  // Stop producing
  const stopProducing = useCallback(async () => {
    if (producerRef.current) {
      await producerRef.current.close();
      producerRef.current = null;
      setIsProducing(false);
    }
  }, []);

  // Stop consuming all
  const stopConsuming = useCallback(async () => {
    for (const { consumer } of consumers.values()) {
      await consumer.close();
    }
    setConsumers(new Map());
  }, [consumers]);

  // Cleanup on unmount
  const cleanup = useCallback(async () => {
    await stopProducing();
    await stopConsuming();
    if (sendTransportRef.current) {
      sendTransportRef.current.close();
      sendTransportRef.current = null;
    }
    if (recvTransportRef.current) {
      recvTransportRef.current.close();
      recvTransportRef.current = null;
    }
  }, [stopProducing, stopConsuming]);

  return {
    initDevice,
    createSendTransport,
    startProducing,
    startConsuming,
    stopProducing,
    stopConsuming,
    cleanup,
    consumers,
    isProducing,
    error,
    deviceRef,
    sendTransportRef,
    recvTransportRef
  };
}
