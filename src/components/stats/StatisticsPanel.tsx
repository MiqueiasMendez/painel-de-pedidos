import React, { useMemo, useState } from 'react';
import { Order, OrderStatus } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { simplifyStatus } from '../../utils/statusHelpers';

interface StatisticsPanelProps {
  orders: Order[];
  period: 'today' | 'week' | 'month';
  onChangePeriod: (period: 'today' | 'week' | 'month') => void;
}

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({
  orders,
  period,
  onChangePeriod
}) => {
  // Filter orders by period
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const startDate = (() => {
      if (period === 'today') return today;
      if (period === 'week') {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return weekStart;
      }
      if (period === 'month') {
        return new Date(today.getFullYear(), today.getMonth(), 1);
      }
      return today;
    })();
    
    return orders.filter(order => new Date(order.createdAt) >= startDate);
  }, [orders, period]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalOrders = filteredOrders.length;
    
    if (totalOrders === 0) {
      return {
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        pendingOrders: 0,
        readyOrders: 0,
        processingTime: 0,
        topProducts: []
      };
    }
    
    // Revenue
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    const avgOrderValue = totalRevenue / totalOrders;
    
    // Status counts
    const pendingOrders = filteredOrders.filter(
      order => simplifyStatus(order.status) === OrderStatus.PENDING
    ).length;

    const readyOrders = filteredOrders.filter(
      order => simplifyStatus(order.status) === OrderStatus.READY
    ).length;
    
    // Processing time (avg time from creation to delivery for completed orders)
    let processingTimeSum = 0;
    let completedWithDates = 0;
    
    filteredOrders.forEach(order => {
      if (order.status === OrderStatus.DELIVERED && order.actualDeliveryTime) {
        const createdDate = new Date(order.createdAt);
        const deliveredDate = new Date(order.actualDeliveryTime);
        processingTimeSum += (deliveredDate.getTime() - createdDate.getTime()) / (1000 * 60); // in minutes
        completedWithDates++;
      }
    });
    
    const processingTime = completedWithDates > 0 ? processingTimeSum / completedWithDates : 0;
    
    // Top products
    const productMap = new Map<string, number>();
    
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        const current = productMap.get(item.name) || 0;
        productMap.set(item.name, current + item.quantity);
      });
    });
    
    const topProducts = Array.from(productMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, quantity]) => ({ name, quantity }));
    
    return {
      totalOrders,
      totalRevenue,
      avgOrderValue,
      pendingOrders,
      readyOrders,
      processingTime,
      topProducts
    };
  }, [filteredOrders]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold dark:text-white">Estatísticas</h2>
        
        <div className="flex space-x-2">
          <button
            onClick={() => onChangePeriod('today')}
            className={`px-3 py-1 text-sm rounded-lg ${
              period === 'today'
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => onChangePeriod('week')}
            className={`px-3 py-1 text-sm rounded-lg ${
              period === 'week'
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => onChangePeriod('month')}
            className={`px-3 py-1 text-sm rounded-lg ${
              period === 'month'
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Mês
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/30 dark:to-orange-800/20 p-4 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-500 dark:bg-orange-400 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-lg font-bold">P</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Pedidos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalOrders}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20 p-4 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-500 dark:bg-green-400 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-lg font-bold">R$</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Faturamento</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalRevenue)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 p-4 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-500 dark:bg-blue-400 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-lg font-bold">⏳</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Pendentes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingOrders}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20 p-4 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-500 dark:bg-purple-400 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-lg font-bold">📊</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Ticket Médio</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.avgOrderValue)}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-3 dark:text-white">Top Produtos</h3>
          {stats.topProducts.length > 0 ? (
            <div className="space-y-2">
              {stats.topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">{product.name}</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">{product.quantity} un.</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum produto vendido neste período</p>
          )}
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-3 dark:text-white">Status de Pedidos</h3>
          <div className="space-y-3">
            <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              {stats.totalOrders > 0 ? (
                <>
                  <div 
                    className="h-full bg-yellow-500"
                    style={{ 
                      width: `${(stats.pendingOrders / stats.totalOrders) * 100}%`,
                      float: 'left'
                    }}
                  />
                  <div
                    className="h-full bg-green-500"
                    style={{
                      width: `${(stats.readyOrders / stats.totalOrders) * 100}%`,
                      float: 'left'
                    }}
                  />
                </>
              ) : (
                <div className="h-full w-0"></div>
              )}
            </div>
            
            <div className="flex justify-between text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1" />
                <span className="text-gray-600 dark:text-gray-400">Pendentes ({stats.pendingOrders})</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-1" />
                <span className="text-gray-600 dark:text-gray-400">Prontos ({stats.readyOrders})</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPanel;