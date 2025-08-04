import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Budget, BudgetItem } from '@/types/database';
import { toast } from 'sonner';

export const useBudgets = (filters?: {
  search?: string;
  status?: string;
  clientName?: string;
  dateFrom?: string;
  dateTo?: string;
}) => {
  const queryClient = useQueryClient();

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budgets', filters],
    queryFn: async () => {
      let query = supabase
        .from('budgets')
        .select(`
          *,
          budget_items(*),
          created_by_user:profiles!created_by(name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.search) {
        query = query.or(`budget_number.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%`);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.clientName) {
        query = query.ilike('client_name', `%${filters.clientName}%`);
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lt('created_at', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as (Budget & {
        budget_items: BudgetItem[];
        created_by_user?: { name: string };
      })[];
    },
  });

  const createBudgetMutation = useMutation({
    mutationFn: async ({ budgetData, items }: {
      budgetData: Partial<Budget>;
      items: Partial<BudgetItem>[];
    }) => {
      const { data: budgetNumber, error: numberError } = await supabase.rpc('generate_budget_number');
      if (numberError) throw numberError;

      const { data: budget, error: budgetError } = await supabase
        .from('budgets')
        .insert({
          budget_number: budgetNumber,
          client_name: budgetData.client_name || '',
          client_contact: budgetData.client_contact || '',
          client_address: budgetData.client_address || '',
          description: budgetData.description || '',
          total_value: budgetData.total_value || 0,
          valid_until: budgetData.valid_until,
          client_id: budgetData.client_id,
          created_by: budgetData.created_by,
          status: budgetData.status || 'draft',
        })
        .select()
        .single();

      if (budgetError) throw budgetError;

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('budget_items')
          .insert(items.map(item => ({
            budget_id: budget.id,
            service_name: item.service_name || '',
            description: item.description,
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            total_price: item.total_price || 0,
            service_id: item.service_id,
          })));

        if (itemsError) throw itemsError;
      }

      return budget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Orçamento criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar orçamento: ' + error.message);
    },
  });

  const createOrderFromBudgetMutation = useMutation({
    mutationFn: async (budgetId: string) => {
      // Buscar o orçamento com seus itens
      const { data: budget, error: budgetError } = await supabase
        .from('budgets')
        .select(`
          *,
          budget_items(*)
        `)
        .eq('id', budgetId)
        .single();

      if (budgetError) throw budgetError;

      const baseOrderNumber = budget.budget_number.replace('ORC', 'OS');
      let orderNumber = baseOrderNumber;
      let count = 1;
      let exists = true;

      // Verifica se o número da OS já existe
      while (exists) {
        const { data: existing } = await supabase
          .from('service_orders')
          .select('id')
          .eq('order_number', orderNumber)
          .maybeSingle();

        if (!existing) {
          exists = false;
        } else {
          orderNumber = `${baseOrderNumber}-${count}`;
          count++;
        }
      }

      const { data: userData } = await supabase.auth.getUser();

      const { data: order, error: orderError } = await supabase
        .from('service_orders')
        .insert({
          order_number: orderNumber,
          client_name: budget.client_name,
          client_contact: budget.client_contact,
          client_address: budget.client_address,
          service_description: budget.description,
          sale_value: budget.total_value,
          status: 'pending', // Status inicial como 'pending'
          urgency: 'medium',
          budget_id: budgetId,
          opening_date: new Date().toISOString().split('T')[0],
          service_start_date: new Date().toISOString().split('T')[0],
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Transferir itens do orçamento para a OS
      if (budget.budget_items && budget.budget_items.length > 0) {
        const serviceOrderItems = budget.budget_items.map((item: any) => ({
          order_id: order.id,
          service_name: item.service_name,
          service_description: item.description || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          sale_value: item.total_price,
        }));

        const { error: itemsError } = await supabase
          .from('service_order_items')
          .insert(serviceOrderItems);

        if (itemsError) {
          console.error('Erro ao transferir itens:', itemsError);
          // Não vamos falhar se não conseguir transferir itens
        } else {
          console.log(`${serviceOrderItems.length} itens transferidos do orçamento para a OS`);
        }
      }

      // Atualizar status do orçamento
      await supabase
        .from('budgets')
        .update({ status: 'approved' })
        .eq('id', budgetId);

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      toast.success('OS criada com itens do orçamento!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar OS: ' + error.message);
    },
  });

  return {
    budgets,
    isLoading,
    createBudget: createBudgetMutation.mutate,
    createOrderFromBudget: createOrderFromBudgetMutation.mutate,
    isCreating: createBudgetMutation.isPending,
    isCreatingOrder: createOrderFromBudgetMutation.isPending,
  };
};
