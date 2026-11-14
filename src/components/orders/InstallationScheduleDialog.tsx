import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../ui/dialog';
import { Calendar } from '../ui/calendar';
import { Button } from '../ui/button';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '../../integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { ServiceOrder } from '../../types/database';

interface InstallationScheduleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: ServiceOrder;
}

const InstallationScheduleDialog: React.FC<InstallationScheduleDialogProps> = ({
    open,
    onOpenChange,
    order,
}) => {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const queryClient = useQueryClient();

    const handleConfirm = async () => {
        if (!selectedDate) {
            toast.error('Selecione uma data.');
            return;
        }

        const formattedDate = selectedDate.toISOString().split('T')[0];

        const { error } = await supabase
            .from('service_orders')
            .update({
                status: 'awaiting_installation',
                service_start_date: formattedDate,
            })
            .eq('id', order.id);

        if (error) {
            toast.error('Erro ao agendar instalação');
        } else {
            toast.success('Instalação agendada!');
            queryClient.invalidateQueries({ queryKey: ['service-orders'] });
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Agendar Instalação: {order.order_number}</DialogTitle>
                </DialogHeader>
                <div className="flex justify-center">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        locale={ptBR}
                        className="rounded-md border"
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700 text-white">
                        Confirmar Agendamento
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default InstallationScheduleDialog;
