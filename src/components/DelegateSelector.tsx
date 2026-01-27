import { useState, useEffect } from 'react';
import { ChevronDown, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';

interface DelegateSelectorProps {
  userId: string;
  selectedOwner: string | null; // null = my own, string = delegated user id
  onOwnerChange: (ownerId: string | null) => void;
  onManageDelegates: () => void;
}

interface DelegatorInfo {
  owner_user_id: string;
  owner_name: string;
  owner_branch: string;
}

const DelegateSelector = ({
  userId,
  selectedOwner,
  onOwnerChange,
  onManageDelegates,
}: DelegateSelectorProps) => {
  const [delegators, setDelegators] = useState<DelegatorInfo[]>([]);

  const fetchDelegators = async () => {
    // Fetch delegations where current user is the delegate
    const { data: delegationsData, error } = await supabase
      .from('invoice_delegates')
      .select('owner_user_id')
      .eq('delegate_user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching delegators:', error);
      return;
    }

    if (!delegationsData || delegationsData.length === 0) {
      setDelegators([]);
      return;
    }

    // Fetch profiles for owners
    const ownerUserIds = delegationsData.map(d => d.owner_user_id);
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, full_name, branch')
      .in('user_id', ownerUserIds);

    const delegatorsWithProfiles: DelegatorInfo[] = (profilesData || []).map(p => ({
      owner_user_id: p.user_id,
      owner_name: p.full_name || 'Usuario',
      owner_branch: p.branch,
    }));

    setDelegators(delegatorsWithProfiles);
  };

  useEffect(() => {
    fetchDelegators();

    // Subscribe to changes in invoice_delegates
    const channel = supabase
      .channel('delegate_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoice_delegates',
          filter: `delegate_user_id=eq.${userId}`,
        },
        () => {
          fetchDelegators();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const getDisplayLabel = () => {
    if (!selectedOwner) {
      return 'Mis Entregados';
    }
    const delegator = delegators.find(d => d.owner_user_id === selectedOwner);
    return delegator ? `Ver: ${delegator.owner_name}` : 'Mis Entregados';
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            {selectedOwner ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
            {getDisplayLabel()}
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem
            onClick={() => onOwnerChange(null)}
            className={!selectedOwner ? 'bg-accent' : ''}
          >
            <User className="w-4 h-4 mr-2" />
            Mis Entregados
          </DropdownMenuItem>

          {delegators.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Pedidos Delegados
              </div>
              {delegators.map((delegator) => (
                <DropdownMenuItem
                  key={delegator.owner_user_id}
                  onClick={() => onOwnerChange(delegator.owner_user_id)}
                  className={selectedOwner === delegator.owner_user_id ? 'bg-accent' : ''}
                >
                  <Users className="w-4 h-4 mr-2" />
                  <div className="flex flex-col">
                    <span>{delegator.owner_name}</span>
                    <span className="text-xs text-muted-foreground">{delegator.owner_branch}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onManageDelegates}>
            <Users className="w-4 h-4 mr-2" />
            Gestionar Delegados
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default DelegateSelector;
