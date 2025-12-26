import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, Edit, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../integrations/supabase/client';
import { useServiceOrderTasks } from '../../hooks/useServiceOrderTasks';
import { TaskPriority, ServiceOrderTask } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import EmployeeSelectionDialog from '../employees/EmployeeSelectionDialog';

interface EditTaskDialogProps {
  task: ServiceOrderTask;
  serviceOrderId: string;
  children?: React.ReactNode;
}

interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  estimated_hours: number;
  deadline: Date | undefined;
  assigned_worker_id: string;
}

export const EditTaskDialog: React.FC<EditTaskDialogProps> = ({ task, serviceOrderId, children }) => {
  const [open, setOpen] = useState(false);
  const [deadline, setDeadline] = useState<Date | undefined>(
    task.deadline ? new Date(task.deadline) : undefined
  );
  const [isEmployeeSelectionOpen, setIsEmployeeSelectionOpen] = useState(false);
  const { updateTask, isUpdating } = useServiceOrderTasks(serviceOrderId);
  const { user, profile } = useAuth();

  // ... (keep query and useForm)

  const { data: workers = [] } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role')
        .in('role', ['admin', 'manager', 'worker'])
        .order('role', { ascending: false })
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const { register, handleSubmit, reset, setValue, watch } = useForm<TaskFormData>({
    defaultValues: {
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      estimated_hours: task.estimated_hours || 0,
      assigned_worker_id: task.assigned_worker_id || '',
    }
  });

  // Atualiza o formulário quando a tarefa muda
  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        estimated_hours: task.estimated_hours || 0,
        assigned_worker_id: task.assigned_worker_id || '',
      });
      setDeadline(task.deadline ? new Date(task.deadline) : undefined);
    }
  }, [task, reset]);

  const onSubmit = (data: TaskFormData) => {
    updateTask({
      id: task.id,
      title: data.title,
      description: data.description,
      priority: data.priority,
      estimated_hours: data.estimated_hours,
      deadline: deadline ? deadline.toISOString().split('T')[0] : undefined,
      assigned_worker_id: data.assigned_worker_id,
    });

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Edit size={14} className="mr-1" />
            Editar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Tarefa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              {...register('title', { required: true })}
              placeholder="Digite o título da tarefa"
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Digite a descrição da tarefa"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prioridade</Label>
              <Select
                value={watch('priority')}
                onValueChange={(value: TaskPriority) => setValue('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="estimated_hours">Horas Estimadas</Label>
              <Input
                id="estimated_hours"
                type="number"
                step="0.5"
                {...register('estimated_hours', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Responsável</Label>
              {profile && ['admin', 'manager'].includes(profile.role) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setValue('assigned_worker_id', profile.id)}
                  className="text-sm"
                >
                  Atribuir a mim
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Select
                value={watch('assigned_worker_id')}
                onValueChange={(value) => setValue('assigned_worker_id', value)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent>
                  {workers.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.name} ({worker.role === 'admin' ? 'Administrador' : worker.role === 'manager' ? 'Gerente' : 'Operário'})
                      {worker.id === profile?.id && ' (Você)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setIsEmployeeSelectionOpen(true)}
                title="Buscar funcionário"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <EmployeeSelectionDialog
              open={isEmployeeSelectionOpen}
              onOpenChange={setIsEmployeeSelectionOpen}
              onSelect={(employee) => setValue('assigned_worker_id', employee.id)}
            />
          </div>

          <div>
            <Label>Prazo</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadline ? format(deadline, "dd/MM/yyyy") : "Selecionar prazo"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={setDeadline}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

