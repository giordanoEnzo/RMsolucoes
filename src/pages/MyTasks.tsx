import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Clock, AlertCircle, User, Filter, Loader2, Plus } from 'lucide-react';
import { ServiceOrderTask, TaskStatus } from '@/types/database';
import ClientLogo from '@/components/ui/client-logo';
import { TaskTimeTracker } from '@/components/tasks/TaskTimeTracker';
import { MaterialSelector } from '@/components/orders/MaterialSelector';


interface TaskWithOrder extends ServiceOrderTask {
  service_orders: {
    id: string;
    order_number: string;
    client_name: string;
    status: string;
    urgency: string;
  };
  assigned_worker?: { name: string };
}

const MyTasks = () => {
  const { profile } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [selectedTaskIdForMaterial, setSelectedTaskIdForMaterial] = useState<string | null>(null);

  const { data: tasks = [], isLoading, error, refetch } = useQuery({
    queryKey: ['my-tasks', profile?.id],
    queryFn: async (): Promise<TaskWithOrder[]> => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('service_order_tasks')
        .select(`
          *,
          service_orders!inner(
            id,
            order_number,
            client_name,
            status,
            urgency
          ),
          assigned_worker:profiles!assigned_worker_id(name)
        `)
        .eq('assigned_worker_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const getFilteredTasks = () => {
    let filtered = tasks;
    if (statusFilter !== 'all') filtered = filtered.filter(t => t.status === statusFilter);
    if (priorityFilter !== 'all') filtered = filtered.filter(t => t.priority === priorityFilter);
    return filtered;
  };

  const getStatusColor = (status: string) => ({
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }[status] || 'bg-gray-100 text-gray-800');

  const getPriorityColor = (priority: string) => ({
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  }[priority] || 'bg-gray-100 text-gray-800');

  const getStatusLabel = (status: string) => ({
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    completed: 'Concluída',
    cancelled: 'Cancelada',
  }[status] || status);

  const getPriorityLabel = (priority: string) => ({
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
  }[priority] || priority);

  const getUrgencyLabel = (urgency: string) => ({
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
  }[urgency] || urgency);

  const handleTaskStatusUpdate = async (taskId: string, newStatus: TaskStatus, orderId: string) => {
    await supabase.from('service_order_tasks').update({ status: newStatus }).eq('id', taskId);

    if (newStatus === 'completed') {
      const { data: remaining } = await supabase
        .from('service_order_tasks')
        .select('id')
        .eq('service_order_id', orderId)
        .neq('status', 'completed');

      if (remaining?.length === 0) {
        await supabase.from('service_orders').update({ status: 'quality_control' }).eq('id', orderId);
      }
    }

    refetch();
  };

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTask(expandedTask === taskId ? null : taskId);
  };

  if (isLoading) {
    return <div className="p-6 flex justify-center"><Loader2 className="animate-spin mr-2" />Carregando tarefas...</div>;
  }

  if (!profile || profile.role !== 'worker') {
    return (
      <div className="p-6">
        <Card className="text-center py-12">
          <CardContent>
            <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Acesso Restrito</p>
            <p className="text-sm mt-1">Esta página é apenas para operários.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredTasks = getFilteredTasks();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Minhas Tarefas</h1>
        <p className="text-slate-600 mt-1">Gerencie todas as suas tarefas atribuídas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter size={20} />Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Prioridade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredTasks.length > 0 ? filteredTasks.map((task) => (
          <Card key={task.id}>
            <CardHeader>
              <div className="flex justify-between">
                <div className="flex items-start gap-3">
                  <ClientLogo clientName={task.service_orders.client_name} size="md" />
                  <div>
                    <CardTitle className="text-lg">{task.title}</CardTitle>
                    <p className="text-sm text-slate-600">
                      OS {task.service_orders.order_number} - {task.service_orders.client_name}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Badge className={getStatusColor(task.status)}>{getStatusLabel(task.status)}</Badge>
                  <Badge className={getPriorityColor(task.priority)}>{getPriorityLabel(task.priority)}</Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {task.description && (
                <div className="bg-slate-50 p-3 rounded-md text-sm">{task.description}</div>
              )}

              <div className="text-sm text-slate-600 space-y-1">
                {task.estimated_hours && (
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>{task.estimated_hours}h estimadas</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <User size={16} />
                  <span>Urgência da OS: {getUrgencyLabel(task.service_orders.urgency)}</span>
                </div>
              </div>

              <div className="flex gap-2 justify-between items-center">
                <span className="text-xs text-slate-500">Criada em {new Date(task.created_at).toLocaleDateString('pt-BR')}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleTaskExpand(task.id)}>
                    <Clock className="h-4 w-4 mr-1" />
                    {expandedTask === task.id ? 'Ocultar Timer' : 'Mostrar Timer'}
                  </Button>

                  {task.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600"
                      onClick={() => handleTaskStatusUpdate(task.id, 'in_progress', task.service_orders.id)}
                    >
                      Iniciar
                    </Button>
                  )}

                  {task.status === 'in_progress' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600"
                        onClick={() => handleTaskStatusUpdate(task.id, 'completed', task.service_orders.id)}
                      >
                        Concluir
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedTaskIdForMaterial(task.id)}
                      >
                        <Plus size={14} className="mr-1" />
                        Materiais
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {expandedTask === task.id && (
                <TaskTimeTracker
                  taskId={task.id}
                  taskTitle={task.title}
                  assignedWorkerId={task.assigned_worker_id || undefined}
                  assignedWorkerName={task.assigned_worker?.name}
                  estimatedHours={task.estimated_hours || undefined}
                  taskStatus={task.status}
                />
              )}
            </CardContent>
          </Card>
        )) : (
          <Card className="text-center py-12">
            <CardContent>
              <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma tarefa encontrada</p>
              <p className="text-sm mt-1">Tente ajustar os filtros ou aguarde atribuição de novas tarefas</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de materiais por tarefa */}
      <Dialog open={!!selectedTaskIdForMaterial} onOpenChange={() => setSelectedTaskIdForMaterial(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Selecionar Materiais da Tarefa</DialogTitle>
          </DialogHeader>
          {selectedTaskIdForMaterial && (
            <MaterialSelector
              serviceOrderId={filteredTasks.find(t => t.id === selectedTaskIdForMaterial)?.service_orders.id || ''}
              taskId={selectedTaskIdForMaterial}
              open={true}
              onClose={() => setSelectedTaskIdForMaterial(null)}
              onConfirm={() => setSelectedTaskIdForMaterial(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyTasks;
