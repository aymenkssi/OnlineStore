import React from 'react';
import { formatPrice } from '../../../hooks/usePaymentSettings';
import { Card, CardContent } from '../../ui/card';
import { Users, TrendingUp, ShoppingBag } from 'lucide-react';

const CustomerStatsCards = ({ stats }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8" data-testid="customer-stats-cards">
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Clients</p>
            <p className="text-3xl font-bold mt-1" data-testid="stat-total-customers">{stats.totalCustomers}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Nouveaux ce mois</p>
            <p className="text-3xl font-bold mt-1 text-green-600" data-testid="stat-new-month">{stats.newThisMonth}</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Panier moyen</p>
            <p className="text-3xl font-bold mt-1" data-testid="stat-avg-basket">{formatPrice(stats.avgOrderValue)}</p>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">CA Total</p>
            <p className="text-3xl font-bold mt-1 text-green-600" data-testid="stat-total-revenue">{formatPrice(stats.totalRevenue)}</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default CustomerStatsCards;
