import React from 'react';
import { formatPrice } from '../../../hooks/usePaymentSettings';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Mail, Phone, MapPin, Star, Ban, Trash2 } from 'lucide-react';
import { getCustomerTier, formatDate } from './CustomerTable';

const CustomerDetailDialog = ({ open, onOpenChange, customer, onDelete, canWrite = true }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="customer-detail-dialog">
      <DialogHeader>
        <DialogTitle>Details du client</DialogTitle>
      </DialogHeader>
      {customer && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-2xl text-gray-600 font-semibold">
                {(customer.name || '').split(' ').map(n => n.charAt(0)).join('').slice(0,2) || 'C'}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold">{customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getCustomerTier(customer.total_spent || customer.totalSpent || 0).color}`}>
                  <Star className="w-3 h-3" />Client {getCustomerTier(customer.total_spent || customer.totalSpent || 0).label}
                </span>
                {customer.status === 'inactive' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <Ban className="w-3 h-3" />Inactif
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total depense</p>
              <p className="text-2xl font-bold text-green-600" data-testid="detail-total-spent">
                {formatPrice(customer.total_spent || customer.totalSpent || 0)}
              </p>
            </div>
          </div>

          {canWrite && onDelete && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-red-600 border-red-300" onClick={() => onDelete(customer)} data-testid="detail-delete-btn">
              <Trash2 className="w-4 h-4 mr-2" />Supprimer
            </Button>
          </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2"><Mail className="w-4 h-4 text-gray-500" /><p className="text-sm text-gray-500">Email</p></div>
              <p className="font-medium">{customer.email}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2"><Phone className="w-4 h-4 text-gray-500" /><p className="text-sm text-gray-500">Telephone</p></div>
              <p className="font-medium">{customer.phone}</p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2"><MapPin className="w-4 h-4 text-gray-500" /><p className="text-sm text-gray-500">Adresse</p></div>
            <p className="font-medium">
              {customer.address}{customer.address ? <br /> : null}
              {customer.postal_code || customer.postalCode} {customer.city}{(customer.postal_code || customer.postalCode || customer.city) ? <br /> : null}
              {customer.country}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600" data-testid="detail-order-count">{customer.orderCount || 0}</p>
              <p className="text-sm text-blue-600">Commandes</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">
                {customer.orderCount > 0 ? formatPrice((customer.total_spent || 0) / customer.orderCount) : formatPrice(0)}
              </p>
              <p className="text-sm text-green-600">Panier moyen</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg text-center">
              <p className="text-sm font-bold text-purple-600">{formatDate(customer.firstOrderDate || customer.created_at)}</p>
              <p className="text-sm text-purple-600">Client depuis</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Historique des commandes</h3>
            <div className="space-y-2">
              {(customer.orders || []).map((order, idx) => (
                <div key={order.id || order.order_number || `order-${idx}`} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-mono text-sm">{order.order_number || order.id}</p>
                    <p className="text-xs text-gray-500">{formatDate(order.created_at || order.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatPrice(order.total)}</p>
                    <p className="text-xs text-gray-500">{order.items?.length || 0} article(s)</p>
                  </div>
                </div>
              ))}
              {(!customer.orders || customer.orders.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">Aucune commande</p>
              )}
            </div>
          </div>
        </div>
      )}
    </DialogContent>
  </Dialog>
);

export default CustomerDetailDialog;
