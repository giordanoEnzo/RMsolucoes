import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table';
import { Button } from '../ui/button';
import { Edit, Trash2, Eye, User, Phone, MapPin, FileText } from 'lucide-react';
import { Client } from '../../types/database';

interface ClientsTableProps {
    clients: Client[];
    onEdit: (client: Client) => void;
    onDelete: (client: Client) => void;
    onView: (client: Client) => void;
}

const ClientsTable: React.FC<ClientsTableProps> = ({ clients, onEdit, onDelete, onView }) => {
    return (
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50">
                        <TableHead>Nome / Razão Social</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Endereço</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {clients.map((client) => (
                        <TableRow key={client.id} className="hover:bg-slate-50 transition-colors">
                            <TableCell>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 font-medium text-slate-800">
                                        <User size={14} className="text-slate-500" />
                                        {client.name}
                                    </div>
                                    {client.company_name && (
                                        <span className="text-xs text-slate-500 ml-6">{client.company_name}</span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                {client.cnpj_cpf ? (
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <FileText size={14} className="text-slate-400" />
                                        {client.cnpj_cpf}
                                    </div>
                                ) : '-'}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Phone size={14} className="text-slate-400" />
                                    {client.contact}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-start gap-2 text-sm text-slate-600 max-w-[300px]">
                                    <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                    <span>
                                        {client.address}, {client.number}
                                        {client.neighborhood && ` - ${client.neighborhood}`}
                                        {client.state && `/${client.state}`}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onView(client)}
                                        className="h-8 w-8 p-0 hover:text-blue-600 hover:bg-blue-50"
                                        title="Visualizar"
                                    >
                                        <Eye size={16} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onEdit(client)}
                                        className="h-8 w-8 p-0 hover:text-orange-600 hover:bg-orange-50"
                                        title="Editar"
                                    >
                                        <Edit size={16} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onDelete(client)}
                                        className="h-8 w-8 p-0 hover:text-red-600 hover:bg-red-50"
                                        title="Excluir"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default ClientsTable;
