const mediasoup = require('mediasoup');
const setting = require('../Config/Setting.json');

const workers = [];
let nextWorkerIndex = 0;

// Codec capabilities — VP8 video + opus audio
const routerMediaCodecs = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: { 'x-google-start-bitrate': 1000 }
  }
];

async function createWorkers(numWorkers = 1) {
  for (let i = 0; i < numWorkers; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
      rtcMinPort: parseInt(setting.mediasoup?.minPort || process.env.MEDIASOUP_MIN_PORT || 30000),
      rtcMaxPort: parseInt(setting.mediasoup?.maxPort || process.env.MEDIASOUP_MAX_PORT || 30100)
    });

    worker.on('died', () => {
      console.error(`✗ mediasoup worker[${i}] died — restarting in 2s`);
      setTimeout(() => spawnWorker(i), 2000);
    });

    workers.push(worker);
    console.log(`✓ mediasoup worker[${i}] created (pid: ${worker.pid})`);
  }
}

async function spawnWorker(index) {
  const worker = await mediasoup.createWorker({
    rtcMinPort: parseInt(setting.mediasoup?.minPort || 30000),
    rtcMaxPort: parseInt(setting.mediasoup?.maxPort || 30100)
  });
  worker.on('died', () => spawnWorker(index));
  workers[index] = worker;
}

// Round-robin worker selection
function getNextWorker() {
  if (workers.length === 0) throw new Error('No mediasoup workers available');
  const worker = workers[nextWorkerIndex];
  nextWorkerIndex = (nextWorkerIndex + 1) % workers.length;
  return worker;
}

async function createRouter() {
  const worker = getNextWorker();
  return await worker.createRouter({ mediaCodecs: routerMediaCodecs });
}

module.exports = { createWorkers, createRouter, routerMediaCodecs };
