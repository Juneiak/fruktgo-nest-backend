import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ShopAuthDto } from './shop-auth.request.dtos';


@WebSocketGateway({ namespace: 'shop-auth', cors: true })
export class ShopAuthGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log('🔌 Client connected to /shop-auth');
  }

  // ====================================================
  // SHOP 
  // ====================================================
  @SubscribeMessage('join_shop_login_code')
  async handleJoinShopLoginCode(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string },
  ) {
    client.join(`shop_login_${data.code}`);
    console.log(`🟡 Client joined room: shop_login_${data.code}`);
  }

  notifyShopLoginConfirmed(code: string, token: string, shop: ShopAuthDto) {
    this.server.to(`shop_login_${code}`).emit('shop_login_confirmed', { token, shop });
    console.log(`✅ Notified shop_login_${code}`);
  }
}