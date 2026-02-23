import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCheck, AlertCircle, CheckCircle2, AlertTriangle, Info, Bell } from 'lucide-react';
import { useNotifications, useMarkAsRead, useMarkAllAsRead, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';

const typeIcons: Record<string, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" />,
  info: <Info className="h-4 w-4 text-blue-500" />,
};

const categories = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'system', label: 'Systemowe' },
  { value: 'activity', label: 'Aktywności' },
  { value: 'account', label: 'Konta' },
  { value: 'budget', label: 'Budżet' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NotificationCenter = ({ open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">Centrum powiadomień</SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => markAllAsRead.mutate()}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Oznacz wszystkie
            </Button>
          </div>
        </SheetHeader>

        <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-3 w-auto justify-start">
            {categories.map(c => (
              <TabsTrigger key={c.value} value={c.value} className="text-xs">
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map(c => (
            <TabsContent key={c.value} value={c.value} className="flex-1 overflow-hidden mt-0">
              <NotificationList
                category={c.value}
                onMarkRead={(id) => markAsRead.mutate(id)}
                onNavigate={(path) => { navigate(path); onOpenChange(false); }}
              />
            </TabsContent>
          ))}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

const NotificationList = ({
  category,
  onMarkRead,
  onNavigate,
}: {
  category: string;
  onMarkRead: (id: string) => void;
  onNavigate: (path: string) => void;
}) => {
  const { data: notifications = [], isLoading } = useNotifications(category === 'all' ? undefined : category);

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground text-sm">Ładowanie...</div>;
  }

  if (notifications.length === 0) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Brak powiadomień</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-border">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`px-6 py-4 hover:bg-secondary/50 transition-colors cursor-pointer ${!n.is_read ? 'bg-primary/5' : ''}`}
            onClick={() => {
              if (!n.is_read) onMarkRead(n.id);
              if (n.cta_path) onNavigate(n.cta_path);
            }}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{typeIcons[n.type] || typeIcons.info}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{n.title}</span>
                  {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                </div>
                {n.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.description}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: pl })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
