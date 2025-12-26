import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, Briefcase, User, CalendarClock, Search, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '../ui/button';
import EmployeeSelectionDialog from '../employees/EmployeeSelectionDialog';

interface ActiveTask {
    id: string;
    title: string;
    updated_at: string;
    worker?: {
        id: string; // Ensure ID is selected
        name: string;
        role: string;
    };
    service_order?: {
        order_number: string;
        client_name: string;
    };
}

const CurrentActivities = () => {
    const [selectedWorker, setSelectedWorker] = useState<{ id: string, name: string } | null>(null);
    const [isEmployeeSelectionOpen, setIsEmployeeSelectionOpen] = useState(false);

    const { data: activeTasks, isLoading } = useQuery({
        queryKey: ['active-tasks'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('service_order_tasks')
                .select(`
          id,
          title,
          updated_at,
          worker:profiles!assigned_worker_id(id, name, role),
          service_order:service_orders(order_number, client_name)
        `)
                .eq('status', 'in_progress');

            if (error) throw error;
            return data as unknown as ActiveTask[];
        },
        refetchInterval: 30000, // Refresh every 30s
    });

    const filteredTasks = selectedWorker
        ? activeTasks?.filter(task => task.worker?.id === selectedWorker.id)
        : activeTasks;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-6">
                <Loader2 className="animate-spin mr-2" />
                <span>Carregando atividades em tempo real...</span>
            </div>
        );
    }

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-blue-600" />
                        Atividades em Execução Agora
                    </div>
                    <Button
                        variant={selectedWorker ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setIsEmployeeSelectionOpen(true)}
                        className="flex items-center gap-2 text-sm"
                    >
                        {selectedWorker ? (
                            <>
                                <span className="truncate max-w-[100px]">{selectedWorker.name}</span>
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
                                <Search size={14} />
                                Filtrar
                            </>
                        )}
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <EmployeeSelectionDialog
                    open={isEmployeeSelectionOpen}
                    onOpenChange={setIsEmployeeSelectionOpen}
                    onSelect={(employee) => setSelectedWorker({ id: employee.id, name: employee.name })}
                />

                {!filteredTasks || filteredTasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-slate-50 rounded-lg border border-dashed">
                        <User className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p>
                            {selectedWorker
                                ? `Nenhuma atividade encontrada para ${selectedWorker.name}.`
                                : "Nenhum funcionário está executando tarefas neste momento."}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredTasks.map((task) => (
                            <div
                                key={task.id}
                                className="flex flex-col p-4 bg-white border border-l-4 border-l-green-500 rounded shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs uppercase">
                                            {task.worker?.name.substring(0, 2)}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 leading-tight">{task.worker?.name}</h4>
                                            <span className="text-xs text-gray-500 capitalize">{
                                                task.worker?.role === 'admin' ? 'Administrador' :
                                                    task.worker?.role === 'manager' ? 'Gerente' : 'Operário'
                                            }</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-2 space-y-1">
                                    <p className="font-medium text-gray-800">{task.title}</p>
                                    <p className="text-sm text-gray-600">
                                        <span className="font-semibold">OS:</span> {task.service_order?.order_number} - {task.service_order?.client_name}
                                    </p>
                                </div>

                                <div className="mt-4 pt-3 border-t flex items-center text-xs text-gray-500">
                                    <CalendarClock className="h-3 w-3 mr-1" />
                                    Iniciada {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true, locale: ptBR })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default CurrentActivities;
