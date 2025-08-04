import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ServiceOrder, Profile } from '@/types/database';
import { toast } from 'sonner';

// Gera número da OS no formato OS0001-1, OS0001-2, etc.
const getNextOrderNumber = async (): Promise<string> => {
  // 1. Pega a última OS criada para definir a base
  const { data: lastBaseData, error: lastBaseError } = await supabase
    .from('service_orders')
    .select('order_number')
    .order('created_at', { ascending: false })
    .limit(1);

  if (lastBaseError) throw new Error('Erro ao buscar última OS');

  const lastOrderNumber = lastBaseData?.[0]?.order_number || 'OS0000-0';
  const lastBase = lastOrderNumber.split('-')[0]; // ex: OS0001
  const lastNumber = parseInt(lastBase.replace('OS', ''), 10);
  const nextBaseNumber = lastNumber + 1;
  const newBase = `OS${String(nextBaseNumber).padStart(4, '0')}`;

  // 2. Busca todas as OS com esse número base
  const { data: existing, error: versionError } = await supabase
    .from('service_orders')
    .select('order_number')
    .ilike('order_number', `${newBase}-%`);

  if (versionError) throw new Error('Erro ao buscar versões da OS');

  // 3. Determina o próximo sufixo
  const versions = existing.map(os => {
    const parts = os.order_number.split('-');
    return parseInt(parts[1], 10);
  });

  const nextSuffix = versions.length > 0 ? Math.max(...versions) + 1 : 1;

  return `${newBase}-${nextSuffix}`;
};

export const useServiceOrders = () => {
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['service-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_orders')
        .select(`
          *,
          assigned_worker:profiles!assigned_worker_id(name),
          created_by_user:profiles!created_by(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data as (ServiceOrder & {
        assigned_worker?: { name: string };
        created_by_user?: { name: string };
      })[];
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: Partial<ServiceOrder>) => {
      const orderNumber = await getNextOrderNumber();

      const { data, error } = await supabase
        .from('service_orders')
        .insert({
          order_number: orderNumber,
          client_name: orderData.client_name || '',
          client_contact: orderData.client_contact || '',
          client_address: orderData.client_address || '',
          service_description: orderData.service_description || '',
          sale_value: orderData.sale_value || 0,
          status: 'pendente', // status inicial
          urgency: orderData.urgency || 'medium',
          assigned_worker_id: orderData.assigned_worker_id,
          deadline: orderData.deadline,
          client_id: orderData.client_id,
          opening_date: orderData.opening_date || new Date().toISOString(),
          created_by: orderData.created_by,
          service_start_date: orderData.service_start_date || null,
          service_end_date: orderData.service_end_date || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      toast.success('Ordem de serviço criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar ordem de serviço: ' + error.message);
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ServiceOrder> & { id: string }) => {
      const { data, error } = await supabase
        .from('service_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      toast.success('Ordem de serviço atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar ordem de serviço: ' + error.message);
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('service_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      toast.success('Ordem de serviço excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir ordem de serviço: ' + error.message);
    },
  });

  return {
    orders,
    isLoading,
    createOrder: createOrderMutation.mutate,
    updateOrder: updateOrderMutation.mutate,
    deleteOrder: deleteOrderMutation.mutate,
    isCreating: createOrderMutation.isPending,
    isUpdating: updateOrderMutation.isPending,
    isDeleting: deleteOrderMutation.isPending,
  };
};

export const useWorkers = () => {
  const { data: workers = [] } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('role', 'worker');

      if (error) throw error;
      return data as Profile[];
    },
  });

  return { workers };
};
