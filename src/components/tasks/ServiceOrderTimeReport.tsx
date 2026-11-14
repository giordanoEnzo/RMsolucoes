import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { FileText, Download, Clock, Search, X } from 'lucide-react';
import { ServiceOrderTask, TaskTimeLog } from '../../types/database';
import EmployeeSelectionDialog from '../employees/EmployeeSelectionDialog';

interface ServiceOrderTimeReportProps {
  serviceOrderId: string;
  orderNumber: string;
  clientName: string;
}

interface TaskWithTimeLogs extends ServiceOrderTask {
  assigned_worker?: { name: string };
  time_logs: (TaskTimeLog & { worker: { name: string } })[];
  total_hours: number;
}

export const ServiceOrderTimeReport: React.FC<ServiceOrderTimeReportProps> = ({
  serviceOrderId,
  orderNumber,
  clientName,
}) => {
  const [selectedWorker, setSelectedWorker] = useState<{ id: string, name: string } | null>(null);
  const [isEmployeeSelectionOpen, setIsEmployeeSelectionOpen] = useState(false);

  const { data: tasksWithTime = [], isLoading } = useQuery({
    queryKey: ['service-order-time-report', serviceOrderId],
    queryFn: async () => {
      // Buscar tarefas com logs de tempo
      const { data: tasks, error: tasksError } = await supabase
        .from('service_order_tasks')
        .select(`
          *,
          assigned_worker:profiles!assigned_worker_id(name),
          time_logs:task_time_logs(
            *,
            worker:profiles!worker_id(name)
          )
        `)
        .eq('service_order_id', serviceOrderId)
        .order('created_at', { ascending: true });

      if (tasksError) throw tasksError;

      return tasks;
    },
  });

  const getFilteredTasksWithHours = () => {
    return tasksWithTime.map(task => {
      const filteredLogs = selectedWorker
        ? task.time_logs.filter((log: any) => log.worker_id === selectedWorker.id)
        : task.time_logs;

      return {
        ...task,
        time_logs: filteredLogs,
        total_hours: filteredLogs?.reduce((total: number, log: any) =>
          total + (log.hours_worked || 0), 0) || 0
      };
    }).filter(task => task.total_hours > 0 || (selectedWorker ? false : true));
    // If filtering by worker, only show tasks where they logged time or are assigned? 
    // Let's keep tasks where they logged time OR if no filter show all tasks.
    // Actually, if filtering by worker, we mainly care about their contribution.
    // But maybe we want to keep context. Let's filter out tasks with 0 hours if a worker is selected.
  };

  const filteredTasks = getFilteredTasksWithHours();

  const getTotalServiceHours = () => {
    return filteredTasks.reduce((total, task) => total + task.total_hours, 0);
  };

  const getTotalEstimatedHours = () => {
    // If filtering by worker, estimated hours might not make sense to sum up simply?
    // But user wants to see "Efficiency".
    // Let's keep total estimated for context or maybe 0 if it gets confusing?
    // Usually estimated hours are per task, not per worker.
    // Let's just sum estimated hours of the displayed tasks.
    return filteredTasks.reduce((total, task) => total + (task.estimated_hours || 0), 0);
  };

  const generateFullReport = () => {
    const totalWorked = getTotalServiceHours();
    const totalEstimated = getTotalEstimatedHours();
    const variance = totalWorked - totalEstimated;

    let report = `RELATÓRIO DE HORAS${selectedWorker ? ` - ${selectedWorker.name.toUpperCase()}` : ''}\n`;
    report += `Ordem de Serviço: ${orderNumber}\n`;
    report += `Cliente: ${clientName}\n`;
    report += `Data do Relatório: ${new Date().toLocaleDateString('pt-BR')}\n`;
    report += `=====================================\n\n`;

    report += `RESUMO GERAL:\n`;
    if (!selectedWorker) {
      report += `Horas Estimadas: ${totalEstimated.toFixed(2)}h\n`;
    }
    report += `Horas Trabalhadas: ${totalWorked.toFixed(2)}h\n`;
    if (!selectedWorker) {
      report += `Variação: ${variance > 0 ? '+' : ''}${variance.toFixed(2)}h\n`;
      report += `Eficiência: ${totalEstimated > 0 ? ((totalEstimated / totalWorked) * 100).toFixed(1) : 'N/A'}%\n\n`;
    } else {
      report += `\n`;
    }

    report += `DETALHAMENTO POR TAREFA:\n`;
    report += `========================\n\n`;

    filteredTasks.forEach((task: any, index: number) => {
      report += `${index + 1}. ${task.title}\n`;
      if (!selectedWorker) {
        report += `   Responsável: ${task.assigned_worker?.name || 'Não atribuído'}\n`;
        report += `   Status: ${getStatusLabel(task.status)}\n`;
        report += `   Estimado: ${task.estimated_hours || 0}h\n`;
      }
      report += `   Trabalhado${selectedWorker ? ' por ' + selectedWorker.name : ''}: ${task.total_hours.toFixed(2)}h\n`;

      if (!selectedWorker && task.estimated_hours) {
        const taskVariance = task.total_hours - task.estimated_hours;
        report += `   Variação: ${taskVariance > 0 ? '+' : ''}${taskVariance.toFixed(2)}h\n`;
      }

      if (task.time_logs && task.time_logs.length > 0) {
        report += `   Sessões de Trabalho:\n`;
        task.time_logs.forEach((log: any, logIndex: number) => {
          if (log.hours_worked) {
            const date = new Date(log.start_time).toLocaleDateString('pt-BR');
            const startTime = new Date(log.start_time).toLocaleTimeString('pt-BR', {
              hour: '2-digit', minute: '2-digit'
            });
            const endTime = log.end_time ? new Date(log.end_time).toLocaleTimeString('pt-BR', {
              hour: '2-digit', minute: '2-digit'
            }) : 'Em andamento';

            report += `     ${logIndex + 1}. ${date} ${startTime}-${endTime} (${log.hours_worked.toFixed(2)}h)${!selectedWorker ? ` - ${log.worker.name}` : ''}\n`;
            if (log.description) {
              report += `        "${log.description}"\n`;
            }
          }
        });
      }
      report += `\n`;
    });

    // Download do relatório
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${selectedWorker ? selectedWorker.name.replace(/\s+/g, '-') + '-' : ''}${orderNumber.replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getStatusLabel = (status: string) => {
    const statusMap = {
      'pending': 'Pendente',
      'in_progress': 'Em Andamento',
      'completed': 'Concluída',
      'cancelled': 'Cancelada'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const priorityMap = {
      'low': 'Baixa',
      'medium': 'Média',
      'high': 'Alta'
    };
    return priorityMap[priority as keyof typeof priorityMap] || priority;
  };

  if (isLoading) {
    return <div>Carregando relatório...</div>;
  }

  const totalWorked = getTotalServiceHours();
  const totalEstimated = getTotalEstimatedHours();
  const variance = totalWorked - totalEstimated;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <span className="flex items-center gap-2">
            <FileText size={20} />
            Relatório de Horas - OS {orderNumber}
          </span>
          <div className="flex gap-2">
            <Button
              variant={selectedWorker ? "secondary" : "outline"}
              onClick={() => setIsEmployeeSelectionOpen(true)}
              className="flex items-center gap-2"
            >
              {selectedWorker ? (
                <>
                  <span className="truncate max-w-[150px]">{selectedWorker.name}</span>
                  <X
                    size={14}
                    className="ml-1 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedWorker(null);
                    }}
                  />
                </>
              ) : (
                <>
                  <Search size={16} />
                  Filtrar por Funcionário
                </>
              )}
            </Button>
            <Button onClick={generateFullReport} className="flex items-center gap-2">
              <Download size={16} />
              Baixar Relatório
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <EmployeeSelectionDialog
          open={isEmployeeSelectionOpen}
          onOpenChange={setIsEmployeeSelectionOpen}
          onSelect={(employee) => setSelectedWorker({ id: employee.id, name: employee.name })}
        />

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {selectedWorker ? '-' : `${totalEstimated.toFixed(1)}h`}
            </div>
            <div className="text-sm text-gray-500">Estimado</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {totalWorked.toFixed(1)}h
            </div>
            <div className="text-sm text-gray-500">Trabalhado</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {selectedWorker ? '-' : `${variance > 0 ? '+' : ''}${variance.toFixed(1)}h`}
            </div>
            <div className="text-sm text-gray-500">Variação</div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-sm">Resumo por Tarefa {selectedWorker && `(Filtrado: ${selectedWorker.name})`}</h4>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredTasks.length === 0 ? (
              <p className="text-gray-500 text-sm italic">Nenhum registro encontrado para este filtro.</p>
            ) : filteredTasks.map((task: any) => (
              <div key={task.id} className="bg-gray-50 p-3 rounded text-sm">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium">{task.title}</span>
                  <span className="font-mono text-green-600">
                    {task.total_hours.toFixed(2)}h
                  </span>
                </div>
                <div className="text-gray-600 text-xs">
                  {task.assigned_worker?.name || 'Não atribuído'} •
                  Estimado: {task.estimated_hours || 0}h
                  {task.estimated_hours && !selectedWorker && (
                    <span className={task.total_hours > task.estimated_hours ? 'text-red-600 ml-1' : 'text-green-600 ml-1'}>
                      ({task.total_hours > task.estimated_hours ? '+' : ''}{(task.total_hours - task.estimated_hours).toFixed(1)}h)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};