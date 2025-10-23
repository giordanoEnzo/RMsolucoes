import { supabase } from '../integrations/supabase/client';

export async function addTestItemsToOrder(orderId: string) {
  try {
    const testItems = [
      {
        order_id: orderId,
        service_name: 'Soldagem',
        service_description: 'Soldagem de peças metálicas',
        quantity: 2,
        unit_price: 50.00,
        sale_value: 100.00,
      },
      {
        order_id: orderId,
        service_name: 'Corte a Plasma',
        service_description: 'Corte de chapas de aço',
        quantity: 1,
        unit_price: 30.00,
        sale_value: 30.00,
      },
      {
        order_id: orderId,
        service_name: 'Pintura Industrial',
        service_description: 'Pintura anticorrosiva',
        quantity: 1,
        unit_price: 80.00,
        sale_value: 80.00,
      }
    ];

    const { data, error } = await supabase
      .from('service_order_items')
      .insert(testItems)
      .select();

    if (error) {
      console.error('Erro ao inserir itens de teste:', error);
      throw error;
    }

    console.log('Itens de teste adicionados à OS:', data);
    return data;
  } catch (error) {
    console.error('Erro ao adicionar itens de teste:', error);
    throw error;
  }
}

export async function checkOrderItems(orderId: string) {
  try {
    const { data, error } = await supabase
      .from('service_order_items')
      .select('*')
      .eq('order_id', orderId);

    if (error) {
      console.error('Erro ao buscar itens da OS:', error);
      throw error;
    }

    console.log('Itens encontrados na OS:', data);
    return data;
  } catch (error) {
    console.error('Erro ao verificar itens da OS:', error);
    throw error;
  }
}

// Nova função para testar se os itens aparecem na fatura
export async function testInvoiceItems(invoiceId: string) {
  try {
    console.log('=== TESTE DE ITENS NA FATURA ===');
    
    // 1. Buscar a fatura
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) {
      console.error('Erro ao buscar fatura:', invoiceError);
      return;
    }

    console.log('Fatura encontrada:', invoice.id);
    console.log('Ordens na fatura:', invoice.orders?.length || 0);

    if (invoice.orders && Array.isArray(invoice.orders)) {
      for (const order of invoice.orders) {
        console.log(`\n=== OS ${order.order_number} ===`);
        console.log('ID da OS:', order.id);
        
        // 2. Verificar se a OS tem itens
        if (order.items && Array.isArray(order.items)) {
          console.log('Itens na fatura (JSON):', order.items.length);
          order.items.forEach((item: any, index: number) => {
            console.log(`Item ${index + 1}:`, {
              service_name: item.service_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              sale_value: item.sale_value
            });
          });
        } else {
          console.log('Nenhum item encontrado na fatura (JSON)');
        }

        // 3. Buscar itens diretamente da tabela service_order_items
        const { data: itemsFromTable, error: itemsError } = await supabase
          .from('service_order_items')
          .select('*')
          .eq('order_id', order.id);

        if (itemsError) {
          console.error('Erro ao buscar itens da tabela:', itemsError);
        } else {
          console.log('Itens na tabela service_order_items:', itemsFromTable?.length || 0);
          if (itemsFromTable) {
            itemsFromTable.forEach((item: any, index: number) => {
              console.log(`Item ${index + 1} (tabela):`, {
                service_name: item.service_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                sale_value: item.sale_value
              });
            });
          }
        }
      }
    }

    console.log('=== FIM DO TESTE ===');
  } catch (error) {
    console.error('Erro no teste:', error);
  }
} 