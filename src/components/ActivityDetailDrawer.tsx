import { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, statusLabels, campaignTypeLabels, ActivityStatus, Channel, CampaignType } from '@/types/mediaplan';
import { useConfirmations, useUploadConfirmation, useSetCover, useDeleteConfirmation } from '@/hooks/useConfirmations';
import { useUpdateActivity } from '@/hooks/useActivities';
import { useCampaignTypes } from '@/hooks/useCampaignTypes';
import { useProducts } from '@/hooks/useData';
import { useCanEdit } from '@/hooks/useRole';
import { Upload, Star, StarOff, Trash2, Image as ImageIcon, ExternalLink, Pencil, Save, X } from 'lucide-react';
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
  const { data: products = [] } = useProducts(clientId);
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

  // Merge campaign types
  const allCampaignTypes = [
    ...Object.entries(campaignTypeLabels).map(([k, v]) => ({ name: k, label: v })),
    ...campaignTypes.filter(ct => !campaignTypeLabels[ct.name as CampaignType]).map(ct => ({ name: ct.name, label: ct.label })),
  ];

  const getCampaignLabel = (type: string) => {
    const custom = campaignTypes.find(ct => ct.name === type);
    if (custom) return custom.label;
    return campaignTypeLabels[type as CampaignType] || type;
  };

  useEffect(() => {
    if (!editing) return;
    if (!activity) return;
    setEditName(activity.name);
    setEditChannel(activity.channel);
    setEditCampaignType(activity.campaignType);
    setEditStartDate(activity.startDate);
    setEditEndDate(activity.endDate);
    setEditPrice(String(activity.price));
    setEditStatus(activity.status);
    setEditNote(activity.note || '');
  }, [editing, activity]);

  if (!activity) return null;

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
    .map(pid => products.find(p => p.id === pid)?.name)
    .filter(Boolean);

  return (
    <Sheet open={open} onOpenChange={v => { onOpenChange(v); if (!v) setEditing(false); }}>
      <SheetContent className="w-[480px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between pr-6">
            <SheetTitle className="text-lg">{activity.name}</SheetTitle>
            {canEdit && !editing && (
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditing(true)}>
                <Pencil className="h-3 w-3" /> Edytuj
              </Button>
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
              {/* Status & type */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{statusLabels[activity.status]}</Badge>
                <Badge variant="outline">{getCampaignLabel(activity.campaignType)}</Badge>
                <Badge variant="outline" className={activity.channel === 'online' ? 'border-online text-online' : 'border-offline text-offline'}>
                  {activity.channel}
                </Badge>
              </div>

              {/* Details */}
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

          {/* Confirmations / Proofs */}
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
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => e.target.files && handleUpload(e.target.files)}
            />

            {confirmations.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Brak potwierdzeń. Dodaj zdjęcia, aby udokumentować realizację.</p>
            )}

            <div className="grid grid-cols-2 gap-2">
              {confirmations.map(conf => (
                <div key={conf.id} className="relative group rounded-lg overflow-hidden border border-border">
                  <img
                    src={conf.image_url}
                    alt="Potwierdzenie"
                    className="w-full h-28 object-cover"
                  />
                  {conf.is_cover && (
                    <Badge className="absolute top-1 left-1 text-[10px]" variant="default">Cover</Badge>
                  )}
                  {canEdit && (
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-6 w-6"
                        onClick={() => handleSetCover(conf.id)}
                        title={conf.is_cover ? 'Jest cover' : 'Ustaw jako cover'}
                      >
                        {conf.is_cover ? <StarOff className="h-3 w-3" /> : <Star className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-6 w-6"
                        onClick={() => handleDeleteConfirmation(conf.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {conf.link && (
                    <a href={conf.link} target="_blank" rel="noopener noreferrer"
                      className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="h-3 w-3 text-foreground" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
