import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CustomerAuthDto } from './customer-auth.dtos';

@WebSocketGateway({ namespace: 'customer-auth', cors: true })
export class CustomerAuthGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log('🔌 Client connected to /customer-auth');
  }

  @SubscribeMessage('join_login_code')
  async handleJoinLoginCode(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string },
  ) {
    client.join(`login_${data.code}`);
    console.log(`🟡 Client joined room: login_${data.code}`);
  }

  notifyLoginConfirmed(code: string, token: string, customer: CustomerAuthDto) {
    this.server.to(`login_${code}`).emit('login_confirmed', { token, customer });
    console.log(`✅ Notified login_${code}`);
  }
}