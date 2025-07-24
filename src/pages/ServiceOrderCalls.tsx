import React, { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ServiceOrderCall {
  id: string;
  service_order_id: string;
  reason: string;
  resolved: boolean;
  created_at: string;
  service_orders?: {
    order_number: string;
  };
}

const ServiceOrderCalls: React.FC = () => {
  const [calls, setCalls] = useState<ServiceOrderCall[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCalls = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('service_order_calls')
      .select(`
        *,
        service_orders (
          order_number
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
    const { error } = await supabase
      .from('service_order_calls')
      .update({ resolved: true })
      .eq('id', id);

    if (error) {
      console.error('Erro ao resolver chamado:', error);
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
        <h1 className="text-3xl font-semibold text-slate-800">Chamados de Ordens em Espera</h1>
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
                <p className="text-sm text-slate-600 mt-1">{call.reason}</p>
              </div>
              <Badge
                variant={call.resolved ? 'secondary' : 'default'}
                className={`text-xs px-2 py-1 rounded-full ${
                  call.resolved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {call.resolved ? 'Resolvido' : 'Em Aberto'}
              </Badge>
            </CardHeader>

            {!call.resolved && (
              <CardContent className="flex justify-end">
                <Button
                  onClick={() => resolveCall(call.id)}
                  variant="success"
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle size={16} />
                  Marcar como Resolvido
                </Button>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ServiceOrderCalls;
