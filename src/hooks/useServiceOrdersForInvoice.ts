import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { useMemo } from 'react';

interface ServiceOrderItem {
  service_name: string;
  service_description: string;
  quantity: number;
  unit_price: number;
}

interface ServiceOrder {
  id: string;
  order_number: string;
  sale_value: number;
  total_hours: number;
  service_start_date: string;
  items: ServiceOrderItem[];
}

export function useServiceOrdersForInvoice(
  clientId: string,
  startDate: string,
  endDate: string
) {
  const fetchOrders = async (): Promise<ServiceOrder[]> => {
  // 1. Buscar ordens do cliente com status "to_invoice"
  const { data: orders, error } = await supabase
    .from('service_orders')
    .select('id, order_number, sale_value, service_start_date')
    .eq('client_id', clientId)
    .eq('status', 'to_invoice')
    .gte('service_start_date', startDate)
    .lte('service_start_date', endDate);

  if (error) {
    console.error('Erro ao buscar OSs:', error.message);
    throw error;
  }

  // 2. Para cada ordem, buscar itens
  const ordersWithDetails = await Promise.all(
    (orders || []).map(async (os) => {
      // Buscar itens da ordem de serviço
      const { data: items, error: itemsError } = await supabase
        .from('service_order_items')
        .select('service_name, service_description, quantity, unit_price, sale_value')
        .eq('order_id', os.id);

      if (itemsError) {
        console.error(`Erro ao buscar itens da OS ${os.id}:`, itemsError.message);
      }

      return {
        id: os.id,
        order_number: os.order_number,
        sale_value: os.sale_value || 0,
        total_hours: 0, // Simplificado por enquanto
        service_start_date: os.service_start_date,
        items: (items || []).map(item => ({
          service_name: item.service_name,
          service_description: item.service_description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      };
    })
  );

  return ordersWithDetails;
};


  const { data = [], isLoading } = useQuery<ServiceOrder[]>({
    queryKey: ['service-orders-invoice', clientId, startDate, endDate],
    queryFn: fetchOrders,
    enabled: !!clientId && !!startDate && !!endDate,
  });

  const totalValue = useMemo(
    () => data.reduce((sum, os) => sum + (os.sale_value || 0), 0),
    [data]
  );

  const totalTime = useMemo(
    () => data.reduce((sum, os) => sum + (os.total_hours || 0), 0),
    [data]
  );

  return {
    serviceOrders: data,
    totalValue,
    totalTime,
    isLoading,
  };
}
