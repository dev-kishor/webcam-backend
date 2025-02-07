import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';

@WebSocketGateway()
export class WebCamGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  handleConnection(client: Socket) {
    console.log({ action: 'Connected', id: client.id });
  }

  handleDisconnect(client: Socket) {
    console.log({ action: 'Disconnected', id: client.id });
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, { roomId }: any) {
    client.join(roomId);
    console.log({ action: 'Joined room', roomId });
  }

  @SubscribeMessage('offer')
  handleOffer(client: Socket, { roomId, sdp }: any) {
    this.server.to(roomId).emit('offer', { sdp, roomId });
    console.log({ action: 'Offer received', roomId });
  }

  @SubscribeMessage('answer')
  handleAnswer(client: Socket, { roomId, sdp }: any) {
    this.server.to(roomId).emit('answer', { sdp, roomId });
    console.log({ action: 'Answer received', roomId });
  }

  @SubscribeMessage('candidate')
  handleCandidate(client: Socket, { roomId, candidate }: any) {
    if (
      candidate &&
      candidate.candidate &&
      candidate.sdpMid !== null &&
      candidate.sdpMLineIndex !== null
    ) {
      // Send to all *other* clients in the room, but not the sender
      client.to(roomId).emit('candidate', { candidate });
      console.log({ action: 'Valid candidate forwarded', roomId, candidate });
    } else {
      console.warn({ action: 'Invalid ICE candidate received', roomId, candidate });
    }
  }
  

  @SubscribeMessage('requestOffer')
  handleRequestOffer(client: Socket, { roomId }: any) {
    this.server.to(roomId).emit('requestOffer');
    console.log({ action: 'Requesting offer', roomId });
  }
}
