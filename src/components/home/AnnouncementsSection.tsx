import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const AnnouncementsSection = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase as any)
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);
      setAnnouncements(data || []);
    };
    fetch();

    const ch = supabase.channel('home-announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (announcements.length === 0) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-primary" />
          Avisos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {announcements.map((a) => (
          <div key={a.id} className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
            <p className="text-sm font-medium text-foreground">{a.title}</p>
            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{a.content}</p>
            <p className="text-[10px] text-muted-foreground mt-2">
              {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: es })}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default AnnouncementsSection;
