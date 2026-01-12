import { Users } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface OnlineUser {
  user_id: string;
  user_name: string;
  branch: string;
  online_at: string;
}

interface OnlineUsersIndicatorProps {
  users: OnlineUser[];
}

const OnlineUsersIndicator = ({ users }: OnlineUsersIndicatorProps) => {
  const count = users.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative flex items-center gap-1 p-2 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors">
          <Users className="w-5 h-5 text-muted-foreground" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-3 border-b border-border">
          <h4 className="font-semibold text-sm">Usuarios en línea</h4>
          <p className="text-xs text-muted-foreground">
            {count === 0 ? 'No hay usuarios conectados' : `${count} usuario${count !== 1 ? 's' : ''} conectado${count !== 1 ? 's' : ''}`}
          </p>
        </div>
        {count > 0 && (
          <div className="max-h-60 overflow-y-auto">
            {users.map((user, index) => (
              <div
                key={`${user.user_id}-${index}`}
                className="flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors border-b border-border last:border-b-0"
              >
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.user_name || 'Usuario'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.branch}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(user.online_at), {
                    addSuffix: false,
                    locale: es,
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default OnlineUsersIndicator;
