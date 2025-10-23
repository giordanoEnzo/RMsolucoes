import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';
import { ServiceOrderTask, TaskTimeLog, ServiceOrderImage } from '../types/database';

// Hook para buscar e gerenciar tarefas da ordem de serviço
export const useServiceOrderTasks = (serviceOrderId: string) => {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['service-order-tasks', serviceOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_order_tasks')
        .select(`
          *,
          assigned_worker:profiles!assigned_worker_id(name),
          created_by_user:profiles!created_by(name)
        `)
        .eq('service_order_id', serviceOrderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (ServiceOrderTask & {
        assigned_worker?: { name: string };
        created_by_user?: { name: string };
      })[];
    },
  });

  const createTask = useMutation({
    mutationFn: async (taskData: Partial<ServiceOrderTask>) => {
      const { data, error } = await supabase
        .from('service_order_tasks')
        .insert({
          service_order_id: serviceOrderId,
          title: taskData.title || '',
          description: taskData.description,
          assigned_worker_id: taskData.assigned_worker_id,
          status: taskData.status || 'pending',
          priority: taskData.priority || 'medium',
          estimated_hours: taskData.estimated_hours,
          created_by: taskData.created_by,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['service-order-tasks', serviceOrderId]);
      toast.success('Tarefa criada com sucesso!');
    },
    onError: err => toast.error('Erro ao criar tarefa: ' + err.message),
  });

  const updateTask = useMutation({
    mutationFn: async (task: Partial<ServiceOrderTask> & { id: string }) => {
      const { data, error } = await supabase
        .from('service_order_tasks')
        .update(task)
        .eq('id', task.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['service-order-tasks', serviceOrderId]);
      toast.success('Tarefa atualizada com sucesso!');
    },
    onError: err => toast.error('Erro ao atualizar tarefa: ' + err.message),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('service_order_tasks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['service-order-tasks', serviceOrderId]);
      toast.success('Tarefa excluída com sucesso!');
    },
    onError: err => toast.error('Erro ao excluir tarefa: ' + err.message),
  });

  return {
    tasks,
    isLoading,
    createTask: createTask.mutate,
    updateTask: updateTask.mutate,
    deleteTask: deleteTask.mutate,
    isCreating: createTask.isPending,
    isUpdating: updateTask.isPending,
    isDeleting: deleteTask.isPending,
  };
};

// Hook para controle de tempo das tarefas
export const useTimeTracking = (taskId: string) => {
  const queryClient = useQueryClient();

  const { data: timeLogs = [] } = useQuery({
    queryKey: ['task-time-logs', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_time_logs')
        .select(`*, worker:profiles!worker_id(name)`)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (TaskTimeLog & { worker: { name: string } })[];
    },
  });

  const startTimer = useMutation({
    mutationFn: async (workerId: string) => {
      const { data, error } = await supabase
        .from('task_time_logs')
        .insert({
          task_id: taskId,
          worker_id: workerId,
          start_time: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      toast.success('Cronômetro iniciado!');
      queryClient.invalidateQueries(['task-time-logs', taskId]);

      // 1) buscar service_order_id da tarefa
      const { data: task, error: taskErr } = await supabase
        .from('service_order_tasks')
        .select('service_order_id')
        .eq('id', taskId)
        .single();
      if (taskErr || !task?.service_order_id) {
        console.error('Erro obtendo ID da OS:', taskErr);
        return;
      }

      // 2) atualizar status da OS para in_progress
      const { error } = await supabase
        .from('service_orders')
        .update({ status: 'in_progress' })
        .eq('id', task.service_order_id)
        .select();
      if (error) console.error('Erro ao atualizar OS para produção:', error);

      queryClient.invalidateQueries(['service-orders']);
    },
  });

  const stopTimer = useMutation({
    mutationFn: async ({ id, description }: { id: string; description?: string }) => {
      // buscar start_time
      const { data: log, error: fetchErr } = await supabase
        .from('task_time_logs')
        .select('start_time')
        .eq('id', id)
        .single();
      if (fetchErr) throw fetchErr;

      const endTime = new Date();
      const hoursWorked = (endTime.getTime() - new Date(log.start_time).getTime()) / 3600000;

      // atualizar registro
      const { data, error } = await supabase
        .from('task_time_logs')
        .update({ end_time: endTime.toISOString(), description, hours_worked: hoursWorked })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (_, { id }) => {
      toast.success('Tempo registrado com sucesso!');
      queryClient.invalidateQueries(['task-time-logs', taskId]);

      // 1) buscar service_order_id
      const { data: task, error: taskErr } = await supabase
        .from('service_order_tasks')
        .select('service_order_id')
        .eq('id', taskId)
        .single();
      if (taskErr || !task?.service_order_id) {
        console.error('Erro obtendo ID da OS ao parar:', taskErr);
        return;
      }
      const serviceOrderId = task.service_order_id;

      // 2) buscar todas as tasks da OS
      const { data: allTasks } = await supabase
        .from('service_order_tasks')
        .select('id, status')
        .eq('service_order_id', serviceOrderId);

      // 3) determinar novo status
      let hasActive = false;
      let allCompleted = true;

      for (const t of allTasks || []) {
        const { data: logs } = await supabase
          .from('task_time_logs')
          .select('end_time')
          .eq('task_id', t.id);
        if (logs?.some(l => l.end_time === null)) hasActive = true;
        if (t.status !== 'completed') allCompleted = false;
      }

      let newStatus = allCompleted
        ? 'quality_control'
        : hasActive
        ? 'in_progress'
        : 'stopped';

      // 4) atualizar status da OS
      const { error } = await supabase
        .from('service_orders')
        .update({ status: newStatus })
        .eq('id', serviceOrderId)
        .select();
      if (error) console.error(`Erro ao atualizar OS para ${newStatus}:`, error);

      queryClient.invalidateQueries(['service-orders']);
    },
  });

  return {
    timeLogs,
    startTimer: startTimer.mutate,
    stopTimer: stopTimer.mutate,
    isStarting: startTimer.isPending,
    isStopping: stopTimer.isPending,
  };
};

// Hook para gerenciar imagens vinculadas a ordem ou tarefa
export const useServiceOrderImages = (serviceOrderId?: string, taskId?: string) => {
  const queryClient = useQueryClient();

  const { data: images = [] } = useQuery({
    queryKey: ['service-order-images', serviceOrderId, taskId],
    queryFn: async () => {
      let q = supabase
        .from('service_order_images')
        .select(`*, uploaded_by_user:profiles!uploaded_by(name)`);

      if (serviceOrderId) q = q.eq('service_order_id', serviceOrderId);
      if (taskId) q = q.eq('task_id', taskId);

      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const uploadImage = useMutation({
    mutationFn: async ({ file, description }: { file: File; description?: string }) => {
      const ext = file.name.split('.').pop();
      const path = `${serviceOrderId || taskId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('service-order-images')
        .upload(path, file);
      if (upErr) throw upErr;

      const { data, error } = await supabase
        .from('service_order_images')
        .insert({
          service_order_id: serviceOrderId,
          task_id: taskId,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id!,
          description,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['service-order-images', serviceOrderId, taskId]);
      toast.success('Imagem enviada com sucesso!');
    },
    onError: err => toast.error('Erro ao enviar imagem: ' + err.message),
  });

  return { images, uploadImage: uploadImage.mutate, isUploading: uploadImage.isPending };
};
