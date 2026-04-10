// Consumer management — Phase D

async function createConsumer(router, producer, transport, rtpCapabilities) {
  if (!router.canConsume({ producerId: producer.id, rtpCapabilities })) {
    throw new Error('Cannot consume — incompatible RTP capabilities');
  }

  const consumer = await transport.consume({
    producerId: producer.id,
    rtpCapabilities,
    paused: true // Start paused, resume after transport connected
  });

  consumer.on('producerclose', () => {
    console.log(`Consumer ${consumer.id} closed — producer closed`);
    consumer.close();
  });

  consumer.on('score', (score) => {
    // Monitor consumer quality
  });

  return consumer;
}

module.exports = { createConsumer };
