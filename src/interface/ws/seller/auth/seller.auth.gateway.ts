import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SellerAuthDto } from './seller-auth.request.dtos';


@WebSocketGateway({ namespace: 'seller-auth', cors: true })
export class SellerAuthGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log('🔌 Client connected to /seller-auth');
  }

  // ====================================================
  // SELLER 
  // ====================================================
  @SubscribeMessage('join_seller_login_code')
  async handleJoinSellerLoginCode(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string },
  ) {
    client.join(`seller_login_${data.code}`);
    console.log(`🟡 Client joined room: seller_login_${data.code}`);
  }

  notifySellerLoginConfirmed(code: string, token: string, seller: SellerAuthDto) {
    this.server.to(`seller_login_${code}`).emit('seller_login_confirmed', { token, seller });
    console.log(`✅ Notified seller_login_${code}`);
  }

}