import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../integrations/supabase/client';
import { Client } from '../../types/database';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table';
import { Button } from '../ui/button';
import { Search, Loader2 } from 'lucide-react';

interface ClientSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (client: Client) => void;
}

const ClientSelectionDialog: React.FC<ClientSelectionDialogProps> = ({
    open,
    onOpenChange,
    onSelect,
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const { data: clients = [], isLoading } = useQuery({
        queryKey: ['clients'],
        queryFn: async () => {
            // Fetch all clients. Optimally we could use server-side search, but client-side filtering 
            // matches the existing Clients page behavior and ensures responsiveness for small datasets.
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('name', { ascending: true });
            if (error) throw error;
            return data as Client[];
        },
        enabled: open, // Only fetch when dialog is open
    });

    const normalize = (text: string | null | undefined) =>
        (text || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

    const filteredClients = clients.filter((client) => {
        const search = normalize(searchTerm);
        return (
            normalize(client.name).includes(search) ||
            normalize(client.company_name).includes(search) ||
            normalize(client.cnpj_cpf).includes(search)
        );
    });

    const handleSelect = (client: Client) => {
        onSelect(client);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Selecionar Cliente</DialogTitle>
                </DialogHeader>

                <div className="flex items-center space-x-2 my-4">
                    <Search className="text-gray-400" size={20} />
                    <Input
                        placeholder="Buscar por nome, razão social ou CPF/CNPJ..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1"
                        autoFocus
                    />
                </div>

                <div className="overflow-auto flex-1 border rounded-md">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="animate-spin text-blue-600" size={32} />
                        </div>
                    ) : filteredClients.length === 0 ? (
                        <div className="flex justify-center items-center h-40 text-gray-500">
                            Nenhum cliente encontrado.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 sticky top-0">
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Documento</TableHead>
                                    <TableHead>Endereço</TableHead>
                                    <TableHead className="w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredClients.map((client) => (
                                    <TableRow key={client.id} className="hover:bg-slate-50">
                                        <TableCell>
                                            <div className="font-medium">{client.name}</div>
                                            <div className="text-xs text-gray-500">{client.company_name}</div>
                                        </TableCell>
                                        <TableCell>{client.cnpj_cpf || '-'}</TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={`${client.address}, ${client.number}`}>
                                            {client.address}, {client.number}
                                            {client.neighborhood && ` - ${client.neighborhood}`}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                size="sm"
                                                onClick={() => handleSelect(client)}
                                                className="w-full"
                                            >
                                                Selecionar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ClientSelectionDialog;
