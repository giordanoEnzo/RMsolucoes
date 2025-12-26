import React, { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ServiceOrder } from '../../types/database';
import { createInvoice } from '../../services/invoiceService';
import { supabase } from '../../integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

interface InvoiceGenerationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: ServiceOrder;
}

const InvoiceGenerationDialog: React.FC<InvoiceGenerationDialogProps> = ({
    open,
    onOpenChange,
    order,
}) => {
    const [valoresExtras, setValoresExtras] = useState<{ descricao: string; valor: string }[]>([
        { descricao: '', valor: '' }
    ]);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const adicionarItemExtra = () => {
        setValoresExtras((old) => [...old, { descricao: '', valor: '' }]);
    };

    const atualizarItemExtra = (
        index: number,
        campo: 'descricao' | 'valor',
        valor: string
    ) => {
        setValoresExtras((old) =>
            old.map((item, idx) => (idx === index ? { ...item, [campo]: valor } : item))
        );
    };

    const handleGerarFatura = async () => {
        const saleValue = order.sale_value || 0;

        const extrasValidos = valoresExtras
            .filter((item) => item.descricao.trim() !== '')
            .map((item) => ({
                description: item.descricao.trim(),
                value: item.valor.trim() !== '' ? parseFloat(item.valor.replace(',', '.')) : 0,
            }));

        const totalExtrasSomados = extrasValidos.reduce((acc, item) => acc + item.value, 0);
        const totalFinal = saleValue + totalExtrasSomados;

        const startDate = order.service_start_date || (order.opening_date ? order.opening_date.split('T')[0] : '');
        const endDate = new Date().toISOString().split('T')[0];

        const invoicePayload = {
            client_id: order.client_id, // Ensure this exists on Type, handled by parent usually but simple logic here
            client_name: order.client_name,
            start_date: startDate,
            end_date: endDate,
            extras: extrasValidos,
            orders: [
                {
                    id: order.id,
                    order_number: order.order_number,
                    sale_value: saleValue,
                    total_hours: order.total_hours || 0,
                },
            ],
            total_value: totalFinal,
            total_time: order.total_hours || 0,
        };

        const { error } = await createInvoice(invoicePayload);

        if (error) {
            toast.error('Erro ao gerar fatura: ' + error.message);
            return;
        }

        await supabase
            .from('service_orders')
            .update({ status: 'invoiced' })
            .eq('id', order.id);

        toast.success('Fatura gerada com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['service-orders'] });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        onOpenChange(false);
        navigate('/invoices');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Gerar Fatura: {order.order_number}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-slate-50 p-3 rounded text-sm">
                        <p><strong>Cliente:</strong> {order.client_name}</p>
                        <p><strong>Valor OS:</strong> R$ {order.sale_value?.toFixed(2)}</p>
                    </div>

                    <div>
                        <Label>Observações / Extras</Label>
                        {valoresExtras.map((item, idx) => (
                            <div key={idx} className="flex gap-2 mt-2">
                                <Input
                                    placeholder="Descrição"
                                    value={item.descricao}
                                    onChange={(e) => atualizarItemExtra(idx, 'descricao', e.target.value)}
                                    className="flex-1"
                                />
                                <Input
                                    placeholder="Valor (R$)"
                                    value={item.valor}
                                    onChange={(e) => atualizarItemExtra(idx, 'valor', e.target.value)}
                                    className="w-24"
                                />
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="link"
                            onClick={adicionarItemExtra}
                            className="text-blue-600 px-0"
                        >
                            + Adicionar item
                        </Button>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleGerarFatura} className="bg-green-600 hover:bg-green-700 text-white">
                        Confirmar e Gerar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default InvoiceGenerationDialog;
