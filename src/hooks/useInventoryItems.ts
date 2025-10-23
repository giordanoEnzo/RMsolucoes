// hooks/useInventoryItems.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';

export function useInventoryItems() {
  return useQuery({
    queryKey: ['inventory_items'],
    queryFn: async () => {
      const { data, error } = await supabase.from('inventory_items').select('*');
      if (error) throw error;
      return data;
    },
  });
}
