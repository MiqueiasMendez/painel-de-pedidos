import { OrderStatus } from '../types';

/**
 * Simplifies an order status to either PENDING or READY.
 */
export function simplifyStatus(status: OrderStatus): OrderStatus {
  return status === OrderStatus.READY ? OrderStatus.READY : OrderStatus.PENDING;
}
