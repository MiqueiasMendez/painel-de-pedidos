import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Order, OrderStatus, Toast, ToastType } from '../../types';
import { simplifyStatus } from '../../utils/statusHelpers';
import OrderCard from './OrderCard';

interface Column {
  id: string;
  title: string;
  color: string;
}

interface OrderBoardProps {
  orders: Order[];
  columns: Column[];
  filter: string;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  onEditPrice: (order: Order) => void;
  onPrintClick: (orderId: string) => void;
  onSendWhatsApp: (phone: string, message: string) => void;
  onPhoneCall: (phone: string) => void;
  onDuplicateOrder: (orderId: string) => void;
  onDeleteOrder: (orderId: string) => void;
  showToast: (message: string, type: ToastType) => void;
  loading: boolean;
}

// Loading Skeleton
const OrderCardSkeleton = () => (
  <div className="border-l-4 border-gray-200 rounded-lg bg-white dark:bg-gray-800 p-4 animate-pulse">
    <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
    <div className="space-y-2">
      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  </div>
);

// Empty State
const EmptyState = ({ message }: { message: string }) => (
  <div className="text-center py-8">
    <div className="w-12 h-12 mx-auto mb-2 bg-gray-400 rounded-full flex items-center justify-center">
      <span className="text-white text-lg font-bold">📦</span>
    </div>
    <p className="text-gray-500 dark:text-gray-400">{message}</p>
  </div>
);

const DraggableOrderBoard: React.FC<OrderBoardProps> = ({
  orders,
  columns,
  filter,
  onUpdateStatus,
  onEditPrice,
  onPrintClick,
  onSendWhatsApp,
  onPhoneCall,
  onDuplicateOrder,
  onDeleteOrder,
  showToast,
  loading
}) => {
  // Organize orders by column
  const ordersByColumn = columns.reduce((acc, column) => {
    acc[column.id] = orders.filter(order => simplifyStatus(order.status) === column.id);
    return acc;
  }, {} as Record<string, Order[]>);

  // Handle drag end
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside a droppable area
    if (!destination) return;

    // Dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;

    // Get the order that was moved
    const orderId = draggableId;
    const newStatus = destination.droppableId as OrderStatus;

    // If status changed, update it
    if (source.droppableId !== destination.droppableId) {
      onUpdateStatus(orderId, newStatus);
    }
  };

  // Determine which columns to display
  const displayColumns = filter === 'all' ? columns : columns.filter(col => col.id === filter);

  // Definir classes de grid dinamicamente baseado no número de colunas
  const gridClasses = useMemo(() => {
    const base = 'grid gap-4';
    switch (displayColumns.length) {
      case 1:
        return `${base} grid-cols-1`;
      case 2:
        return `${base} grid-cols-1 md:grid-cols-2`;
      case 3:
        return `${base} grid-cols-1 md:grid-cols-2 lg:grid-cols-3`;
      default:
        return `${base} grid-cols-1 md:grid-cols-2 lg:grid-cols-4`;
    }
  }, [displayColumns.length]);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className={gridClasses}>
        {displayColumns.map((column) => {
          const columnOrders = ordersByColumn[column.id] || [];
          
          return (
            <div key={column.id} className="space-y-3">
              <div className="flex items-center justify-between sticky top-[118px] md:top-[80px] bg-gray-100 dark:bg-gray-900 py-2 z-10">
                <h3 className="font-semibold dark:text-white flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color }} />
                  {column.title}
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded-full">
                  {columnOrders.length}
                </span>
              </div>
              
              <Droppable droppableId={column.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-3 min-h-[50px]"
                  >
                    {loading && columnOrders.length === 0 ? (
                      <>
                        <OrderCardSkeleton />
                        <OrderCardSkeleton />
                      </>
                    ) : columnOrders.length === 0 ? (
                      <EmptyState message={`Nenhum pedido ${column.title.toLowerCase()}`} />
                    ) : (
                      columnOrders.map((order, index) => (
                        <Draggable key={order.id} draggableId={order.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`${snapshot.isDragging ? 'opacity-70 rotate-1' : ''}`}
                            >
                              <OrderCard
                                key={order.id}
                                order={order}
                                onUpdateStatus={(id, status) => onUpdateStatus(id, status)}
                                onEditPrice={onEditPrice}
                                onPrintClick={onPrintClick}
                                onSendWhatsApp={onSendWhatsApp}
                                onPhoneCall={onPhoneCall}
                                onDuplicateOrder={onDuplicateOrder}
                                onDeleteOrder={onDeleteOrder}
                                showToast={showToast}
                                isDragging={snapshot.isDragging}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};

export default DraggableOrderBoard;