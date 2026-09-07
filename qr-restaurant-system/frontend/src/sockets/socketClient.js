import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/api', '') 
  : 'http://localhost:5050';

class SocketClient {
  constructor() {
    this.socket = null;
    this.currentRestaurantId = null;
    this.currentOrderId = null;
  }

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        withCredentials: true,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.socket.on('connect', () => {
        console.log('[Socket] Connected to server:', this.socket.id);
        // Automatically restore room subscriptions upon connection or reconnection
        if (this.currentRestaurantId) {
          this.socket.emit('join_tenant_room', this.currentRestaurantId);
        }
        if (this.currentOrderId) {
          this.socket.emit('join_order_room', this.currentOrderId);
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
      });
    }
    return this.socket;
  }

  joinRestaurantRoom(restaurantId) {
    if (!restaurantId) return;
    this.currentRestaurantId = restaurantId;

    if (this.socket) {
      if (this.socket.connected) {
        this.socket.emit('join_tenant_room', restaurantId);
      }
    }
  }

  joinOrderRoom(orderId) {
    if (!orderId) return;
    this.currentOrderId = orderId;

    if (this.socket) {
      if (this.socket.connected) {
        this.socket.emit('join_order_room', orderId);
      }
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentRestaurantId = null;
      this.currentOrderId = null;
    }
  }
}

export default new SocketClient();
