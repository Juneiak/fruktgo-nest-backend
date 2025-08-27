import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SellerAuthDto, ShopAuthDto } from './seller-auth.dtos';


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