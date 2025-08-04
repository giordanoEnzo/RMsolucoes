-- Atualizar os status da tabela service_orders para incluir os novos status
-- Primeiro, remover a constraint existente
ALTER TABLE public.service_orders DROP CONSTRAINT IF EXISTS service_orders_status_check;

-- Adicionar a nova constraint com os status atualizados
ALTER TABLE public.service_orders ADD CONSTRAINT service_orders_status_check 
CHECK (status IN (
  'pendente', 'in_progress', 'on_hold', 'stopped', 'quality_control', 
  'ready_for_pickup', 'awaiting_installation', 'to_invoice', 'completed', 'cancelled'
));

-- Atualizar os status existentes para os novos valores
UPDATE public.service_orders SET status = 'pendente' WHERE status = 'received';
UPDATE public.service_orders SET status = 'in_progress' WHERE status = 'production';
UPDATE public.service_orders SET status = 'quality_control' WHERE status = 'quality_control';
UPDATE public.service_orders SET status = 'ready_for_pickup' WHERE status = 'ready_for_shipment';
UPDATE public.service_orders SET status = 'completed' WHERE status = 'delivered';
UPDATE public.service_orders SET status = 'completed' WHERE status = 'invoiced'; 