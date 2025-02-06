import * as mediasoup from 'mediasoup';
import { Injectable } from '@nestjs/common';
// import { Worker, Router, WebRtcTransport } from 'mediasoup';

@Injectable()
export class MediasoupService {
  public workers: mediasoup.types.Worker[] = [];
  public routers: Map<string, mediasoup.types.Router> = new Map();
  public transports: Map<string, Map<string, mediasoup.types.WebRtcTransport>> = new Map();
  public producers: Map<string, Map<string, mediasoup.types.Producer>> = new Map();
  public consumers: Map<string, Map<string, mediasoup.types.Consumer>> = new Map();

  async createWorker() {
    const worker = await mediasoup.createWorker();
    this.workers.push(worker);

    worker.on('died', () => {
      console.error('Mediasoup worker died, exiting in 5 seconds...');
      setTimeout(() => process.exit(1), 5000);
    });

    return worker;
  }

  async createRouter(worker: mediasoup.types.Worker) {
    return await worker.createRouter({
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
        },
      ],
    });
  }

  async createWebRtcTransport(router: mediasoup.types.Router, userId: string) {
    let transports = this.transports.get(router.id);
    if (!transports) {
      transports = new Map();
      this.transports.set(router.id, transports);
    }

    const transport = await router.createWebRtcTransport({
      listenIps: [{ ip: '0.0.0.0', announcedIp: 'your_public_ip_here' }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: 1000000,
    });

    transports.set(userId, transport);

    transport.on('dtlsstatechange', (dtlsState) => {
      if (dtlsState === 'closed') {
        transport.close();
        transports.delete(userId);
      }
    });

    return transport;
  }
}
