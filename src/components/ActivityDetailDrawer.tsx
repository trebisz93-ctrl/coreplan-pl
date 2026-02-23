import { useState, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Activity, statusLabels, campaignTypeLabels } from '@/types/mediaplan';
import { useConfirmations, useUploadConfirmation, useSetCover, useDeleteConfirmation } from '@/hooks/useConfirmations';
import { useUpdateActivity } from '@/hooks/useActivities';
import { useProducts } from '@/hooks/useData';
import { useCanEdit } from '@/hooks/useRole';
import { Upload, Star, StarOff, Trash2, Image as ImageIcon, ExternalLink } from 'lucide-react';
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
  const fileRef = useRef<HTMLInputElement>(null);

  if (!activity) return null;

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

    // Suggest status change if not completed
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
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDeleteConfirmation = async (id: string) => {
    try {
      await deleteConfirmation.mutateAsync(id);
      toast.success('Potwierdzenie usunięte');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const productNames = activity.productIds
    .map(pid => products.find(p => p.id === pid)?.name)
    .filter(Boolean);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">{activity.name}</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 mt-4">
          {/* Status & type */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{statusLabels[activity.status]}</Badge>
            <Badge variant="outline">{campaignTypeLabels[activity.campaignType]}</Badge>
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
