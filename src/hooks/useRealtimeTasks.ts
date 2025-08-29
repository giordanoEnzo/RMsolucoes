import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useRealtimeTasks = (serviceOrderId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`tasks-changes-${serviceOrderId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_order_tasks',
          filter: serviceOrderId ? `service_order_id=eq.${serviceOrderId}` : undefined
        },
        (payload) => {
          console.log('🔄 Tarefa alterada em tempo real:', payload);
          
          // Invalidar queries relacionadas às tarefas
          if (serviceOrderId) {
            queryClient.invalidateQueries({ queryKey: ['service-order-tasks', serviceOrderId] });
          } else {
            queryClient.invalidateQueries({ queryKey: ['service-order-tasks'] });
          }
          
          // Também invalidar queries de relatórios que dependem das tarefas
          queryClient.invalidateQueries({ queryKey: ['reports-open-services'] });
          queryClient.invalidateQueries({ queryKey: ['service-orders'] });
          
          // Invalidar queries específicas para MyTasks
          queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_materials'
        },
        (payload) => {
          console.log('🔄 Material de tarefa alterado em tempo real:', payload);
          
          // Invalidar queries relacionadas às tarefas quando materiais mudam
          if (serviceOrderId) {
            queryClient.invalidateQueries({ queryKey: ['service-order-tasks', serviceOrderId] });
          }
          queryClient.invalidateQueries({ queryKey: ['service-order-tasks'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_time_logs'
        },
        (payload) => {
          console.log('🔄 Log de tempo alterado em tempo real:', payload);
          
          // Invalidar queries relacionadas ao tempo das tarefas
          queryClient.invalidateQueries({ queryKey: ['task-time-logs'] });
          queryClient.invalidateQueries({ queryKey: ['service-order-time-report'] });
        }
      )
      .subscribe((status) => {
        console.log('📡 Status da conexão de tempo real das tarefas:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, serviceOrderId]);
};
