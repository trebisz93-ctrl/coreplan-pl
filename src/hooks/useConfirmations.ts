import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface DbConfirmation {
  id: string;
  activity_id: string;
  user_id: string;
  image_url: string;
  link: string | null;
  is_cover: boolean;
  created_at: string;
}

export const useConfirmations = (activityId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['confirmations', activityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('confirmations')
        .select('*')
        .eq('activity_id', activityId!)
        .order('created_at');
      if (error) throw error;
      const confirmations = data as DbConfirmation[];

      // Generate signed URLs for private bucket
      const withSignedUrls = await Promise.all(
        confirmations.map(async (conf) => {
          // Extract storage path from URL if it's a full URL
          let storagePath = conf.image_url;
          const storagePrefix = '/storage/v1/object/public/confirmations/';
          const idx = storagePath.indexOf(storagePrefix);
          if (idx !== -1) {
            storagePath = storagePath.substring(idx + storagePrefix.length);
          }

          const { data: signedData } = await supabase.storage
            .from('confirmations')
            .createSignedUrl(storagePath, 3600); // 1 hour

          return {
            ...conf,
            image_url: signedData?.signedUrl || conf.image_url,
          };
        })
      );

      return withSignedUrls;
    },
    enabled: !!user && !!activityId,
  });
};

export const useUploadConfirmation = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ activityId, file, isCover = false }: { activityId: string; file: File; isCover?: boolean }) => {
      const ext = file.name.split('.').pop();
      const path = `${user!.id}/${activityId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('confirmations')
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('confirmations').getPublicUrl(path);
      const imageUrl = urlData.publicUrl;

      const { data, error } = await supabase
        .from('confirmations')
        .insert({ activity_id: activityId, user_id: user!.id, image_url: imageUrl, is_cover: isCover } as any)
        .select()
        .single();
      if (error) throw error;
      return data as DbConfirmation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['confirmations'] }),
  });
};

export const useSetCover = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ confirmationId, activityId }: { confirmationId: string; activityId: string }) => {
      // Unset all covers for this activity
      await supabase
        .from('confirmations')
        .update({ is_cover: false } as any)
        .eq('activity_id', activityId);
      // Set the new cover
      const { error } = await supabase
        .from('confirmations')
        .update({ is_cover: true } as any)
        .eq('id', confirmationId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['confirmations'] }),
  });
};

export const useDeleteConfirmation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('confirmations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['confirmations'] }),
  });
};
