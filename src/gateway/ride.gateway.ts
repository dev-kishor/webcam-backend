import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MediasoupService } from './mediasoup.service';
import * as mediasoup from 'mediasoup';
import { MediaKind } from 'mediasoup/node/lib/rtpParametersTypes';

@WebSocketGateway()
export class RideGateway {
  @WebSocketServer() server: Server;

  constructor(private readonly mediasoupService: MediasoupService) {}

  private async getOrCreateWorkerAndRouter(rideId: string) {
    let router = this.mediasoupService.routers.get(rideId);

    if (!router) {
      const worker =
        this.mediasoupService.workers.length > 0
          ? this.mediasoupService.workers[0]
          : await this.mediasoupService.createWorker();

      router = await this.mediasoupService.createRouter(worker);
      this.mediasoupService.routers.set(rideId, router);
    }

    return { router };
  }

  @SubscribeMessage('join_ride')
  async handleJoinRide(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { rideId: string; role: 'driver' | 'rider' },
  ) {
    client.join(payload.rideId);
    console.log(`User ${client.id} joined ride ${payload.rideId}`);

    const { router } = await this.getOrCreateWorkerAndRouter(payload.rideId);

    client.emit('router_capabilities', router.rtpCapabilities);

    client.data.role = payload.role;

    this.server.to(payload.rideId).emit('user_joined', {
      userId: client.id,
      role: payload.role,
    });
  }

  @SubscribeMessage('share_ride')
  async handleShareRide(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { rideId: string },
  ) {
    const shareableLink = generateUniqueLink();

    client.emit('share_link_generated', { link: shareableLink });
  }

  @SubscribeMessage('join_shared_ride')
  async handleJoinSharedRide(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { link: string },
  ) {
    const rideId = await this.getRideIdFromLink(payload.link);

    if (rideId) {
      client.join(rideId);
      client.emit('joined_shared_ride', { rideId });
    } else {
      client.emit('invalid_link');
    }
  }

  @SubscribeMessage('leave_ride')
  async handleLeaveRide(@ConnectedSocket() client: Socket) {
    const rooms = Array.from(client.rooms);
    for (const roomId of rooms) {
      if (roomId !== client.id) {
        client.leave(roomId);
        this.server.to(roomId).emit('user_left', { userId: client.id });
      }
    }
  }

  @SubscribeMessage('produce')
  async handleProduce(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { rideId: string; kind: MediaKind; rtpParameters: any },
  ) {
    const { router } = await this.getOrCreateWorkerAndRouter(payload.rideId);
    const transport = this.mediasoupService.transports
      .get(router.id)
      ?.get(client.id); // Get the driver's transport

    if (!transport) {
      console.error("Driver's transport not found!");
      return;
    }

    try {
      const producer = await transport.produce({
        kind: payload.kind,
        rtpParameters: payload.rtpParameters,
      });

      let rideProducers = this.mediasoupService.producers.get(payload.rideId);
      if (!rideProducers) {
        rideProducers = new Map();
        this.mediasoupService.producers.set(payload.rideId, rideProducers);
      }
      rideProducers.set(client.id, producer); // Store the producer

      client.emit('producer_created', { producerId: producer.id }); // Send producer ID back to the driver

      // Notify riders about the new producer
      client.broadcast.to(payload.rideId).emit('new_producer', {
        // Use broadcast to exclude the sender
        producerId: producer.id,
        userId: client.id,
        kind: payload.kind,
      });
    } catch (error) {
      console.error('Error producing:', error);
      client.emit('produce_error', { error: error.message }); // Handle errors
    }
  }

  @SubscribeMessage('consume')
  async handleConsume(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { rideId: string; producerId: string; rtpCapabilities: any },
  ) {
    const { router } = await this.getOrCreateWorkerAndRouter(payload.rideId);
    const transport = this.mediasoupService.transports
      .get(router.id)
      ?.get(client.id); // Get the rider's transport

    if (!transport) {
      console.error("Rider's transport not found!");
      return;
    }

    const producer = this.mediasoupService.producers
      .get(payload.rideId)
      ?.get(payload.producerId);
    if (!producer) {
      console.error('Producer not found!');
      return;
    }

    try {
      const consumer = await transport.consume({
        producerId: producer.id,
        rtpCapabilities: payload.rtpCapabilities,
      });

      let rideConsumers = this.mediasoupService.consumers.get(payload.rideId);
      if (!rideConsumers) {
        rideConsumers = new Map();
        this.mediasoupService.consumers.set(payload.rideId, rideConsumers);
      }
      rideConsumers.set(client.id, consumer); // Store the consumer

      client.emit('consumer_created', {
        consumerId: consumer.id,
        producerId: producer.id,
      });
    } catch (error) {
      console.error('Error consuming:', error);
      client.emit('consume_error', { error: error.message }); // Handle errors
    }
  }

  private async getRideIdFromLink(link: string): Promise<string | null> {
    // Placeholder: Replace with database lookup
    return link === 'valid_link' ? 'actual_ride_id' : null;
  }
}

// Utility function
function generateUniqueLink() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}
