import React from 'react';
import { formatPrice } from '../../../hooks/usePaymentSettings';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Eye, AlertCircle, Star, Ban, Trash2 } from 'lucide-react';

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getCustomerTier = (totalSpent) => {
  if (totalSpent >= 2000) return { label: 'VIP', color: 'bg-purple-100 text-purple-800' };
  if (totalSpent >= 1000) return { label: 'Gold', color: 'bg-yellow-100 text-yellow-800' };
  if (totalSpent >= 500) return { label: 'Silver', color: 'bg-gray-100 text-gray-800' };
  return { label: 'Bronze', color: 'bg-orange-100 text-orange-800' };
};

const CustomerTable = ({ customers, onViewCustomer, onDeleteCustomer, canWrite = true }) => (
  <Card data-testid="customer-table-card">
    <CardHeader>
      <CardTitle>Liste des Clients ({customers.length})</CardTitle>
      <CardDescription>Classes par chiffre d'affaires genere</CardDescription>
    </CardHeader>
    <CardContent>
      {customers.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucun client trouve</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="customers-table">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Client</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Contact</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Commandes</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Total depense</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Statut</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Derniere commande</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer, idx) => {
                const tier = getCustomerTier(customer.total_spent || customer.totalSpent || 0);
                return (
                  <tr key={customer.email || customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 font-semibold">
                            {(customer.name || '').split(' ').map(n => n.charAt(0)).join('').slice(0,2) || 'C'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`}</p>
                          <p className="text-xs text-gray-500">Client #{idx + 1}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm">{customer.email}</p>
                      <p className="text-xs text-gray-500">{customer.phone}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-semibold">{customer.total_orders || customer.orderCount || 0}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-semibold text-green-600">{formatPrice(customer.total_spent || customer.totalSpent || 0)}</p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${tier.color}`}>
                          <Star className="w-3 h-3" />{tier.label}
                        </span>
                        {customer.status === 'inactive' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <Ban className="w-3 h-3" />Inactif
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm">{formatDate(customer.updated_at || customer.lastOrderDate)}</p>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onViewCustomer(customer)} data-testid={`view-customer-${idx}`}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canWrite && onDeleteCustomer && (
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => onDeleteCustomer(customer)} data-testid={`delete-customer-${idx}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </CardContent>
  </Card>
);

export { CustomerTable, getCustomerTier, formatDate };
export default CustomerTable;
