import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { toast } from '@/hooks/use-toast';

interface TransferNotificationListenerProps {
  userBranch: string;
  userId: string;
  onNewTransfer: () => void;
}

const TransferNotificationListener = ({ userBranch, userId, onNewTransfer }: TransferNotificationListenerProps) => {
  const { playNotificationSound } = useNotificationSound();
  const initializedRef = useRef(false);

  useEffect(() => {
    // Skip first render to avoid notifications on page load
    if (!initializedRef.current) {
      initializedRef.current = true;
    }

    const channel = supabase
      .channel('transfer-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transfers',
        },
        (payload) => {
          const transfer = payload.new as any;
          // Only notify if this transfer targets my branch and I didn't create it
          if (transfer.source_branch === userBranch && transfer.requester_user_id !== userId) {
            onNewTransfer();
            playNotificationSound();
            toast({
              title: '📦 Nueva solicitud de transferencia',
              description: `${transfer.brand} - ${transfer.product_code} (${transfer.requested_quantity} uds) desde ${transfer.requester_branch}`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transfers',
        },
        (payload) => {
          const transfer = payload.new as any;
          const old = payload.old as any;
          if (transfer.status !== old?.status) {
            // Notify requester when their transfer status changes
            if (transfer.requester_user_id === userId) {
              playNotificationSound();
              toast({
                title: '🔄 Transferencia actualizada',
                description: `${transfer.product_code}: ${old.status} → ${transfer.status}`,
              });
            }
            // Notify destination branch when a transfer is dispatched to them
            if (transfer.status === 'Despachada' && transfer.requester_branch === userBranch && transfer.requester_user_id !== userId) {
              playNotificationSound();
              toast({
                title: '🚚 Repuesto en camino',
                description: `${transfer.brand} - ${transfer.product_code} desde ${transfer.source_branch}`,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userBranch, userId, onNewTransfer, playNotificationSound]);

  return null;
};

export default TransferNotificationListener;
