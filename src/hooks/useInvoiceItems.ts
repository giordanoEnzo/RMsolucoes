import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';

interface InvoiceItem {
  id: string;
  service_name: string;
  service_description: string;
  quantity: number;
  unit_price: number;
  sale_value: number;
  order_id: string;
}

export function useInvoiceItems(invoiceId: string) {
  const fetchInvoiceItems = async (): Promise<InvoiceItem[]> => {
    // Buscar a fatura para obter os IDs das ordens
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('orders')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) {
      console.error('Erro ao buscar fatura:', invoiceError.message);
      throw invoiceError;
    }

    if (!invoice.orders || !Array.isArray(invoice.orders)) {
      return [];
    }

    // Extrair IDs das ordens da fatura
    const orderIds = invoice.orders.map((order: any) => order.id).filter(Boolean);

    if (orderIds.length === 0) {
      return [];
    }

    // Buscar todos os itens das ordens
    const { data: items, error: itemsError } = await supabase
      .from('service_order_items')
      .select('*')
      .in('order_id', orderIds);

    if (itemsError) {
      console.error('Erro ao buscar itens:', itemsError.message);
      throw itemsError;
    }

    return items || [];
  };

  const { data = [], isLoading, error } = useQuery<InvoiceItem[]>({
    queryKey: ['invoice-items', invoiceId],
    queryFn: fetchInvoiceItems,
    enabled: !!invoiceId,
  });

  return {
    items: data,
    isLoading,
    error,
  };
} 