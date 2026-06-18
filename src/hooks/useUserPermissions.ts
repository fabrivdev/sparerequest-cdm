import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Module-level cache so navigating between pages doesn't flash a loading screen
const cache: { userId: string | null; permissions: string[] } = { userId: null, permissions: [] };
const listeners = new Set<(perms: string[]) => void>();

const notify = (perms: string[]) => {
  cache.permissions = perms;
  listeners.forEach(l => l(perms));
};

export const useUserPermissions = () => {
  const { user } = useAuth();
  const hasCache = cache.userId === user?.id && user?.id != null;
  const [permissions, setPermissions] = useState<string[]>(hasCache ? cache.permissions : []);
  const [loading, setLoading] = useState(!hasCache);

  useEffect(() => {
    if (!user?.id) {
      cache.userId = null;
      cache.permissions = [];
      setPermissions([]);
      setLoading(false);
      return;
    }

    // Subscribe to cache updates from other mounts
    const listener = (perms: string[]) => setPermissions(perms);
    listeners.add(listener);

    const fetchPerms = async () => {
      const { data } = await (supabase as any)
        .from('user_permissions')
        .select('permission')
        .eq('user_id', user.id);
      const perms = data?.map((d: any) => d.permission) || [];
      cache.userId = user.id;
      notify(perms);
      setLoading(false);
    };

    // If user changed, invalidate cache
    if (cache.userId !== user.id) {
      cache.userId = user.id;
      cache.permissions = [];
      setLoading(true);
    } else {
      // Already have cached perms — show them immediately, refresh in background
      setLoading(false);
    }

    fetchPerms();

    // Listen for realtime changes
    const channel = supabase
      .channel(`user-perms-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_permissions',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchPerms();
      })
      .subscribe();

    return () => {
      listeners.delete(listener);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const hasPermission = (perm: string) => permissions.includes(perm);

  return { permissions, loading, hasPermission };
};
