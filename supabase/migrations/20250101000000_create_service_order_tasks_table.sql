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

