// Producer management — Phase D
// Handles bitrate adaptation

async function createProducer(transport, kind, rtpParameters) {
  const producer = await transport.produce({ kind, rtpParameters });

  producer.on('score', (score) => {
    // Monitor producer quality score for bitrate adaptation
  });

  return producer;
}

// Bitrate profiles
const BITRATE_PROFILES = {
  HIGH: 2500000,    // 2.5Mbps — 720p default
  MEDIUM: 1500000,  // 1.5Mbps — 480p fallback
  LOW: 800000       // 800kbps — 360p ultra-low
};

// Adaptive bitrate — monitor consumer stats every 5s
function startBitrateAdaptation(producer, consumers) {
  return setInterval(async () => {
    for (const consumer of consumers.values()) {
      try {
        const stats = await consumer.getStats();
        const inbound = stats.find(s => s.type === 'inbound-rtp');
        if (!inbound) continue;

        if (inbound.fractionLost > 0.1) {
          // >10% packet loss — reduce bitrate
          await producer.setMaxIncomingBitrate(BITRATE_PROFILES.MEDIUM);
        } else if (inbound.fractionLost < 0.02) {
          // <2% loss — restore high quality
          await producer.setMaxIncomingBitrate(BITRATE_PROFILES.HIGH);
        }
      } catch {}
    }
  }, 5000);
}

module.exports = { createProducer, startBitrateAdaptation, BITRATE_PROFILES };
