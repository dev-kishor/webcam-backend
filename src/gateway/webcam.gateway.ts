import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';

@WebSocketGateway()
export class WebCamGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  handleConnection(client: Socket) {
    console.log('New connection:', client.id);
    client.broadcast.emit('joined', `User joined: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log('User disconnected:', client.id);
    client.broadcast.emit('left', `User left: ${client.id}`);
  }

  @SubscribeMessage('offer')
  handleOffer(client: Socket, payload: any): void {
    console.log('Received offer:', payload);
    // Broadcast the offer to all clients except the sender
    client.broadcast.emit('offer', payload);
  }

  @SubscribeMessage('answer')
  handleAnswer(client: Socket, payload: any): void {
    console.log('Received answer:', payload);
    // Broadcast the answer to all clients except the sender
    client.broadcast.emit('answer', payload);
  }

  @SubscribeMessage('candidate')
  handleCandidate(client: Socket, payload: any): void {
    console.log('Received ICE candidate:', payload);
    // Broadcast ICE candidates to all clients except the sender
    client.broadcast.emit('candidate', payload);
  }
}
