import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Props {
  userId: string | null;
  userName: string;
  onOpenChange: (open: boolean) => void;
}

interface UserDetails {
  user: {
    email: string;
    created_at: string;
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
    banned_until: string | null;
  };
  memberships: Array<{ organization_id: string; org_role: string; org_name: string }>;
  globalRoles: string[];
}

const fmt = (d: string | null) => d ? new Date(d).toLocaleString('pl-PL') : '—';

// Panel tylko-do-odczytu dla super_admina — celowo ODDZIELNY od impersonateUser
// (przycisk "Podejrzyj"), który przełącza cały widok w tryb podszywania się
// pod użytkownika. Tu nic się nie przełącza — to czysty wgląd w dane konta,
// żeby szybko zdiagnozować sytuację użytkownika bez wchodzenia w jego widok.
export const UserDetailsDialog = ({ userId, userName, onOpenChange }: Props) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user-details', userId],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-details`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({ target_user_id: userId }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Nie udało się pobrać danych');
      return json as UserDetails;
    },
    enabled: !!userId,
  });

  return (
    <Dialog open={!!userId} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Szczegóły konta — {userName}</DialogTitle>
          <DialogDescription>Podgląd tylko do odczytu, bez wpływu na konto użytkownika.</DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground py-8 text-center">Ładowanie…</p>}
        {error && <p className="text-sm text-destructive py-4">{(error as Error).message}</p>}

        {data && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-[140px_1fr] gap-y-2">
              <span className="text-muted-foreground">E-mail</span>
              <span className="font-medium">{data.user.email}</span>

              <span className="text-muted-foreground">Konto utworzone</span>
              <span>{fmt(data.user.created_at)}</span>

              <span className="text-muted-foreground">Ostatnie logowanie</span>
              <span>{fmt(data.user.last_sign_in_at)}</span>

              <span className="text-muted-foreground">E-mail potwierdzony</span>
              <span>
                {data.user.email_confirmed_at
                  ? <Badge variant="outline" className="text-green-600 border-green-300">Tak — {fmt(data.user.email_confirmed_at)}</Badge>
                  : <Badge variant="outline" className="text-amber-600 border-amber-300">Nie — zaproszenie oczekuje</Badge>}
              </span>

              {data.user.banned_until && (
                <>
                  <span className="text-muted-foreground">Zablokowane do</span>
                  <span className="text-destructive">{fmt(data.user.banned_until)}</span>
                </>
              )}
            </div>

            <Separator />

            <div>
              <p className="text-muted-foreground mb-2">Role globalne</p>
              {data.globalRoles.length === 0
                ? <span className="text-muted-foreground text-xs">Brak (zwykły użytkownik)</span>
                : (
                  <div className="flex flex-wrap gap-1">
                    {data.globalRoles.map((r) => <Badge key={r}>{r}</Badge>)}
                  </div>
                )}
            </div>

            <div>
              <p className="text-muted-foreground mb-2">Organizacje ({data.memberships.length})</p>
              {data.memberships.length === 0
                ? <span className="text-muted-foreground text-xs">Brak przypisania do żadnej organizacji</span>
                : (
                  <div className="space-y-1.5">
                    {data.memberships.map((m) => (
                      <div key={m.organization_id} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-1.5">
                        <span>{m.org_name}</span>
                        <Badge variant="outline">{m.org_role}</Badge>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
