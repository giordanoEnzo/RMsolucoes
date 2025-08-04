import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { InvoiceData } from '@/services/invoiceService';

export function useInvoices() {
  const fetchInvoices = async (): Promise<InvoiceData[]> => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const { data, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: fetchInvoices,
  });

  return {
    invoices: data || [],
    isLoading,
  };
}
