import React from 'react';
import { Card, CardContent } from '../../ui/card';
import { Package, Clock, CheckCircle, Truck } from 'lucide-react';

const OrderStatsCards = ({ stats, filterStatus, setFilterStatus }) => {
  const cards = [
    { key: 'all', label: 'Total', value: stats.total, icon: Package, color: 'text-gray-400', ring: 'ring-black' },
    { key: 'processing', label: 'En traitement', value: stats.processing, icon: Clock, color: 'text-orange-500', ring: 'ring-orange-500' },
    { key: 'confirmed', label: 'Confirmees', value: stats.confirmed, icon: CheckCircle, color: 'text-blue-500', ring: 'ring-blue-500' },
    { key: 'shipped', label: 'Expediees', value: stats.shipped, icon: Truck, color: 'text-purple-500', ring: 'ring-purple-500' },
    { key: 'delivered', label: 'Livrees', value: stats.delivered, icon: Package, color: 'text-green-500', ring: 'ring-green-500' },
    { key: 'received', label: 'Recues', value: stats.received, icon: CheckCircle, color: 'text-emerald-500', ring: 'ring-emerald-500' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8" data-testid="order-stats-cards">
      {cards.map(({ key, label, value, icon: Icon, color, ring }) => (
        <Card
          key={key}
          className={`cursor-pointer transition-all ${filterStatus === key ? `ring-2 ${ring}` : ''}`}
          onClick={() => setFilterStatus(key)}
          data-testid={`order-stat-${key}`}
        >
          <CardContent className="pt-6 text-center">
            <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-gray-600">{label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default OrderStatsCards;
