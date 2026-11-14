-- Criação da tabela de tarefas das ordens de serviço
CREATE TABLE public.service_order_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_worker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  status_details TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  estimated_hours NUMERIC(5,2),
  deadline DATE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criação da tabela de materiais das tarefas
CREATE TABLE public.task_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.service_order_tasks(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity_used NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criação da tabela de logs de tempo das tarefas
CREATE TABLE public.task_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.service_order_tasks(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  hours_worked NUMERIC(5,2),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX idx_service_order_tasks_service_order_id ON public.service_order_tasks(service_order_id);
CREATE INDEX idx_service_order_tasks_assigned_worker_id ON public.service_order_tasks(assigned_worker_id);
CREATE INDEX idx_service_order_tasks_status ON public.service_order_tasks(status);
CREATE INDEX idx_service_order_tasks_priority ON public.service_order_tasks(priority);

CREATE INDEX idx_task_materials_task_id ON public.task_materials(task_id);
CREATE INDEX idx_task_materials_inventory_item_id ON public.task_materials(inventory_item_id);

CREATE INDEX idx_task_time_logs_task_id ON public.task_time_logs(task_id);
CREATE INDEX idx_task_time_logs_worker_id ON public.task_time_logs(worker_id);

-- RLS para service_order_tasks
ALTER TABLE public.service_order_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view tasks"
  ON public.service_order_tasks FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Workers can manage their assigned tasks"
  ON public.service_order_tasks FOR ALL
  TO authenticated
  USING (
    assigned_worker_id = auth.uid() OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- RLS para task_materials
ALTER TABLE public.task_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view task materials"
  ON public.task_materials FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Workers can manage materials for their tasks"
  ON public.task_materials FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_order_tasks t
      WHERE t.id = task_materials.task_id
      AND (t.assigned_worker_id = auth.uid() OR t.created_by = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- RLS para task_time_logs
ALTER TABLE public.task_time_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view time logs"
  ON public.task_time_logs FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Workers can manage their own time logs"
  ON public.task_time_logs FOR ALL
  TO authenticated
  USING (
    worker_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'manager')
    )
  );

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
UPDATE public.service_orders SET status = 'completed' WHERE status = 'invoiced'; -- Habilitar REPLICA IDENTITY FULL para capturar dados completos durante atualizações
ALTER TABLE public.service_order_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.task_materials REPLICA IDENTITY FULL;
ALTER TABLE public.task_time_logs REPLICA IDENTITY FULL;

-- Adicionar as tabelas à publicação supabase_realtime para ativar funcionalidade em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_order_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_materials;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_time_logs;
-- Atualizar a view employee_task_stats para incluir administradores e gerentes
CREATE OR REPLACE VIEW public.employee_task_stats AS
SELECT 
    p.id as worker_id,
    p.name as worker_name,
    p.role as worker_role,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
    COALESCE(SUM(tl.hours_worked), 0) as total_hours_worked,
    CASE 
        WHEN COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) > 0 
        THEN COALESCE(SUM(tl.hours_worked), 0) / COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END)
        ELSE 0 
    END as avg_hours_per_task
FROM profiles p
LEFT JOIN service_order_tasks t ON t.assigned_worker_id = p.id
LEFT JOIN task_time_logs tl ON tl.task_id = t.id
WHERE p.role IN ('admin', 'manager', 'worker')
GROUP BY p.id, p.name, p.role;

-- Atualizar a view overdue_analysis para incluir administradores e gerentes
CREATE OR REPLACE VIEW public.overdue_analysis AS
SELECT 
    'task' as type,
    t.id,
    t.title as name,
    t.priority,
    so.urgency,
    t.estimated_hours,
    t.status,
    so.deadline,
    CASE 
        WHEN so.deadline IS NOT NULL AND so.deadline < CURRENT_DATE 
        THEN CURRENT_DATE - so.deadline 
        ELSE 0 
    END as days_overdue,
    p.name as assigned_worker,
    p.role as assigned_worker_role,
    so.order_number,
    so.client_name
FROM service_order_tasks t
JOIN service_orders so ON so.id = t.service_order_id
LEFT JOIN profiles p ON p.id = t.assigned_worker_id
WHERE t.status NOT IN ('completed', 'cancelled')

UNION ALL

SELECT 
    'order' as type,
    so.id,
    so.order_number || ' - ' || so.client_name as name,
    NULL as priority,
    so.urgency,
    NULL as estimated_hours,
    so.status,
    so.deadline,
    CASE 
        WHEN so.deadline IS NOT NULL AND so.deadline < CURRENT_DATE 
        THEN CURRENT_DATE - so.deadline 
        ELSE 0 
    END as days_overdue,
    p.name as assigned_worker,
    p.role as assigned_worker_role,
    so.order_number,
    so.client_name
FROM service_orders so
LEFT JOIN profiles p ON p.id = so.assigned_worker_id
WHERE so.status NOT IN ('completed', 'delivered', 'cancelled');

-- Grant select permissions on the updated views
GRANT SELECT ON public.employee_task_stats TO authenticated;
GRANT SELECT ON public.overdue_analysis TO authenticated;


-- Criação das tabelas principais do sistema

-- Tabela de perfis de usuários
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'worker')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de clientes
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de ordens de serviço
CREATE TABLE public.service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  opening_date DATE NOT NULL DEFAULT CURRENT_DATE,
  client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT,
  client_name TEXT NOT NULL,
  client_contact TEXT NOT NULL,
  client_address TEXT NOT NULL,
  service_description TEXT NOT NULL,
  sale_value DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN (
    'received', 'pending', 'planning', 'production', 
    'quality_control', 'ready_for_shipment', 'in_transit', 
    'delivered', 'invoiced', 'completed', 'cancelled'
  )),
  urgency TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
  assigned_worker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  deadline DATE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de observações
CREATE TABLE public.observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID REFERENCES public.service_orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de itens de estoque
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de movimentações de estoque
CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out')),
  quantity INTEGER NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  service_order_id UUID REFERENCES public.service_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Políticas RLS para clients
CREATE POLICY "All authenticated users can view clients" ON public.clients FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Managers and admins can manage clients" ON public.clients FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Políticas RLS para service_orders
CREATE POLICY "All authenticated users can view service orders" ON public.service_orders FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins and managers can create service orders" ON public.service_orders FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')) OR
  auth.uid() IS NOT NULL
);
CREATE POLICY "Admins and managers can update service orders" ON public.service_orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')) OR
  assigned_worker_id = auth.uid()
);
CREATE POLICY "Admins can delete service orders" ON public.service_orders FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Políticas RLS para observations
CREATE POLICY "All authenticated users can view observations" ON public.observations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "All authenticated users can create observations" ON public.observations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas RLS para inventory_items
CREATE POLICY "All authenticated users can view inventory" ON public.inventory_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Managers and admins can manage inventory" ON public.inventory_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Políticas RLS para inventory_movements
CREATE POLICY "All authenticated users can view movements" ON public.inventory_movements FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "All authenticated users can create movements" ON public.inventory_movements FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Função para criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'worker')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Função para gerar número de OS automaticamente
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM '[0-9]+') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.service_orders
  WHERE order_number ~ '^OS[0-9]+$';
  
  RETURN 'OS' || LPAD(next_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Inserir dados iniciais para teste
INSERT INTO public.clients (id, name, contact, address) VALUES
  (gen_random_uuid(), 'Empresa ABC Ltda', '(11) 98765-4321', 'Rua das Flores, 123 - São Paulo/SP'),
  (gen_random_uuid(), 'Indústria XYZ S/A', '(11) 91234-5678', 'Av. Industrial, 456 - São Paulo/SP'),
  (gen_random_uuid(), 'Comércio 123', '(11) 95555-1234', 'Rua do Comércio, 789 - São Paulo/SP');

INSERT INTO public.inventory_items (name, current_quantity) VALUES
  ('Parafuso M6', 100),
  ('Chapa de Aço 2mm', 50),
  ('Solda MIG', 25),
  ('Tinta Primer', 30),
  ('Rebite 4mm', 200);

-- Habilitar REPLICA IDENTITY FULL para capturar dados completos durante atualizações
ALTER TABLE public.clients REPLICA IDENTITY FULL;
ALTER TABLE public.inventory_items REPLICA IDENTITY FULL;
ALTER TABLE public.service_orders REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Adicionar as tabelas à publicação supabase_realtime para ativar funcionalidade em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Create a view for employee task statistics
CREATE OR REPLACE VIEW public.employee_task_stats AS
SELECT 
    p.id as worker_id,
    p.name as worker_name,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
    COALESCE(SUM(tl.hours_worked), 0) as total_hours_worked,
    CASE 
        WHEN COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) > 0 
        THEN COALESCE(SUM(tl.hours_worked), 0) / COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END)
        ELSE 0 
    END as avg_hours_per_task
FROM profiles p
LEFT JOIN service_order_tasks t ON t.assigned_worker_id = p.id
LEFT JOIN task_time_logs tl ON tl.task_id = t.id
WHERE p.role = 'worker'
GROUP BY p.id, p.name;

-- Create a view for overdue tasks and orders
CREATE OR REPLACE VIEW public.overdue_analysis AS
SELECT 
    'task' as type,
    t.id,
    t.title as name,
    t.priority,
    so.urgency,
    t.estimated_hours,
    t.status,
    so.deadline,
    CASE 
        WHEN so.deadline IS NOT NULL AND so.deadline < CURRENT_DATE 
        THEN CURRENT_DATE - so.deadline 
        ELSE 0 
    END as days_overdue,
    p.name as assigned_worker,
    so.order_number,
    so.client_name
FROM service_order_tasks t
JOIN service_orders so ON so.id = t.service_order_id
LEFT JOIN profiles p ON p.id = t.assigned_worker_id
WHERE t.status NOT IN ('completed', 'cancelled')

UNION ALL

SELECT 
    'order' as type,
    so.id,
    so.order_number || ' - ' || so.client_name as name,
    NULL as priority,
    so.urgency,
    NULL as estimated_hours,
    so.status,
    so.deadline,
    CASE 
        WHEN so.deadline IS NOT NULL AND so.deadline < CURRENT_DATE 
        THEN CURRENT_DATE - so.deadline 
        ELSE 0 
    END as days_overdue,
    p.name as assigned_worker,
    so.order_number,
    so.client_name
FROM service_orders so
LEFT JOIN profiles p ON p.id = so.assigned_worker_id
WHERE so.status NOT IN ('completed', 'delivered', 'cancelled');

-- Grant select permissions on the views
GRANT SELECT ON public.employee_task_stats TO authenticated;
GRANT SELECT ON public.overdue_analysis TO authenticated;

-- Create table to track product usage in tasks
CREATE TABLE public.task_product_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.service_order_tasks(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity_used INTEGER NOT NULL CHECK (quantity_used > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Add RLS policies for task product usage
ALTER TABLE public.task_product_usage ENABLE ROW LEVEL SECURITY;

-- Users can view task product usage
CREATE POLICY "Users can view task product usage" 
  ON public.task_product_usage 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Managers and admins can manage task product usage
CREATE POLICY "Managers and admins can manage task product usage" 
  ON public.task_product_usage 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  ));

-- Workers can manage usage for their assigned tasks
CREATE POLICY "Workers can manage usage for their tasks" 
  ON public.task_product_usage 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM service_order_tasks t
    WHERE t.id = task_id 
    AND t.assigned_worker_id = auth.uid()
  ));

-- Create function to automatically create inventory movement when product is used
CREATE OR REPLACE FUNCTION handle_task_product_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert inventory movement record
  INSERT INTO inventory_movements (
    item_id,
    movement_type,
    quantity,
    user_id,
    service_order_id,
    date
  )
  SELECT 
    NEW.item_id,
    'out',
    NEW.quantity_used,
    NEW.created_by,
    t.service_order_id,
    CURRENT_DATE
  FROM service_order_tasks t
  WHERE t.id = NEW.task_id;
  
  -- Update inventory item quantity
  UPDATE inventory_items 
  SET current_quantity = current_quantity - NEW.quantity_used
  WHERE id = NEW.item_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic inventory movement
CREATE TRIGGER task_product_usage_trigger
  AFTER INSERT ON task_product_usage
  FOR EACH ROW
  EXECUTE FUNCTION handle_task_product_usage();

-- Add CNPJ/CPF field to clients table
ALTER TABLE public.clients 
ADD COLUMN cnpj_cpf TEXT;

-- Add a check constraint to ensure CNPJ/CPF format is valid (11 digits for CPF or 14 for CNPJ)
ALTER TABLE public.clients 
ADD CONSTRAINT check_cnpj_cpf_format 
CHECK (cnpj_cpf IS NULL OR (LENGTH(REGEXP_REPLACE(cnpj_cpf, '[^0-9]', '', 'g')) IN (11, 14)));

-- Tabela para cadastro de serviços
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_price NUMERIC(10,2),
  estimated_hours NUMERIC(4,2),
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabela para orçamentos
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_number TEXT NOT NULL UNIQUE,
  client_id UUID REFERENCES public.clients(id),
  client_name TEXT NOT NULL,
  client_contact TEXT NOT NULL,
  client_address TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, approved, rejected, expired
  total_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  valid_until DATE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabela para itens do orçamento
CREATE TABLE public.budget_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id),
  service_name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Função para gerar número do orçamento
CREATE OR REPLACE FUNCTION public.generate_budget_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(budget_number FROM '[0-9]+') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.budgets
  WHERE budget_number ~ '^ORC[0-9]+$';
  
  RETURN 'ORC' || LPAD(next_number::TEXT, 4, '0');
END;
$$;

-- RLS para serviços
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view services"
  ON public.services FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers and admins can manage services"
  ON public.services FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  ));

-- RLS para orçamentos
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view budgets"
  ON public.budgets FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers and admins can manage budgets"
  ON public.budgets FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  ));

-- RLS para itens do orçamento
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view budget items"
  ON public.budget_items FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers and admins can manage budget items"
  ON public.budget_items FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  ));

-- Adicionar coluna de status na tabela de tarefas (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'service_order_tasks' 
                   AND column_name = 'status_details') THEN
        ALTER TABLE public.service_order_tasks 
        ADD COLUMN status_details TEXT;
    END IF;
END $$;
-- Tabela para itens das ordens de serviço
CREATE TABLE public.service_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  service_description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sale_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- RLS para service_order_items
ALTER TABLE public.service_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view service order items"
  ON public.service_order_items FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers and admins can manage service order items"
  ON public.service_order_items FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  ));

-- Índices para melhor performance
CREATE INDEX idx_service_order_items_service_order_id ON public.service_order_items(service_order_id);
CREATE INDEX idx_service_order_items_service_name ON public.service_order_items(service_name);
-- Tabela para faturas
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  client_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_time NUMERIC(4,2) NOT NULL DEFAULT 0,
  orders JSONB NOT NULL DEFAULT '[]',
  extras JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- RLS para invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers and admins can manage invoices"
  ON public.invoices FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  ));

-- Índices para melhor performance
CREATE INDEX idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX idx_invoices_created_at ON public.invoices(created_at);
