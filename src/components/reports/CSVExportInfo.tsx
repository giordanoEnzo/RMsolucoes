import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Info, FileText, Database, User, Calendar, DollarSign } from 'lucide-react';

interface CSVExportInfoProps {
  showDetails?: boolean;
}

const CSVExportInfo: React.FC<CSVExportInfoProps> = ({ showDetails = false }) => {
  const csvFields = [
    { field: 'Número da OS', description: 'Número único da ordem de serviço' },
    { field: 'Cliente', description: 'Nome completo do cliente' },
    { field: 'Contato', description: 'Telefone ou email do cliente' },
    { field: 'Endereço', description: 'Endereço completo do cliente' },
    { field: 'Descrição do Serviço', description: 'Descrição detalhada do serviço' },
    { field: 'Status', description: 'Status atual da ordem (Pendente, Em Produção, etc.)' },
    { field: 'Urgência', description: 'Nível de urgência (Baixa, Média, Alta)' },
    { field: 'Valor da Venda', description: 'Valor total da venda' },
    { field: 'Operário Responsável', description: 'Nome do operário responsável' },
    { field: 'Criado por', description: 'Usuário que criou a ordem' },
    { field: 'Data de Abertura', description: 'Data de abertura da ordem' },
    { field: 'Prazo', description: 'Prazo para conclusão' },
    { field: 'Data de Criação', description: 'Data de criação no sistema' },
    { field: 'Última Atualização', description: 'Data da última atualização' },
    { field: 'Total de Itens', description: 'Quantidade de itens na ordem' },
    { field: 'Valor dos Itens', description: 'Soma dos valores dos itens' },
    { field: 'ID da OS', description: 'ID único da ordem no sistema' },
    { field: 'ID do Cliente', description: 'ID único do cliente' },
    { field: 'ID do Operário', description: 'ID único do operário responsável' }
  ];

  if (!showDetails) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="h-4 w-4" />
        <span>O arquivo CSV incluirá todas as informações das ordens de serviço</span>
      </div>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Database className="h-4 w-4" />
          Campos Incluídos no CSV
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {csvFields.map((item, index) => (
            <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded-md">
              <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <div className="font-medium text-sm">{item.field}</div>
                <div className="text-xs text-muted-foreground">{item.description}</div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <FileText className="h-4 w-4" />
            <strong>Formato do Arquivo:</strong>
          </div>
          <ul className="text-xs text-blue-700 mt-2 space-y-1">
            <li>• Codificação: UTF-8 com BOM (suporte a caracteres especiais)</li>
            <li>• Separador: Ponto e vírgula (;)</li>
            <li>• Valores entre aspas duplas</li>
            <li>• Compatível com Excel, Google Sheets e outros editores</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default CSVExportInfo; 