
INSERT INTO public.profiles (user_id, display_name, status, organization_id, onboarding_completed)
VALUES (
  'ab7e1532-918c-4ff3-8d8a-9dcfd90fc78e',
  'tomasz.rebisz@danone.com',
  'active',
  '2d28e4bf-cbda-4b76-8eb3-177ad0de7ba1',
  true
);

INSERT INTO public.organization_members (user_id, organization_id, org_role)
VALUES (
  'ab7e1532-918c-4ff3-8d8a-9dcfd90fc78e',
  '2d28e4bf-cbda-4b76-8eb3-177ad0de7ba1',
  'org_admin'
);
