import { useState, useRef, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, statusLabels, campaignTypeLabels, ActivityStatus, Channel, CampaignType } from '@/types/mediaplan';
import { useConfirmations, useUploadConfirmation, useSetCover, useDeleteConfirmation } from '@/hooks/useConfirmations';
import { useUpdateActivity, useDeleteActivity } from '@/hooks/useActivities';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useCampaignTypes } from '@/hooks/useCampaignTypes';
import { useProducts } from '@/hooks/useData';
import { useCanEdit } from '@/hooks/useRole';
import { Upload, Star, StarOff, Trash2, Image as ImageIcon, ExternalLink, Pencil, Save, X, Search } from 'lucide-react';
import { toast } from 'sonner';

const formatPLN = (n: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n);

interface Props {
  activity: Activity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
}

export const ActivityDetailDrawer = ({ activity, open, onOpenChange, clientId }: Props) => {
  const canEdit = useCanEdit();
  const { data: confirmations = [] } = useConfirmations(activity?.id);
  const uploadConfirmation = useUploadConfirmation();
  const setCover = useSetCover();
  const deleteConfirmation = useDeleteConfirmation();
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();
  const { data: allProducts = [] } = useProducts();
  const { data: campaignTypes = [] } = useCampaignTypes();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editChannel, setEditChannel] = useState<Channel>('online');
  const [editCampaignType, setEditCampaignType] = useState<string>('display');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editStatus, setEditStatus] = useState<ActivityStatus>('planned');
  const [editNote, setEditNote] = useState('');
  const [editProductIds, setEditProductIds] = useState<string[]>([]);
  const [editProductSearch, setEditProductSearch] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');

  const allCampaignTypes = [
    ...Object.entries(campaignTypeLabels).map(([k, v]) => ({ name: k, label: v })),
    ...campaignTypes.filter(ct => !campaignTypeLabels[ct.name as CampaignType]).map(ct => ({ name: ct.name, label: ct.label })),
  ];

  const getCampaignLabel = (type: string) => {
    const custom = campaignTypes.find(ct => ct.name === type);
    if (custom) return custom.label;
    return campaignTypeLabels[type as CampaignType] || type;
  };

  const filteredProducts = useMemo(() => {
    if (!editProductSearch) return allProducts;
    const q = editProductSearch.toLowerCase();
    return allProducts.filter(p =>
      p.name.toLowerCase().includes(q)
      || (p.ean && p.ean.toLowerCase().includes(q))
      || (p.brand && p.brand.toLowerCase().includes(q))
      || (p.category && p.category.toLowerCase().includes(q))
    );
  }, [allProducts, editProductSearch]);

  useEffect(() => {
    if (!editing || !activity) return;
    setEditName(activity.name);
    setEditChannel(activity.channel);
    setEditCampaignType(activity.campaignType);
    setEditStartDate(activity.startDate);
    setEditEndDate(activity.endDate);
    setEditPrice(String(activity.price));
    setEditStatus(activity.status);
    setEditNote(activity.note || '');
    setEditProductIds(activity.productIds || []);
    setEditTags(activity.tags || []);
  }, [editing, activity]);

  if (!activity) return null;

  const addEditTag = () => {
    const t = editTagInput.trim();
    if (t && !editTags.includes(t)) setEditTags(prev => [...prev, t]);
    setEditTagInput('');
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) { toast.error('Podaj nazwę'); return; }
    try {
      await updateActivity.mutateAsync({
        id: activity.id,
        name: editName.trim(),
        channel: editChannel,
        campaign_type: editCampaignType,
        start_date: editStartDate,
        end_date: editEndDate,
        price: parseFloat(editPrice) || 0,
        status: editStatus,
        note: editNote || null,
        product_ids: editProductIds,
        tags: editTags,
      });
      toast.success('Aktywność zaktualizowana');
      setEditing(false);
    } catch (e: any) {
      toast.error('Błąd: ' + (e.message || 'Nieznany błąd'));
    }
  };

  const handleUpload = async (files: FileList) => {
    for (const file of Array.from(files)) {
      try {
        await uploadConfirmation.mutateAsync({
          activityId: activity.id,
          file,
          isCover: confirmations.length === 0,
        });
        toast.success(`Przesłano: ${file.name}`);
      } catch (e: any) {
        toast.error(`Błąd przesyłania: ${e.message}`);
      }
    }

    if (activity.status !== 'completed' && activity.status !== 'cancelled') {
      toast.info('Dodano potwierdzenia. Zmień status na "Zrealizowane"?', {
        action: {
          label: 'Zmień status',
          onClick: async () => {
            try {
              await updateActivity.mutateAsync({ id: activity.id, status: 'completed' });
              toast.success('Status zmieniony na Zrealizowane');
            } catch {}
          },
        },
        duration: 8000,
      });
    }
  };

  const handleSetCover = async (confirmationId: string) => {
    try {
      await setCover.mutateAsync({ confirmationId, activityId: activity.id });
      toast.success('Cover ustawiony');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDeleteConfirmation = async (id: string) => {
    try {
      await deleteConfirmation.mutateAsync(id);
      toast.success('Potwierdzenie usunięte');
    } catch (e: any) { toast.error(e.message); }
  };

  const productNames = activity.productIds
    .map(pid => allProducts.find(p => p.id === pid)?.name)
    .filter(Boolean);

  return (
    <Sheet open={open} onOpenChange={v => { onOpenChange(v); if (!v) setEditing(false); }}>
      <SheetContent className="w-[480px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between pr-6">
            <SheetTitle className="text-lg">{activity.name}</SheetTitle>
            {canEdit && !editing && (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditing(true)}>
                  <Pencil className="h-3 w-3" /> Edytuj
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive">
                      <Trash2 className="h-3 w-3" /> Usuń
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Usunąć aktywność?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Usunięcie „{activity.name}" jest nieodwracalne. Wszystkie powiązane potwierdzenia również zostaną utracone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          try {
                            await deleteActivity.mutateAsync(activity.id);
                            toast.success('Aktywność usunięta');
                            onOpenChange(false);
                          } catch (e: any) {
                            toast.error('Błąd: ' + (e.message || 'Nie udało się usunąć'));
                          }
                        }}
                      >
                        Usuń
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </SheetHeader>
        <div className="space-y-6 mt-4">
          {editing ? (
            <div className="space-y-4">
              <div>
                <Label>Nazwa</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Kanał</Label>
                  <Select value={editChannel} onValueChange={v => setEditChannel(v as Channel)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Typ kampanii</Label>
                  <Select value={editCampaignType} onValueChange={setEditCampaignType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {allCampaignTypes.map(ct => (
                        <SelectItem key={ct.name} value={ct.name}>{ct.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data rozpoczęcia</Label>
                  <Input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} />
                </div>
                <div>
                  <Label>Data zakończenia</Label>
                  <Input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} />
                </div>
              </div>

              {/* Product selection */}
              <div>
                <Label>Produkty</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Szukaj produktu po nazwie, EAN, marce..."
                    value={editProductSearch}
                    onChange={e => setEditProductSearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
                <div className="space-y-1 mt-2 max-h-40 overflow-y-auto border border-border rounded-lg p-2">
                  {filteredProducts.map(p => (
                    <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
                      <Checkbox
                        checked={editProductIds.includes(p.id)}
                        onCheckedChange={checked => {
                          setEditProductIds(prev => checked ? [...prev, p.id] : prev.filter(x => x !== p.id));
                        }}
                      />
                      <span className="truncate">{p.name}</span>
                      {p.brand && <span className="text-xs text-muted-foreground">{p.brand}</span>}
                      {p.ean && <span className="text-xs text-muted-foreground font-mono">({p.ean})</span>}
                    </label>
                  ))}
                  {allProducts.length === 0 && (
                    <div className="text-xs text-muted-foreground py-2 text-center">Brak produktów w bazie</div>
                  )}
                </div>
                {editProductIds.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">Wybrano: {editProductIds.length}</div>
                )}
              </div>

              {/* Tags */}
              <div>
                <Label>Tagi</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="np. Promocja, Test..."
                    value={editTagInput}
                    onChange={e => setEditTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEditTag(); } }}
                    className="h-8 text-xs"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={addEditTag} className="h-8 text-xs">Dodaj</Button>
                </div>
                {editTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {editTags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs gap-1">
                        {tag}
                        <button onClick={() => setEditTags(prev => prev.filter(t => t !== tag))} className="ml-0.5">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cena (PLN)</Label>
                  <Input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} min="0" />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editStatus} onValueChange={v => setEditStatus(v as ActivityStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Zaplanowane</SelectItem>
                      <SelectItem value="in_progress">W trakcie</SelectItem>
                      <SelectItem value="completed">Zrealizowane</SelectItem>
                      <SelectItem value="cancelled">Anulowane</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Notatka</Label>
                <Textarea value={editNote} onChange={e => setEditNote(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveEdit} disabled={updateActivity.isPending} className="gap-1">
                  <Save className="h-3 w-3" /> {updateActivity.isPending ? 'Zapisywanie...' : 'Zapisz'}
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)} className="gap-1">
                  <X className="h-3 w-3" /> Anuluj
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{statusLabels[activity.status]}</Badge>
                <Badge variant="outline">{getCampaignLabel(activity.campaignType)}</Badge>
                <Badge variant="outline" className={activity.channel === 'online' ? 'border-online text-online' : 'border-offline text-offline'}>
                  {activity.channel}
                </Badge>
                {activity.tags?.map(tag => (
                  <Badge key={tag} variant="outline" className="border-primary/40 text-primary">🏷 {tag}</Badge>
                ))}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Okres</span>
                  <span>{activity.startDate} → {activity.endDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cena</span>
                  <span className="font-semibold">{formatPLN(activity.price)}</span>
                </div>
                {productNames.length > 0 && (
                  <div>
                    <span className="text-muted-foreground text-xs">Produkty:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {productNames.map((name, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {activity.note && (
                  <div>
                    <span className="text-muted-foreground text-xs">Notatka:</span>
                    <p className="text-sm mt-1">{activity.note}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Confirmations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Potwierdzenia ({confirmations.length})
              </h4>
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadConfirmation.isPending}
                >
                  <Upload className="h-3 w-3" />
                  {uploadConfirmation.isPending ? 'Przesyłanie...' : 'Dodaj zdjęcia'}
                </Button>
              )}
            </div>
            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden"
              onChange={e => e.target.files && handleUpload(e.target.files)} />
            <div className="grid grid-cols-2 gap-2">
              {confirmations.map(conf => (
                <div key={conf.id} className="relative group rounded-lg overflow-hidden border border-border">
                  <img src={conf.image_url} alt="" className="w-full h-32 object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                    {canEdit && (
                      <>
                        <Button size="icon" variant="secondary" className="h-7 w-7"
                          onClick={() => handleSetCover(conf.id)}>
                          {conf.is_cover ? <StarOff className="h-3 w-3" /> : <Star className="h-3 w-3" />}
                        </Button>
                        <Button size="icon" variant="secondary" className="h-7 w-7"
                          onClick={() => handleDeleteConfirmation(conf.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    {conf.link && (
                      <a href={conf.link} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="secondary" className="h-7 w-7">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </a>
                    )}
                  </div>
                  {conf.is_cover && (
                    <Badge className="absolute top-1 left-1 text-[9px] px-1 py-0">Cover</Badge>
                  )}
                </div>
              ))}
            </div>
            {confirmations.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-4">
                Brak potwierdzeń. Dodaj zdjęcia lub screenshoty.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
