// Order and Return status enums (data is now managed by the backend API)

export const ORDER_STATUS = {
  PROCESSING: 'processing', // En cours de traitement (nouveau statut par défaut)
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  RECEIVED: 'received', // Client confirmed reception
  CANCELLED: 'cancelled'
};

export const RETURN_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SHIPPED: 'shipped', // Client shipped the return
  RECEIVED: 'received', // Warehouse received the return
  REFUNDED: 'refunded'
};
