# Configuração de Tempo Real para Tarefas

## Problema Resolvido

Anteriormente, quando uma tarefa era excluída, ela só desaparecia da interface após atualizar a página manualmente. Agora, com a implementação de tempo real, as tarefas são atualizadas automaticamente em todas as telas quando há mudanças no banco de dados.

## Arquivos Criados/Modificados

### 1. Novo Hook de Tempo Real
- **`src/hooks/useRealtimeTasks.ts`** - Hook para monitorar mudanças nas tabelas de tarefas

### 2. Migrações do Supabase
- **`supabase/migrations/20250101000000_create_service_order_tasks_table.sql`** - Cria as tabelas necessárias
- **`supabase/migrations/20250101000001_add_tasks_realtime.sql`** - Configura o tempo real

### 3. Componentes Atualizados
- **`src/components/tasks/TaskList.tsx`** - Adicionado hook de tempo real
- **`src/components/orders/TaskManagement.tsx`** - Adicionado hook de tempo real  
- **`src/pages/MyTasks.tsx`** - Adicionado hook de tempo real

## Como Aplicar as Migrações

### Opção 1: Via Supabase CLI
```bash
# Aplicar as migrações
supabase db push

# Ou aplicar migrações específicas
supabase migration up --include-all
```

### Opção 2: Via Dashboard do Supabase
1. Acesse o dashboard do seu projeto Supabase
2. Vá para "SQL Editor"
3. Execute cada migração em sequência:
   - Primeiro: `20250101000000_create_service_order_tasks_table.sql`
   - Depois: `20250101000001_add_tasks_realtime.sql`

## Como Funciona

### 1. Monitoramento em Tempo Real
O hook `useRealtimeTasks` cria uma conexão WebSocket com o Supabase para monitorar mudanças nas tabelas:
- `service_order_tasks` - Tarefas principais
- `task_materials` - Materiais das tarefas
- `task_time_logs` - Logs de tempo das tarefas

### 2. Invalidação Automática de Queries
Quando uma mudança é detectada, o sistema automaticamente invalida as queries relacionadas:
- Lista de tarefas da ordem de serviço
- Lista de tarefas do usuário (MyTasks)
- Relatórios que dependem das tarefas
- Logs de tempo das tarefas

### 3. Atualização da Interface
O React Query detecta a invalidação e automaticamente refaz as consultas, atualizando a interface em tempo real.

## Testando a Funcionalidade

### 1. Abrir Duas Abas
- Aba 1: Lista de tarefas de uma ordem de serviço
- Aba 2: Página "Minhas Tarefas" ou outra tela que mostra tarefas

### 2. Excluir uma Tarefa
- Na Aba 1, clique em "Excluir" em uma tarefa
- Confirme a exclusão

### 3. Verificar Atualização Automática
- A tarefa deve desaparecer automaticamente da Aba 1
- A tarefa também deve desaparecer automaticamente da Aba 2
- Não é necessário atualizar a página

## Logs de Debug

O sistema inclui logs para facilitar o debug:
- `🔄 Tarefa alterada em tempo real:` - Quando uma tarefa é alterada
- `🔄 Material de tarefa alterado em tempo real:` - Quando materiais são alterados
- `🔄 Log de tempo alterado em tempo real:` - Quando logs de tempo são alterados
- `📡 Status da conexão de tempo real das tarefas:` - Status da conexão WebSocket

## Troubleshooting

### Problema: Tarefas não atualizam em tempo real
**Solução:**
1. Verificar se as migrações foram aplicadas corretamente
2. Verificar se as tabelas estão na publicação `supabase_realtime`
3. Verificar os logs no console do navegador
4. Verificar se o hook `useRealtimeTasks` está sendo usado nos componentes

### Problema: Erro de conexão WebSocket
**Solução:**
1. Verificar se o projeto Supabase está ativo
2. Verificar se as chaves de API estão corretas
3. Verificar se há problemas de rede/firewall

### Problema: Queries não são invalidadas
**Solução:**
1. Verificar se as queryKeys estão corretas
2. Verificar se o React Query está configurado corretamente
3. Verificar se o hook está sendo usado no componente correto

## Benefícios da Implementação

1. **Experiência do Usuário**: Interface sempre atualizada sem necessidade de refresh
2. **Colaboração**: Múltiplos usuários veem mudanças em tempo real
3. **Produtividade**: Não há perda de tempo com atualizações manuais
4. **Consistência**: Dados sempre sincronizados entre todas as telas
5. **Performance**: Atualizações eficientes usando WebSockets

## Próximos Passos

Para expandir a funcionalidade de tempo real:
1. Adicionar tempo real para outras entidades (clientes, inventário, etc.)
2. Implementar notificações push para mudanças importantes
3. Adicionar indicadores visuais de sincronização
4. Implementar retry automático em caso de falha de conexão

