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
    console.log(`New---->: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Disconnected------>: ${client.id}`);
  }


  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, { roomId }: any) {
    client.join(roomId);
    console.log(`${client.id} joined room: ${roomId}`);
    this.server.to(roomId).emit('joined', `User ${client.id} joined room ${roomId}`);
  }

  @SubscribeMessage('offer')
  handleOffer(client: Socket, { roomId, sdp }: any) {
    
    console.log(`Offer received from ${client.id} for room ${roomId}:`, sdp.slice(0, 20));
    this.server.to(roomId).emit('offer', { sdp, roomId });
  }

  @SubscribeMessage('answer')
  handleAnswer(client: Socket, { roomId, sdp }: any) {
    console.log(`Answer received for room ${roomId}`);
    this.server.to(roomId).emit('answer', { sdp, roomId });
  }

  @SubscribeMessage('candidate')
  handleCandidate(client: Socket, { roomId, candidate }: any) {
    console.log(`ICE candidate received for room ${roomId}`);
    this.server.to(roomId).emit('candidate', { candidate, roomId });
  }
}
