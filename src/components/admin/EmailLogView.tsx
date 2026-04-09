import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Mail, RefreshCw, Search, Send, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const templateLabels: Record<string, string> = {
  signup: 'Rejestracja',
  invite: 'Zaproszenie',
  recovery: 'Odzyskiwanie hasła',
  magic_link: 'Magic Link',
  email_change: 'Zmiana e-mail',
  reauthentication: 'Ponowna autoryzacja',
  auth_emails: 'Autoryzacja',
};

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
  sent: { label: 'Wysłany', variant: 'default', icon: CheckCircle },
  pending: { label: 'W kolejce', variant: 'secondary', icon: Clock },
  dlq: { label: 'Błąd (DLQ)', variant: 'destructive', icon: XCircle },
  failed: { label: 'Nieudany', variant: 'destructive', icon: XCircle },
  suppressed: { label: 'Zablokowany', variant: 'outline', icon: AlertCircle },
  bounced: { label: 'Odrzucony', variant: 'destructive', icon: XCircle },
  complained: { label: 'Zgłoszony', variant: 'destructive', icon: AlertCircle },
};

type TimeRange = '24h' | '7d' | '30d' | 'all';

export const EmailLogView = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [resending, setResending] = useState<string | null>(null);

  const getStartDate = (range: TimeRange) => {
    if (range === 'all') return null;
    const now = new Date();
    if (range === '24h') now.setHours(now.getHours() - 24);
    else if (range === '7d') now.setDate(now.getDate() - 7);
    else if (range === '30d') now.setDate(now.getDate() - 30);
    return now.toISOString();
  };

  const { data: emails = [], isLoading, refetch } = useQuery({
    queryKey: ['email_log', timeRange, statusFilter, templateFilter],
    queryFn: async () => {
      let query = supabase
        .from('email_send_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      const startDate = getStartDate(timeRange);
      if (startDate) query = query.gte('created_at', startDate);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (templateFilter !== 'all') query = query.eq('template_name', templateFilter);

      const { data, error } = await query;
      if (error) throw error;

      // Deduplicate by message_id — keep latest status
      const byMessageId = new Map<string, any>();
      for (const row of data || []) {
        const key = row.message_id || row.id;
        const existing = byMessageId.get(key);
        if (!existing || new Date(row.created_at) > new Date(existing.created_at)) {
          byMessageId.set(key, row);
        }
      }
      return Array.from(byMessageId.values());
    },
    staleTime: 30_000,
  });

  const filteredEmails = emails.filter((e: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.recipient_email?.toLowerCase().includes(q) ||
      e.template_name?.toLowerCase().includes(q) ||
      e.error_message?.toLowerCase().includes(q);
  });

  // Stats
  const stats = {
    total: emails.length,
    sent: emails.filter((e: any) => e.status === 'sent').length,
    pending: emails.filter((e: any) => e.status === 'pending').length,
    failed: emails.filter((e: any) => ['dlq', 'failed', 'bounced'].includes(e.status)).length,
    suppressed: emails.filter((e: any) => ['suppressed', 'complained'].includes(e.status)).length,
  };

  // Distinct templates
  const templates = [...new Set(emails.map((e: any) => e.template_name))].filter(Boolean);

  const handleResend = async (email: any) => {
    setResending(email.id);
    try {
      // Re-invoke the auth email hook or transactional email based on template
      const { error } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: email.template_name,
          recipientEmail: email.recipient_email,
          idempotencyKey: `resend-${email.id}-${Date.now()}`,
          templateData: email.metadata || {},
        },
      });
      if (error) throw error;
      toast.success(`E-mail ponownie wysłany do ${email.recipient_email}`);
      refetch();
    } catch (e: any) {
      toast.error('Błąd wysyłania: ' + e.message);
    } finally {
      setResending(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Dziennik e-maili
          </h1>
          <p className="text-muted-foreground">Historia wszystkich e-maili wysłanych z systemu CorePlan.</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Odśwież
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Łącznie</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.sent}</p>
            <p className="text-xs text-muted-foreground">Wysłane</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-accent-foreground">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">W kolejce</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
            <p className="text-xs text-muted-foreground">Błędy</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{stats.suppressed}</p>
            <p className="text-xs text-muted-foreground">Zablokowane</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1">
              {(['24h', '7d', '30d', 'all'] as TimeRange[]).map(range => (
                <Button
                  key={range}
                  size="sm"
                  variant={timeRange === range ? 'default' : 'outline'}
                  onClick={() => setTimeRange(range)}
                >
                  {range === '24h' ? '24h' : range === '7d' ? '7 dni' : range === '30d' ? '30 dni' : 'Wszystkie'}
                </Button>
              ))}
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie statusy</SelectItem>
                <SelectItem value="sent">Wysłane</SelectItem>
                <SelectItem value="pending">W kolejce</SelectItem>
                <SelectItem value="dlq">Błędy (DLQ)</SelectItem>
                <SelectItem value="failed">Nieudane</SelectItem>
                <SelectItem value="suppressed">Zablokowane</SelectItem>
              </SelectContent>
            </Select>
            <Select value={templateFilter} onValueChange={setTemplateFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Typ e-maila" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie typy</SelectItem>
                {templates.map(t => (
                  <SelectItem key={t} value={t}>{templateLabels[t] || t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj po adresie e-mail..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Lista e-maili ({filteredEmails.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredEmails.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Brak e-maili w wybranym zakresie.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Typ</TableHead>
                    <TableHead>Odbiorca</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data wysłania</TableHead>
                    <TableHead>Błąd</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmails.map((email: any) => {
                    const sc = statusConfig[email.status] || statusConfig.pending;
                    const StatusIcon = sc.icon;
                    return (
                      <TableRow key={email.id}>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {templateLabels[email.template_name] || email.template_name}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{email.recipient_email}</TableCell>
                        <TableCell>
                          <Badge variant={sc.variant} className="gap-1 text-xs">
                            <StatusIcon className="h-3 w-3" />
                            {sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(email.created_at).toLocaleString('pl-PL', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell className="text-xs text-destructive max-w-[200px] truncate" title={email.error_message || ''}>
                          {email.error_message || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 text-primary"
                                disabled={resending === email.id}
                              >
                                {resending === email.id ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Send className="h-3 w-3" />
                                )}
                                Wyślij ponownie
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Wyślij ponownie e-mail</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Czy na pewno chcesz ponownie wysłać e-mail typu „{templateLabels[email.template_name] || email.template_name}" na adres <strong>{email.recipient_email}</strong>?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleResend(email)}>
                                  Wyślij ponownie
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
