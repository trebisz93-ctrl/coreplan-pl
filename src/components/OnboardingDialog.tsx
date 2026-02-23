import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const jobRoles = [
  { value: 'kam', label: 'KAM' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'admin', label: 'Admin' },
  { value: 'other', label: 'Inne' },
];

interface Props {
  open: boolean;
  onComplete: () => void;
}

export const OnboardingDialog = ({ open, onComplete }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !jobRole) {
      toast.error('Wszystkie pola są wymagane');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          job_role: jobRole,
          display_name: `${firstName.trim()} ${lastName.trim()}`,
          onboarding_completed: true,
        } as any)
        .eq('user_id', user!.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['my_profile'] });
      qc.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profil uzupełniony!');
      onComplete();
    } catch (e: any) {
      toast.error('Błąd: ' + (e.message || 'Nieznany'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Uzupełnij swój profil</DialogTitle>
          <DialogDescription>
            Aby korzystać z systemu, uzupełnij poniższe dane. To zajmie chwilę.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Imię *</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Jan"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Nazwisko *</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Kowalski"
            />
          </div>
          <div className="space-y-2">
            <Label>Rola *</Label>
            <Select value={jobRole} onValueChange={setJobRole}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz rolę" />
              </SelectTrigger>
              <SelectContent>
                {jobRoles.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Zapisywanie...' : 'Zapisz i kontynuuj'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
