import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useUserPermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    const fetch = async () => {
      const { data } = await (supabase as any)
        .from('user_permissions')
        .select('permission')
        .eq('user_id', user.id);
      setPermissions(data?.map(d => d.permission) || []);
      setLoading(false);
    };

    fetch();

    // Listen for realtime changes
    const channel = supabase
      .channel('user-perms-' + user.id)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_permissions',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetch();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const hasPermission = (perm: string) => permissions.includes(perm);

  return { permissions, loading, hasPermission };
};
