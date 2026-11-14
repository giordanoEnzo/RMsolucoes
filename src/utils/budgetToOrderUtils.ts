import { supabase } from '../integrations/supabase/client';

export interface BudgetItem {
  id: string;
  service_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ServiceOrderItem {
  id: string;
  order_id: string;
  service_name: string;
  service_description: string;
  quantity: number;
  unit_price: number;
  sale_value: number;
}

export async function transferBudgetItemsToOrder(budgetId: string, orderId: string): Promise<ServiceOrderItem[]> {
  try {
    // Buscar itens do orçamento
    const { data: budgetItems, error: budgetError } = await supabase
      .from('budget_items')
      .select('*')
      .eq('budget_id', budgetId);

    if (budgetError) {
      console.error('Erro ao buscar itens do orçamento:', budgetError);
      throw budgetError;
    }

    if (!budgetItems || budgetItems.length === 0) {
      console.log('Nenhum item encontrado no orçamento');
      return [];
    }

    // Converter itens do orçamento para itens da OS
    const serviceOrderItems = budgetItems.map((item: BudgetItem) => ({
      order_id: orderId,
      service_name: item.service_name,
      service_description: item.description || '',
      quantity: item.quantity,
      unit_price: item.unit_price,
      sale_value: item.total_price,
    }));

    // Inserir itens na OS
    const { data: insertedItems, error: insertError } = await supabase
      .from('service_order_items')
      .insert(serviceOrderItems)
      .select();

    if (insertError) {
      console.error('Erro ao inserir itens na OS:', insertError);
      throw insertError;
    }

    console.log(`${insertedItems.length} itens transferidos do orçamento para a OS`);
    return insertedItems || [];
  } catch (error) {
    console.error('Erro ao transferir itens do orçamento:', error);
    throw error;
  }
}

export async function verifyOrderItems(orderId: string): Promise<ServiceOrderItem[]> {
  try {
    const { data: items, error } = await supabase
      .from('service_order_items')
      .select('*')
      .eq('order_id', orderId);

    if (error) {
      console.error('Erro ao verificar itens da OS:', error);
      throw error;
    }

    console.log(`Itens encontrados na OS ${orderId}:`, items);
    return items || [];
  } catch (error) {
    console.error('Erro ao verificar itens da OS:', error);
    throw error;
  }
}

export async function getBudgetItems(budgetId: string): Promise<BudgetItem[]> {
  try {
    const { data: items, error } = await supabase
      .from('budget_items')
      .select('*')
      .eq('budget_id', budgetId);

    if (error) {
      console.error('Erro ao buscar itens do orçamento:', error);
      throw error;
    }

    console.log(`Itens encontrados no orçamento ${budgetId}:`, items);
    return items || [];
  } catch (error) {
    console.error('Erro ao buscar itens do orçamento:', error);
    throw error;
  }
}

export async function calculateOrderTotal(orderId: string): Promise<number> {
  try {
    const { data: items, error } = await supabase
      .from('service_order_items')
      .select('sale_value')
      .eq('order_id', orderId);

    if (error) {
      console.error('Erro ao calcular total da OS:', error);
      throw error;
    }

    const total = items?.reduce((sum, item) => sum + (item.sale_value || 0), 0) || 0;
    console.log(`Total da OS ${orderId}: R$ ${total.toFixed(2)}`);
    return total;
  } catch (error) {
    console.error('Erro ao calcular total da OS:', error);
    throw error;
  }
} 