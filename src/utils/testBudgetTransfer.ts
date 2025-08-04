import { supabase } from '@/integrations/supabase/client';

export async function testBudgetTransfer(budgetId: string) {
  try {
    console.log('=== TESTE DE TRANSFERÊNCIA DE ORÇAMENTO ===');
    
    // 1. Verificar se o orçamento existe e tem itens
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .select(`
        *,
        budget_items(*)
      `)
      .eq('id', budgetId)
      .single();

    if (budgetError) {
      console.error('Erro ao buscar orçamento:', budgetError);
      return;
    }

    console.log('Orçamento encontrado:', budget.budget_number);
    console.log('Itens do orçamento:', budget.budget_items?.length || 0);
    
    if (budget.budget_items) {
      budget.budget_items.forEach((item: any, index: number) => {
        console.log(`Item ${index + 1}:`, {
          service_name: item.service_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        });
      });
    }

    // 2. Verificar se existe uma OS relacionada
    const { data: orders, error: ordersError } = await supabase
      .from('service_orders')
      .select('*')
      .eq('budget_id', budgetId);

    if (ordersError) {
      console.error('Erro ao buscar OSs:', ordersError);
      return;
    }

    console.log('OSs encontradas:', orders?.length || 0);

    if (orders && orders.length > 0) {
      for (const order of orders) {
        console.log(`\n=== OS ${order.order_number} ===`);
        
        // 3. Verificar itens da OS
        const { data: orderItems, error: itemsError } = await supabase
          .from('service_order_items')
          .select('*')
          .eq('order_id', order.id);

        if (itemsError) {
          console.error('Erro ao buscar itens da OS:', itemsError);
          continue;
        }

        console.log('Itens na OS:', orderItems?.length || 0);
        
        if (orderItems) {
          orderItems.forEach((item: any, index: number) => {
            console.log(`Item ${index + 1}:`, {
              service_name: item.service_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              sale_value: item.sale_value
            });
          });
        }

                 // 4. Verificar status da OS
         console.log('Status da OS:', order.status);
      }
    }

    console.log('=== FIM DO TESTE ===');
  } catch (error) {
    console.error('Erro no teste:', error);
  }
}

export async function addTestItemsToBudget(budgetId: string) {
  try {
    const testItems = [
      {
        budget_id: budgetId,
        service_name: 'Soldagem Industrial',
        description: 'Soldagem de estruturas metálicas',
        quantity: 2,
        unit_price: 75.00,
        total_price: 150.00,
      },
      {
        budget_id: budgetId,
        service_name: 'Corte a Plasma',
        description: 'Corte de chapas de aço',
        quantity: 1,
        unit_price: 45.00,
        total_price: 45.00,
      },
      {
        budget_id: budgetId,
        service_name: 'Pintura Epóxi',
        description: 'Pintura anticorrosiva industrial',
        quantity: 1,
        unit_price: 120.00,
        total_price: 120.00,
      }
    ];

    const { data, error } = await supabase
      .from('budget_items')
      .insert(testItems)
      .select();

    if (error) {
      console.error('Erro ao inserir itens de teste:', error);
      throw error;
    }

    console.log('Itens de teste adicionados ao orçamento:', data);
    return data;
  } catch (error) {
    console.error('Erro ao adicionar itens de teste:', error);
    throw error;
  }
} 