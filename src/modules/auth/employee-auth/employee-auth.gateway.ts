import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { EmployeeAuthResponseDto } from './employee-auth.response.dto';

@WebSocketGateway({ namespace: 'employee-auth', cors: true })
export class EmployeeAuthGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log('🔌 Client connected to /employee-auth');
  }

  @SubscribeMessage('join_login_code')
  async handleJoinLoginCode(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string },
  ) {
    client.join(`login_${data.code}`);
    console.log(`🟡 Client joined room: login_${data.code}`);
  }

  notifyLoginConfirmed(code: string, token: string, employee: EmployeeAuthResponseDto) {
    this.server.to(`login_${code}`).emit('login_confirmed', { token, employee });
    console.log(`✅ Notified login_${code}`);
  }
}