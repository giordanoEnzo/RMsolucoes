import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { Client } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeClients } from '../hooks/useRealtimeClients';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { UserCircle, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const Clients = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  useRealtimeClients();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    cnpj_cpf: '',
    contact: '',
    address: '',
    number: '',
    neighborhood: '',
    cep: '',
    complement: '',
    state: ''
  });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Client[];
    }
  });

  const normalize = (text: string = '') => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

  const normalizedSearch = normalize(searchTerm);
  const filteredClients = clients.filter((client) =>
    [
      client.name,
      client.company_name,
      client.cnpj_cpf,
      client.contact,
      client.address,
      client.neighborhood,
      client.state
    ].some(field => normalize(field || '').includes(normalizedSearch))
  );

  const resetForm = () => {
    setFormData({
      name: '', company_name: '', cnpj_cpf: '', contact: '', address: '',
      number: '', neighborhood: '', cep: '', complement: '', state: ''
    });
    setEditingClient(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      updateClientMutation.mutate({ id: editingClient.id, ...formData });
    } else {
      createClientMutation.mutate(formData);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      company_name: client.company_name || '',
      cnpj_cpf: client.cnpj_cpf || '',
      contact: client.contact || '',
      address: client.address || '',
      number: client.number || '',
      neighborhood: client.neighborhood || '',
      cep: client.cep || '',
      complement: client.complement || '',
      state: client.state || ''
    });
    setIsDialogOpen(true);
  };

  const formatCnpjCpf = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const handleCnpjCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCnpjCpf(e.target.value);
    setFormData({ ...formData, cnpj_cpf: formatted });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const formatted = formatPhone(e.target.value);
  setFormData({ ...formData, contact: formatted });
};


  const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, '');

  
  if (numbers.length <= 2) return `+${numbers}`;
  if (numbers.length <= 4) return `+${numbers.slice(0, 2)} ${numbers.slice(2)}`;
  if (numbers.length <= 9) return `+${numbers.slice(0, 2)} ${numbers.slice(2, 4)} ${numbers.slice(4)}`;
  if (numbers.length <= 13) return `+${numbers.slice(0, 2)} ${numbers.slice(2, 4)} ${numbers.slice(4, 9)}-${numbers.slice(9)}`;
  return `+${numbers.slice(0, 2)} ${numbers.slice(2, 4)} ${numbers.slice(4, 9)}-${numbers.slice(9, 13)}`;
};

  const createClientMutation = useMutation({
    mutationFn: async (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('clients').insert(clientData).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente criado com sucesso!');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => toast.error('Erro ao criar cliente: ' + error.message)
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase.from('clients').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente atualizado com sucesso!');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => toast.error('Erro ao atualizar cliente: ' + error.message)
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente excluído com sucesso!');
    },
    onError: (error: any) => toast.error('Erro ao excluir cliente: ' + error.message)
  });

  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h2>
        <p className="text-gray-600">Apenas administradores e gerentes podem gerenciar clientes.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600 mt-1">Gerencie os clientes da empresa - Atualizações em tempo real</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" /> Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}  />
                </div>
                <div>
                  <Label>Razão Social</Label>
                  <Input value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} />
                </div>
                <div>
                  <Label>CNPJ/CPF</Label>
                  <Input value={formData.cnpj_cpf} onChange={handleCnpjCpfChange} placeholder="000.000.000-00 ou 00.000.000/0000-00" maxLength={18} />
                </div>
                <div>
                  <Label>Contato</Label>
                  <Input
                    value={formData.contact}
                    onChange={handlePhoneChange}
                    placeholder="+55 (35) 3539-3344"
                  />
                </div>
                <div>
                  <Label>Endereço</Label>
                  <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Número</Label>
                    <Input value={formData.number} onChange={(e) => setFormData({ ...formData, number: e.target.value })} />
                  </div>
                  <div>
                    <Label>Bairro</Label>
                    <Input value={formData.neighborhood} onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>CEP</Label>
                    <Input value={formData.cep} onChange={(e) => setFormData({ ...formData, cep: e.target.value })} />
                  </div>
                  <div>
                    <Label>Complemento</Label>
                    <Input value={formData.complement} onChange={(e) => setFormData({ ...formData, complement: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Estado</Label>
                  <Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
                </div>
                <Button type="submit" className="w-full">
                  {editingClient ? 'Atualizar' : 'Criar'} Cliente
                </Button>
              </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4 max-w-md">
        <Input placeholder="Buscar por nome, razão social, CPF/CNPJ, bairro, etc..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando clientes...</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card key={client.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <UserCircle className="h-5 w-5 text-gray-500" />
                  <CardTitle className="text-lg">{client.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  {client.company_name && <div><strong>Razão Social:</strong> {client.company_name}</div>}
                  {client.cnpj_cpf && <div><strong>CNPJ/CPF:</strong> {client.cnpj_cpf}</div>}
                  <div><strong>Contato:</strong> {client.contact}</div>
                  <div><strong>Endereço:</strong> {client.address}, {client.number || 'S/N'}</div>
                  {client.neighborhood && <div><strong>Bairro:</strong> {client.neighborhood}</div>}
                  {client.cep && <div><strong>CEP:</strong> {client.cep}</div>}
                  {client.complement && <div><strong>Complemento:</strong> {client.complement}</div>}
                  {client.state && <div><strong>Estado:</strong> {client.state}</div>}
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(client)}>
                    <Edit className="h-4 w-4 mr-1" /> Editar
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteClientMutation.mutate(client.id)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Clients;
