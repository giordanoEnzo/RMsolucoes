import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
    Eye,
    Edit,
    Trash2,
    ListTodo,
    CheckCircle,
    XCircle,
    Calendar as CalendarIcon,
    Clock,
    User,
    DollarSign
} from 'lucide-react';
import { ServiceOrder } from '../../types/database';
import { parseISO, isValid } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// Dialogs
import InvoiceGenerationDialog from './InvoiceGenerationDialog';
import InstallationScheduleDialog from './InstallationScheduleDialog';

interface OrdersTableProps {
    orders: (ServiceOrder & { assigned_worker?: { name: string } })[];
    onEdit: (order: any) => void;
    onDelete: (order: any) => void;
    onView: (order: any) => void;
}

const OrdersTable: React.FC<OrdersTableProps> = ({ orders, onEdit, onDelete, onView }) => {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const canEdit = profile && ['admin', 'manager', 'worker'].includes(profile.role);
    const canDelete = profile && ['admin', 'manager'].includes(profile.role);

    // Dialog States
    const [invoiceOrder, setInvoiceOrder] = useState<ServiceOrder | null>(null);
    const [installOrder, setInstallOrder] = useState<ServiceOrder | null>(null);

    // Helpers
    const getStatusColor = (status: string) =>
    ({
        received: 'bg-blue-100 text-blue-800',
        pending: 'bg-yellow-100 text-yellow-800',
        pendente: 'bg-yellow-100 text-yellow-800', // Support PT
        planning: 'bg-purple-100 text-purple-800',
        in_progress: 'bg-orange-100 text-orange-800',
        quality_control: 'bg-pink-100 text-pink-800',
        ready_for_shipment: 'bg-cyan-100 text-cyan-800',
        in_transit: 'bg-indigo-100 text-indigo-800',
        delivered: 'bg-teal-100 text-teal-800',
        invoiced: 'bg-gray-100 text-gray-800',
        completed: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
        on_hold: 'bg-yellow-200 text-yellow-900',
        stopped: 'bg-red-200 text-red-900',
        ready_for_pickup: 'bg-lime-100 text-lime-800',
        awaiting_installation: 'bg-blue-100 text-blue-800',
        to_invoice: 'bg-gray-200 text-gray-900',
    }[status] || 'bg-white/90 text-slate-800 border-slate-200 border'); // Default high contrast

    const getStatusText = (status: string) =>
    ({
        received: 'Recebida',
        pending: 'Pendente',
        pendente: 'Pendente', // Support PT
        planning: 'Planejamento',
        in_progress: 'Em Andamento',
        quality_control: 'CQ',
        ready_for_shipment: 'Pronta p/ Envio',
        in_transit: 'Em Trânsito',
        delivered: 'Entregue',
        invoiced: 'Faturada',
        completed: 'Concluída',
        cancelled: 'Cancelada',
        on_hold: 'Em espera',
        stopped: 'Paralisada',
        ready_for_pickup: 'Ag. Retirada',
        awaiting_installation: 'Ag. Instalação',
        to_invoice: 'Faturar',
        finalized: 'Concluída',
    }[status] || status || 'Sem Status');

    const formatDate = (dateString: string | Date | null | undefined) => {
        if (!dateString) return '-';
        let date: Date;
        if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            date = parseISO(dateString);
        } else {
            date = new Date(dateString);
        }
        if (!isValid(date)) return '-';
        return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(date);
    };

    // Workflow Actions
    const handleApproveQC = async (id: string) => {
        const { error } = await supabase.from('service_orders').update({ status: 'ready_for_pickup' }).eq('id', id);
        if (!error) { toast.success('CQ Aprovado'); queryClient.invalidateQueries({ queryKey: ['service-orders'] }); }
    };

    const handleRejectQC = async (id: string) => {
        const { error } = await supabase.from('service_orders').update({ status: 'in_progress' }).eq('id', id);
        if (!error) { toast.success('CQ Reprovado'); queryClient.invalidateQueries({ queryKey: ['service-orders'] }); }
    };

    const handleConfirmPickup = async (id: string) => {
        const { error } = await supabase.from('service_orders').update({ status: 'to_invoice' }).eq('id', id);
        if (!error) { toast.success('Retirada Confirmada'); queryClient.invalidateQueries({ queryKey: ['service-orders'] }); }
    };

    const handleConfirmInstallation = async (id: string) => {
        const { error } = await supabase.from('service_orders').update({ status: 'to_invoice' }).eq('id', id);
        if (!error) { toast.success('Instalação Confirmada'); queryClient.invalidateQueries({ queryKey: ['service-orders'] }); }
    };

    return (
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50">
                        <TableHead>OS / Cliente</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Datas</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders.map((order) => {
                        // Worker hiding logic
                        if ((profile?.role === 'worker' || profile?.role === 'manager') && (order.status === 'to_invoice' || order.status === 'invoiced')) {
                            return null;
                        }

                        const getPriorityColor = (urgency: string) => {
                            if (urgency === 'high') return 'bg-red-100 hover:bg-red-200';
                            if (urgency === 'low') return 'bg-blue-50 hover:bg-blue-100';
                            return 'hover:bg-slate-50'; // Default/Medium
                        };

                        return (
                            <TableRow key={order.id} className={`${getPriorityColor(order.urgency)} transition-colors`}>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-800">{order.order_number}</span>
                                        <span className="text-sm text-slate-600 truncate max-w-[150px]" title={order.client_name}>{order.client_name}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge className={`${getStatusColor(order.status)} whitespace-nowrap min-w-[80px] justify-center`}>
                                        {getStatusText(order.status)}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <p className="text-sm text-slate-600 line-clamp-2 max-w-[200px]" title={order.service_description}>
                                        {order.service_description}
                                    </p>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1 text-xs text-slate-600">
                                        <div className="flex items-center gap-1">
                                            <CalendarIcon size={12} />
                                            <span>{formatDate(order.opening_date)}</span>
                                        </div>
                                        {order.deadline && (
                                            <div className="flex items-center gap-1 text-red-600" title="Prazo">
                                                <Clock size={12} />
                                                <span>{formatDate(order.deadline)}</span>
                                            </div>
                                        )}
                                        {order.service_start_date && (
                                            <div className="flex items-center gap-1 text-blue-600" title="Instalação">
                                                <CheckCircle size={12} />
                                                <span>{formatDate(order.service_start_date)}</span>
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {order.assigned_worker ? (
                                        <div className="flex items-center gap-1 text-sm text-slate-700">
                                            <User size={14} />
                                            <span className="truncate max-w-[100px]" title={order.assigned_worker.name}>{order.assigned_worker.name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-400 italic">Não atribuído</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {order.sale_value != null && profile?.role !== 'worker' && profile?.role !== 'manager' ? (
                                        <div className="flex items-center gap-1 text-sm font-medium text-slate-700">
                                            <DollarSign size={14} />
                                            {order.sale_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </div>
                                    ) : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end items-center gap-1 flex-wrap max-w-[200px] ml-auto">
                                        {/* Workflow Buttons */}
                                        {order.status === 'quality_control' && canEdit && (
                                            <>
                                                <Button size="sm" onClick={() => handleApproveQC(order.id)} className="h-7 w-7 p-0 bg-lime-600 hover:bg-lime-700 text-white" title="Aprovar CQ"><CheckCircle size={14} /></Button>
                                                <Button size="sm" onClick={() => handleRejectQC(order.id)} className="h-7 w-7 p-0 bg-red-600 hover:bg-red-700 text-white" title="Reprovar CQ"><XCircle size={14} /></Button>
                                            </>
                                        )}
                                        {order.status === 'ready_for_pickup' && canEdit && (
                                            <>
                                                <Button size="sm" onClick={() => handleConfirmPickup(order.id)} className="h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700 text-white" title="Confirmar Retirada"><CheckCircle size={14} /></Button>
                                                <Button size="sm" onClick={() => setInstallOrder(order)} className="h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700 text-white" title="Agendar Instalação"><CalendarIcon size={14} /></Button>
                                            </>
                                        )}
                                        {order.status === 'awaiting_installation' && canEdit && (
                                            <Button size="sm" onClick={() => handleConfirmInstallation(order.id)} className="h-7 px-2 bg-yellow-600 hover:bg-yellow-700 text-white text-xs" >Confirmar Instalação</Button>
                                        )}
                                        {order.status === 'to_invoice' && profile?.role === 'admin' && (
                                            <Button size="sm" onClick={() => setInvoiceOrder(order)} className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white text-xs">Gerar Fatura</Button>
                                        )}

                                        {/* Standard Actions */}
                                        <div className="flex bg-slate-100 rounded-md p-0.5 ml-1">
                                            <Button variant="ghost" size="sm" onClick={() => onView(order)} className="h-7 w-7 p-0 hover:text-blue-600" title="Visualizar"><Eye size={14} /></Button>
                                            <Button variant="ghost" size="sm" onClick={() => navigate(`/tasks/${order.id}`)} className="h-7 w-7 p-0 hover:text-purple-600" title="Tarefas"><ListTodo size={14} /></Button>
                                            {canEdit && <Button variant="ghost" size="sm" onClick={() => onEdit(order)} className="h-7 w-7 p-0 hover:text-orange-600" title="Editar"><Edit size={14} /></Button>}
                                            {canDelete && <Button variant="ghost" size="sm" onClick={() => onDelete(order)} className="h-7 w-7 p-0 hover:text-red-600" title="Excluir"><Trash2 size={14} /></Button>}
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            {/* Dialogs */}
            {invoiceOrder && (
                <InvoiceGenerationDialog
                    open={!!invoiceOrder}
                    onOpenChange={(open) => !open && setInvoiceOrder(null)}
                    order={invoiceOrder}
                />
            )}
            {installOrder && (
                <InstallationScheduleDialog
                    open={!!installOrder}
                    onOpenChange={(open) => !open && setInstallOrder(null)}
                    order={installOrder}
                />
            )}
        </div>
    );
};

export default OrdersTable;
