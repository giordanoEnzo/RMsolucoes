import { supabase } from '../integrations/supabase/client';

interface OrderForInvoice {
  id: string;
  order_number: string;
  sale_value: number;
  total_hours?: number;
}

interface ExtraCharge {
  description: string;
  value: number;
}

interface InvoicePayload {
  client_id: string;
  client_name: string;
  start_date: string; // formato: 'YYYY-MM-DD'
  end_date: string;   // formato: 'YYYY-MM-DD'
  orders: OrderForInvoice[];
  extras: ExtraCharge[];
  total_value: number; // apenas soma dos valores das OSs
  total_time: number;  // opcional, será recalculado com base nos logs
}

// ✅ Função para CRIAR fatura
export const createInvoice = async (payload: InvoicePayload) => {
  try {
    const { orders } = payload;

    // Buscar tasks relacionadas às OSs
    const { data: tasks, error: tasksError } = await supabase
      .from('service_order_tasks')
      .select('id, service_order_id')
      .in('service_order_id', orders.map((o) => o.id));

    if (tasksError) throw tasksError;

    // Criar mapa task_id => service_order_id
    const taskToOrderMap: Record<string, string> = {};
    const taskIds: string[] = [];

    tasks?.forEach((t) => {
      if (t.id && t.service_order_id) {
        taskToOrderMap[t.id] = t.service_order_id;
        taskIds.push(t.id);
      }
    });

    // Buscar logs de tempo das tasks
    const { data: logs, error: logsError } = await supabase
      .from('task_time_logs')
      .select('task_id, hours_worked')
      .in('task_id', taskIds);

    if (logsError) throw logsError;

    // Agrupar horas por OS
    const hoursPerOrder: Record<string, number> = {};
    logs?.forEach((log) => {
      const orderId = taskToOrderMap[log.task_id];
      if (!orderId) return;
      if (!hoursPerOrder[orderId]) hoursPerOrder[orderId] = 0;
      hoursPerOrder[orderId] += Number(log.hours_worked) || 0;
    });

    // Buscar itens das ordens de serviço
    const { data: items, error: itemsError } = await supabase
      .from('service_order_items')
      .select('*')
      .in('order_id', orders.map((o) => o.id));

    if (itemsError) {
      console.error('Erro ao buscar itens:', itemsError);
      // Não vamos falhar se não conseguir buscar itens
    }

    // Agrupar itens por OS
    const itemsPerOrder: Record<string, any[]> = {};
    items?.forEach((item) => {
      if (!itemsPerOrder[item.order_id]) {
        itemsPerOrder[item.order_id] = [];
      }
      itemsPerOrder[item.order_id].push(item);
    });

    // Atualizar `total_hours` com base nos logs reais e adicionar itens
    const ordersFormatted = orders.map((order) => ({
      ...order,
      total_hours: hoursPerOrder[order.id] || 0,
      items: itemsPerOrder[order.id] || [],
    }));

    const total_service_time = ordersFormatted.reduce(
      (acc, curr) => acc + (curr.total_hours || 0),
      0
    );

    const extrasTotal = payload.extras.reduce((acc, e) => acc + e.value, 0);
    const total_value = payload.total_value + extrasTotal;

    // Inserir fatura
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        client_id: payload.client_id,
        client_name: payload.client_name,
        start_date: payload.start_date,
        end_date: payload.end_date,
        extras: payload.extras as any,
        orders: ordersFormatted as any,
        total_value,
        total_time: total_service_time,
      })
      .select()
      .single();

    if (error) throw error;

    // Atualizar status das OSs para "finalized"
    const orderIds = ordersFormatted.map((o) => o.id);

    const { error: updateError } = await supabase
      .from('service_orders')
      .update({ status: 'finalized' })
      .in('id', orderIds);

    if (updateError) throw updateError;

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
};

// ✅ Função para DELETAR fatura
export const deleteInvoice = async (invoiceId: string) => {
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId);

  if (error) throw new Error(error.message);
};

// Tipo para dados da invoice
export interface InvoiceData {
  id: string;
  client_id: string;
  client_name: string;
  start_date: string;
  end_date: string;
  total_value: number;
  total_time: number;
  orders: {
    id: string;
    order_number: string;
    sale_value: number;
    total_hours: number;
    items?: {
      id: string;
      service_name: string;
      service_description: string;
      quantity: number;
      unit_price: number;
      sale_value: number;
    }[];
  }[];
  extras?: {
    description: string;
    value: number;
  }[];
  created_at: string;
}
