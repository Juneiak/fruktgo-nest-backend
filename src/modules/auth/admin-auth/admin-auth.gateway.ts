import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AdminAuthResponseDto } from './admin-auth.response.dto';

@WebSocketGateway({ namespace: 'admin-auth', cors: true })
export class AdminAuthGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log('🔌 Client connected to /admin-auth');
  }

  @SubscribeMessage('join_login_code')
  async handleJoinLoginCode(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string },
  ) {
    client.join(`login_${data.code}`);
    console.log(`🟡 Client joined room: login_${data.code}`);
  }

  notifyLoginConfirmed(code: string, token: string, admin: AdminAuthResponseDto) {
    this.server.to(`login_${code}`).emit('login_confirmed', { token, admin });
    console.log(`✅ Notified login_${code}`);
  }
}