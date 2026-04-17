-- Mark all org-invited users as onboarding_completed (admin already provided their data and role)
UPDATE public.profiles p
SET onboarding_completed = true
WHERE EXISTS (
  SELECT 1 FROM public.organization_members om
  WHERE om.user_id = p.user_id
)
AND p.onboarding_completed = false;