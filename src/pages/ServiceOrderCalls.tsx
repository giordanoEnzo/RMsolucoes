import React, { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';

interface ServiceOrderCall {
  id: string;
  service_order_id: string;
  reason: string;
  resolved: boolean;
  created_at: string;
  service_orders?: {
    order_number: string;
    client_name: string;
    client_contact: string;
    client_address: string;
    service_description: string;
    assigned_worker_id: string | null;
    assigned_worker?: {
      id: string;
      name: string;
    };
  };
}

const ServiceOrderCalls: React.FC = () => {
  const [calls, setCalls] = useState<ServiceOrderCall[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔧 Função corrigida que busca os chamados
  const fetchCalls = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('service_order_calls')
      .select(`
        *,
        service_orders (
          order_number,
          client_name,
          client_contact,
          client_address,
          service_description,
          assigned_worker_id,
          assigned_worker:assigned_worker_id (
            id,
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar chamados:', error);
    } else {
      setCalls(data || []);
    }

    setLoading(false);
  };

  const resolveCall = async (id: string) => {
    const { data: callData, error: fetchError } = await supabase
      .from('service_order_calls')
      .select('service_order_id')
      .eq('id', id)
      .single();

    if (fetchError || !callData) {
      console.error('Erro ao buscar chamado para resolver:', fetchError);
      return;
    }

    const { error: updateCallError } = await supabase
      .from('service_order_calls')
      .update({ resolved: true })
      .eq('id', id);

    if (updateCallError) {
      console.error('Erro ao resolver chamado:', updateCallError);
      return;
    }

    const { error: updateOrderError } = await supabase
      .from('service_orders')
      .update({ status: 'in_progress' })
      .eq('id', callData.service_order_id);

    if (updateOrderError) {
      console.error('Erro ao atualizar status da OS:', updateOrderError);
      return;
    }

    await fetchCalls();
  };

  const deleteCall = async (id: string) => {
    const confirmDelete = window.confirm('Tem certeza que deseja excluir este chamado?');
    if (!confirmDelete) return;

    const { error } = await supabase
      .from('service_order_calls')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir chamado:', error);
    } else {
      await fetchCalls();
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-slate-800">
          Chamados de Ordens em Espera
        </h1>
        {loading && (
          <div className="flex items-center gap-2 text-slate-500 animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin" />
            Carregando...
          </div>
        )}
      </div>

      {!loading && calls.length === 0 && (
        <div className="text-center text-slate-500 mt-10 flex flex-col items-center gap-2">
          <AlertCircle className="w-8 h-8 text-slate-400" />
          <p>Nenhum chamado em aberto.</p>
        </div>
      )}

      <div className="grid gap-4">
        {calls.map((call) => (
          <Card
            key={call.id}
            className="shadow-sm border border-slate-200 transition hover:shadow-md"
          >
            <CardHeader className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800">
                  Ordem de Serviço #{call.service_orders?.order_number || call.service_order_id}
                </CardTitle>

                {call.service_orders?.client_name && (
                  <p className="text-sm text-slate-500">
                    👤 Cliente: {call.service_orders.client_name}
                  </p>
                )}

                {call.service_orders?.client_contact && (
                  <p className="text-sm text-slate-500">
                    📞 Contato: {call.service_orders.client_contact}
                  </p>
                )}

                {call.service_orders?.client_address && (
                  <p className="text-sm text-slate-500">
                    📍 Endereço: {call.service_orders.client_address}
                  </p>
                )}

                {call.service_orders?.service_description && (
                  <p className="text-sm text-slate-500">
                    🛠 Serviço: {call.service_orders.service_description}
                  </p>
                )}

                <p className="text-sm text-slate-600 mt-1">
                  ❗ Motivo do chamado: {call.reason}
                </p>

                {call.service_orders?.assigned_worker?.name && (
                  <p className="text-sm text-slate-500">
                    👷 Responsável: {call.service_orders.assigned_worker.name}
                  </p>
                )}
              </div>

              <Badge
                variant={call.resolved ? 'secondary' : 'default'}
                className={`text-xs px-2 py-1 rounded-full ${
                  call.resolved
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {call.resolved ? 'Resolvido' : 'Em Aberto'}
              </Badge>
            </CardHeader>

            <CardContent className="flex justify-end gap-2">
              {!call.resolved && (
                <Button
                  onClick={() => resolveCall(call.id)}
                  variant="success"
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle size={16} />
                  Marcar como Resolvido
                </Button>
              )}

              <Button
                onClick={() => deleteCall(call.id)}
                variant="destructive"
                className="gap-2 bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 size={16} />
                Excluir
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ServiceOrderCalls;
