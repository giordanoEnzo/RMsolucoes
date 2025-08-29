-- Habilitar REPLICA IDENTITY FULL para capturar dados completos durante atualizações
ALTER TABLE public.service_order_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.task_materials REPLICA IDENTITY FULL;
ALTER TABLE public.task_time_logs REPLICA IDENTITY FULL;

-- Adicionar as tabelas à publicação supabase_realtime para ativar funcionalidade em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_order_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_materials;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_time_logs;
