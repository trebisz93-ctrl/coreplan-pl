import { useState, useRef } from 'react';
import { useClients, useProducts } from '@/hooks/useData';
import { useActivities, useCreateActivity } from '@/hooks/useActivities';
import { useImportHistory, useCreateImportHistory } from '@/hooks/useImportExport';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { generateTemplate, parseAndValidateImport, exportActivitiesToExcel, type ImportValidationError } from '@/lib/excelTemplate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Clock, XCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export const ImportExportView = () => {
  const { data: clients = [] } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const { data: products = [] } = useProducts();
  const selectedClient = clients.find(c => c.id === selectedClientId);
  const clientProducts = products.filter(p => p.client_id === selectedClientId || !p.client_id);
  const { data: activities = [] } = useActivities(selectedClientId || undefined, !!selectedClientId);
  const { data: history = [] } = useImportHistory();
  const createActivity = useCreateActivity();
  const createImportHistory = useCreateImportHistory();
  const { user } = useAuth();
  const { orgId } = useOrganization();

  const [importing, setImporting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ImportValidationError[]>([]);
  const [importSuccess, setImportSuccess] = useState<{ count: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    if (!selectedClient) { toast.error('Wybierz klienta'); return; }
    if (clientProducts.length === 0) {
      toast.error('Nie można pobrać wzoru pliku. Dla tego klienta nie zostały jeszcze skonfigurowane produkty.');
      return;
    }
    generateTemplate(selectedClient.name, clientProducts);
    toast.success('Szablon pobrany');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedClientId) { toast.error('Najpierw wybierz klienta'); return; }

    if (!file.name.endsWith('.xlsx')) {
      toast.error('Nieobsługiwany format pliku. Wymagany: .xlsx');
      return;
    }

    setImporting(true);
    setValidationErrors([]);
    setImportSuccess(null);

    try {
      const buffer = await file.arrayBuffer();
      const result = parseAndValidateImport(buffer, clientProducts);

      if (!result.success) {
        setValidationErrors(result.errors);
        await createImportHistory.mutateAsync({
          client_id: selectedClientId,
          client_name: selectedClient?.name || '',
          file_name: file.name,
          status: 'error',
          total_rows: result.totalRows,
          imported_rows: 0,
          error_count: result.errors.length,
          errors: result.errors,
        });
        toast.error(`Import nie został wykonany. Wykryto ${result.errors.length} błędów.`);
        return;
      }

      // Import activities one by one
      let imported = 0;
      const importErrors: any[] = [];

      for (const row of result.rows) {
        try {
          await createActivity.mutateAsync({
            client_id: selectedClientId,
            name: row.name,
            channel: row.channel,
            campaign_type: row.campaignType,
            start_date: row.startDate,
            end_date: row.endDate,
            product_ids: [row.productId],
            price: row.price,
            status: row.status,
            note: row.note || undefined,
            tags: row.tags,
          });
          imported++;
        } catch (err: any) {
          importErrors.push({ row: row.name, error: err.message });
        }
      }

      await createImportHistory.mutateAsync({
        client_id: selectedClientId,
        client_name: selectedClient?.name || '',
        file_name: file.name,
        status: importErrors.length > 0 ? 'partial' : 'success',
        total_rows: result.totalRows,
        imported_rows: imported,
        error_count: importErrors.length,
        errors: importErrors,
      });

      setImportSuccess({ count: imported });
      toast.success(`Import zakończony pomyślnie. Zaimportowano ${imported} aktywności.`);
    } catch (err: any) {
      toast.error('Błąd importu: ' + err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExport = () => {
    if (!selectedClient) { toast.error('Wybierz klienta'); return; }
    if (activities.length === 0) {
      toast.error('Brak aktywności do eksportu');
      return;
    }
    exportActivitiesToExcel(selectedClient.name, activities, clientProducts);
    toast.success('Eksport pobrany');
  };

  const noProducts = selectedClientId && clientProducts.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Import / Export</h1>
        <p className="text-muted-foreground text-sm mt-1">Masowe dodawanie aktywności przez Excel oraz eksport danych</p>
      </div>

      {/* Client selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Wybierz klienta</CardTitle>
          <CardDescription>Operacje importu i eksportu dotyczą wybranego klienta</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedClientId} onValueChange={v => { setSelectedClientId(v); setValidationErrors([]); setImportSuccess(null); }}>
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Wybierz klienta..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {noProducts && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Brak produktów</AlertTitle>
              <AlertDescription>
                Nie można pobrać wzoru pliku. Dla tego klienta nie zostały jeszcze skonfigurowane produkty.
                <Button variant="link" className="ml-2 h-auto p-0" onClick={() => window.location.href = '/products'}>
                  Przejdź do konfiguracji produktów
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {selectedClientId && (
        <Tabs defaultValue="import" className="space-y-4">
          <TabsList>
            <TabsTrigger value="import" className="gap-2"><Upload className="h-4 w-4" /> Import</TabsTrigger>
            <TabsTrigger value="export" className="gap-2"><Download className="h-4 w-4" /> Eksport</TabsTrigger>
            <TabsTrigger value="history" className="gap-2"><Clock className="h-4 w-4" /> Historia</TabsTrigger>
          </TabsList>

          {/* IMPORT TAB */}
          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  Krok 1: Pobierz szablon
                </CardTitle>
                <CardDescription>
                  Wygeneruj szablon Excel z listą produktów i polami do uzupełnienia
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleDownloadTemplate} disabled={!selectedClientId || !!noProducts} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" /> Pobierz szablon Excel
                </Button>
                <div className="mt-3 text-xs text-muted-foreground space-y-1">
                  <p>• Kolumna „Produkt" zawiera listę rozwijaną z produktami klienta</p>
                  <p>• Nie zmieniaj nazw, kolejności ani struktury kolumn</p>
                  <p>• Format dat: RRRR-MM-DD (np. 2026-01-15)</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Krok 2: Wgraj uzupełniony plik
                </CardTitle>
                <CardDescription>
                  System zwaliduje dane przed importem. Plik z błędami zostanie odrzucony.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing || !selectedClientId || !!noProducts}
                  className="gap-2"
                >
                  {importing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                      Importowanie...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" /> Wybierz plik .xlsx
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Validation errors */}
            {validationErrors.length > 0 && (
              <Card className="border-destructive">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-destructive flex items-center gap-2">
                    <XCircle className="h-5 w-5" />
                    Import nie został wykonany — {validationErrors.length} błędów
                  </CardTitle>
                  <CardDescription>
                    Popraw poniższe błędy w pliku Excel i spróbuj ponownie.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-80 overflow-auto space-y-2">
                    {validationErrors.map((err, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm p-2 rounded-md bg-destructive/5">
                        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium">
                            {err.row > 0 ? `Wiersz ${err.row}` : 'Ogólny'}
                            {err.column !== '-' && `, kolumna „${err.column}"`}
                          </span>
                          <span className="mx-1">—</span>
                          <span>{err.message}</span>
                          {err.hint && <span className="text-muted-foreground ml-1">({err.hint})</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Success */}
            {importSuccess && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-700 dark:text-green-400">Import zakończony pomyślnie</AlertTitle>
                <AlertDescription className="text-green-600 dark:text-green-300">
                  Zaimportowano {importSuccess.count} aktywności. Dane są widoczne w widoku klienta.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* EXPORT TAB */}
          <TabsContent value="export">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary" />
                  Eksport aktywności
                </CardTitle>
                <CardDescription>
                  Pobierz wszystkie aktywności klienta jako plik Excel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Button onClick={handleExport} disabled={activities.length === 0} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" /> Eksportuj do Excel
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {activities.length} aktywności do eksportu
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Historia importów
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Brak historii importów</p>
                ) : (
                  <div className="space-y-2">
                    {history.map(h => (
                      <div key={h.id} className="flex items-center justify-between p-3 rounded-md border text-sm">
                        <div className="flex items-center gap-3">
                          <Badge variant={h.status === 'success' ? 'default' : h.status === 'partial' ? 'secondary' : 'destructive'}>
                            {h.status === 'success' ? 'OK' : h.status === 'partial' ? 'Częściowy' : 'Błąd'}
                          </Badge>
                          <div>
                            <span className="font-medium">{h.client_name}</span>
                            <span className="text-muted-foreground ml-2">{h.file_name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-muted-foreground text-xs">
                          <span>{h.imported_rows}/{h.total_rows} wierszy</span>
                          {h.error_count > 0 && <span className="text-destructive">{h.error_count} błędów</span>}
                          <span>{format(new Date(h.created_at), 'dd.MM.yyyy HH:mm')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
