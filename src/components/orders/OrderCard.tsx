// src/components/orders/OrderCard.tsx
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  DollarSign,
  Edit,
  Eye,
  Trash2,
  User,
  Clock,
  ListTodo,
  CheckCircle,
  CalendarIcon,
  XCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ServiceOrder } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ClientLogo from '@/components/ui/client-logo';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createInvoice } from '@/services/invoiceService';
import { parseISO, format as formatDateFns } from 'date-fns';
import { isValid } from 'date-fns';



interface OrderCardProps {
  order: ServiceOrder & { assigned_worker?: { name: string } };
  onEdit: (order: ServiceOrder) => void;
  onDelete: (order: ServiceOrder) => void;
  onView: (order: ServiceOrder & { assigned_worker?: { name: string } }) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onEdit, onDelete, onView }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Verifique se o usuário é worker ou manager, e se o status é 'to_invoice' ou 'invoiced'
  if ((profile?.role === 'worker' || profile?.role === 'manager') && (order.status === 'to_invoice' || order.status === 'invoiced')) {
    return null; // Impede a renderização do Card para essas ordens
  }

  const canEdit = profile && ['admin', 'manager', 'worker'].includes(profile.role);
  const canDelete = profile && ['admin', 'manager'].includes(profile.role);
  const [mostrarExtras, setMostrarExtras] = useState(false);
  const [valoresExtras, setValoresExtras] = useState<{ descricao: string; valor: string }[]>([]);
  const [openCalendar, setOpenCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);



  // Adiciona um novo item extra vazio
  const adicionarItemExtra = () => {
    setValoresExtras((old) => [...old, { descricao: '', valor: '' }]);
  };

  // Atualiza descrição ou valor de um item extra
  const atualizarItemExtra = (
    index: number,
    campo: 'descricao' | 'valor',
    valor: string
  ) => {
    setValoresExtras((old) =>
      old.map((item, idx) => (idx === index ? { ...item, [campo]: valor } : item))
    );
  };

  // Soma os valores extras (convertendo vírgula em ponto)
  const totalExtras = useMemo(() => {
    return valoresExtras.reduce((acc, item) => {
      const valorNum = parseFloat(item.valor.replace(',', '.'));
      return acc + (isNaN(valorNum) ? 0 : valorNum);
    }, 0);
  }, [valoresExtras]);

  const handleManageTasks = () => navigate(`/tasks/${order.id}`);

  // Atualizar status (exemplo)
  const handleApproveQualityControl = async () => {
    const { error } = await supabase
      .from('service_orders')
      .update({ status: 'ready_for_pickup' })
      .eq('id', order.id);

    if (error) {
      toast.error('Erro ao aprovar controle de qualidade');
    } else {
      toast.success('Controle de qualidade aprovado! OS agora está Aguardando Retirada.');
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    }
  };

  const handleConfirmarRetirada = async () => {
    const { error } = await supabase
      .from('service_orders')
      .update({ status: 'to_invoice' })
      .eq('id', order.id);

    if (error) {
      toast.error('Erro ao confirmar retirada');
    } else {
      toast.success('Retirada confirmada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    }
  };

  const handleMoveToAwaitingInstallation = async () => {
    const { error } = await supabase
      .from('service_orders')
      .update({ status: 'awaiting_installation' })
      .eq('id', order.id);

    if (error) {
      toast.error('Erro ao mover para Aguardando Instalação');
    } else {
      toast.success('OS movida para Aguardando Instalação.');
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    }
  };

  const handleMoveToToInvoice = async () => {
    const { error } = await supabase
      .from('service_orders')
      .update({ status: 'to_invoice' })
      .eq('id', order.id);

    if (error) {
      toast.error('Erro ao marcar OS para faturamento manual.');
    } else {
      toast.success('OS marcada como "Faturar". Acesse a tela de Faturas.');
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    }
  };

  // Geração da fatura somando valores da OS + extras
  const handleGerarFatura = async () => {
    const saleValue = order.sale_value || 0;

    // Filtra somente itens extras válidos
    const extrasValidos = valoresExtras
      .filter((item) => item.descricao.trim() !== '' && item.valor.trim() !== '')
      .map((item) => ({
        description: item.descricao.trim(),
        value: parseFloat(item.valor.replace(',', '.')),
      }));

    const totalExtrasSomados = extrasValidos.reduce((acc, item) => acc + item.value, 0);
    const totalFinal = saleValue + totalExtrasSomados;

    // ✅ Verificação se valor total é zero
    if (totalFinal === 0) {
      toast.warning('Informe um valor antes de gerar a fatura.');
      return;
    }

    if (!order.client_id || !order.client_name || !order.opening_date) {

    }

    const startDate = order.service_start_date || order.opening_date.split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    const invoicePayload = {
      client_id: order.client_id,
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
    navigate('/invoices');
  };

  // Mapeamento de cores e textos de status
  const getStatusColor = (status: string) =>
  ({
    received: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
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
  }[status] || 'bg-gray-100 text-gray-800');

  const getStatusText = (status: string) =>
  ({
    received: 'Recebida',
    pending: 'Pendente',
    planning: 'Planejamento',
    in_progress: 'Em Andamento',
    quality_control: 'Controle de Qualidade',
    ready_for_shipment: 'Pronta p/ Envio',
    in_transit: 'Em Trânsito',
    delivered: 'Entregue',
    invoiced: 'Faturada',
    completed: 'Concluída',
    cancelled: 'Cancelada',
    on_hold: 'Em espera',
    stopped: 'Paralisada',
    ready_for_pickup: 'Aguardando Retirada',
    awaiting_installation: 'Aguardando Instalação',
    to_invoice: 'Faturar',
    finalized: 'Finalizado',
  }[status] || status);

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return '-';

    let date: Date;

    // Se for string no formato só data (ex: '2025-08-08')
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      date = parseISO(dateString); // Mantém sem conversão de fuso
    } else {
      // Para data completa com horário (ex: '2025-08-07T14:30:00Z'), ou objeto Date
      date = new Date(dateString);
    }

    if (!isValid(date)) return '-';

    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    }).format(date);
  };


  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <ClientLogo clientName={order.client_name} size="md" />
            <div>
              <h3 className="font-semibold text-lg text-slate-800">{order.order_number}</h3>
              <p className="text-slate-600 font-medium">{order.client_name}</p>
            </div>
          </div>
          <Badge className={getStatusColor(order.status)}>{getStatusText(order.status)}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="bg-slate-50 p-3 rounded-md">
          <p className="text-sm line-clamp-3">{order.service_description}</p>
        </div>

        <div className="grid gap-2 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar size={16} />
            <span>Abertura: {formatDate(order.opening_date)}</span>
          </div>

          {/* mostra a data agendada*/}

          {/* Adicione aqui o novo bloco para mostrar a data agendada */}
          {order.service_start_date && (
            <div className="flex items-center gap-2 text-slate-600">
              <CalendarIcon size={16} />
              <span>
                Instalação Do Serviço: {format(parseISO(order.service_start_date), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            </div>
          )}

          {order.deadline && (
            <div className="flex items-center gap-2 text-slate-600">
              <Clock size={16} />
              <span>Prazo: {formatDate(order.deadline)}</span>
            </div>
          )}

          <div className="text-slate-600">
            Urgência:{' '}
            <span className="font-medium">
              {order.urgency === 'high'
                ? 'Alta'
                : order.urgency === 'medium'
                  ? 'Média'
                  : 'Baixa'}
            </span>
          </div>

          {order.assigned_worker?.name && (
            <div className="flex items-center gap-2 text-slate-600">
              <User size={16} />
              <span>Responsável: {order.assigned_worker.name}</span>
            </div>
          )}

          {order.sale_value != null && profile?.role !== 'worker' && profile?.role !== 'manager' && (
            <div className="flex items-center gap-2 text-slate-600">
              <DollarSign size={16} />
              <span>
                Valor: R${' '}
                {order.sale_value.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          )}
        </div>

        {order.status === 'quality_control' && canEdit && (
          <div className="pt-2 flex gap-2 flex-wrap">
            <Button
              onClick={handleApproveQualityControl}
              className="bg-lime-600 hover:bg-lime-700 text-white"
            >
              <CheckCircle size={16} className="mr-2" />
              Aprovar Controle de Qualidade
            </Button>

            <Button
              onClick={async () => {
                const { error } = await supabase
                  .from('service_orders')
                  .update({ status: 'in_progress' })
                  .eq('id', order.id);

                if (error) {
                  toast.error('Erro ao reprovar controle de qualidade');
                } else {
                  toast.success('Controle de qualidade reprovado! OS movida para Faturar.');
                  queryClient.invalidateQueries({ queryKey: ['service-orders'] });
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <XCircle size={16} className="mr-2" />
              Reprovar Controle de Qualidade
            </Button>
          </div>
        )}

        {order.status === 'ready_for_pickup' && canEdit && (
          <>
            <div className="pt-2 flex gap-2 flex-wrap">
              <Button
                onClick={handleConfirmarRetirada}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <CheckCircle size={16} className="mr-2" />
                Confirmar Retirada
              </Button>

              <Button
                onClick={() => setOpenCalendar(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <CalendarIcon size={16} className="mr-2" />
                Agendar Instalação
              </Button>
            </div>

            <Dialog open={openCalendar} onOpenChange={setOpenCalendar}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Selecionar Data da Instalação</DialogTitle>
                </DialogHeader>

                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={ptBR}
                  className="rounded-md border"
                />

                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setOpenCalendar(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={async () => {
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
                        setOpenCalendar(false);
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Confirmar Agendamento
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}

        {order.status === 'awaiting_installation' && canEdit && (
          <div className="pt-2 flex gap-2 flex-wrap">
            <Button
              onClick={handleMoveToToInvoice}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <CheckCircle size={16} className="mr-2" />
              Confirmar Instalação
            </Button>
          </div>
        )}

        {/* Form para adicionar valores extras só aparece quando status for 'to_invoice' */}
        {order.status === 'to_invoice' && profile?.role === 'admin' && (
          <div className="mt-4 border rounded p-4 bg-gray-50">
            <h3 className="font-semibold mb-2">Faturamento</h3>

            {!mostrarExtras && (
              <button
                type="button"
                onClick={() => {
                  setMostrarExtras(true);
                  if (valoresExtras.length === 0 || (valoresExtras.length === 1 && !valoresExtras[0].descricao && !valoresExtras[0].valor)) {
                    adicionarItemExtra(); // Garante ao menos 1 item visível
                  }
                }}
                className="mb-3 text-blue-600 underline"
              >
                + Adicionar Valores Extras
              </button>
            )}

            {mostrarExtras && (
              <>
                {valoresExtras.map((item, idx) => (
                  <div key={idx} className="mb-3">
                    <input
                      type="text"
                      placeholder="Descrição (ex: Taxa de deslocamento)"
                      value={item.descricao}
                      onChange={(e) => atualizarItemExtra(idx, 'descricao', e.target.value)}
                      className="w-full mb-1 border rounded px-2 py-1"
                    />
                    <input
                      type="text"
                      placeholder="Valor (R$)"
                      value={item.valor}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*(?:[.,]\d{0,2})?$/.test(val) || val === '') {
                          atualizarItemExtra(idx, 'valor', val);
                        }
                      }}
                      className="w-full border rounded px-2 py-1"
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={adicionarItemExtra}
                  className="mb-3 text-blue-600 underline"
                >
                  + Adicionar Item Extra
                </button>

                <p className="font-semibold">
                  Total Valores Extras: R$ {totalExtras.toFixed(2).replace('.', ',')}
                </p>
              </>
            )}

            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleGerarFatura}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Gerar Fatura
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-xs text-slate-500">
            Criada em {formatDate(order.created_at)}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(order)}
              className="h-8 w-8 p-0"
            >
              <Eye size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManageTasks}
              className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700"
              title="Gerenciar Tarefas"
            >
              <ListTodo size={16} />
            </Button>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(order)}
                className="h-8 w-8 p-0"
              >
                <Edit size={16} />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(order)}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              >
                <Trash2 size={16} />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderCard;