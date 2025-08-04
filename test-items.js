// Script de teste para inserir itens de exemplo
// Execute este script no console do navegador na página da aplicação

// Primeiro, pegue o ID de uma ordem de serviço existente
const testInsertItems = async () => {
  try {
    // 1. Buscar uma ordem de serviço existente
    const { data: orders, error: ordersError } = await supabase
      .from('service_orders')
      .select('id, order_number')
      .limit(1);

    if (ordersError) {
      console.error('Erro ao buscar ordens:', ordersError);
      return;
    }

    if (!orders || orders.length === 0) {
      console.log('Nenhuma ordem de serviço encontrada');
      return;
    }

    const orderId = orders[0].id;
    console.log('Usando ordem:', orders[0].order_number, 'ID:', orderId);

    // 2. Inserir itens de teste
    const { data: items, error: itemsError } = await supabase
      .from('service_order_items')
      .insert([
        {
          order_id: orderId,
          service_name: 'Serralheria',
          service_description: 'Portão de ferro 3x2m',
          quantity: 1,
          unit_price: 500.00,
          sale_value: 500.00,
        },
        {
          order_id: orderId,
          service_name: 'Instalação',
          service_description: 'Montagem e instalação do portão',
          quantity: 1,
          unit_price: 150.00,
          sale_value: 150.00,
        },
        {
          order_id: orderId,
          service_name: 'Material',
          service_description: 'Fechadura e dobradiças',
          quantity: 1,
          unit_price: 80.00,
          sale_value: 80.00,
        }
      ])
      .select();

    if (itemsError) {
      console.error('Erro ao inserir itens:', itemsError);
      return;
    }

    console.log('Itens inseridos com sucesso:', items);

    // 3. Verificar se os itens foram inseridos
    const { data: checkItems, error: checkError } = await supabase
      .from('service_order_items')
      .select('*')
      .eq('order_id', orderId);

    if (checkError) {
      console.error('Erro ao verificar itens:', checkError);
      return;
    }

    console.log('Itens encontrados:', checkItems);

  } catch (error) {
    console.error('Erro geral:', error);
  }
};

// Executar o teste
testInsertItems(); 