import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Auth check — require valid admin/super_admin or internal cron secret
    const cronSecret = req.headers.get('x-workflow-secret');
    const internalCronKey = Deno.env.get('WORKFLOW_SECRET');
    const isCronCall = internalCronKey && cronSecret === internalCronKey;

    if (!isCronCall) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!roleData || !['admin', 'super_admin'].includes(roleData.role)) {
        return new Response(JSON.stringify({ error: 'Forbidden — admin role required' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().slice(0, 10);
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // 1. Activities starting today with status = planned → notify KAM
    const { data: startingToday } = await supabase
      .from('activities')
      .select('id, name, user_id, client_id')
      .eq('start_date', today)
      .eq('status', 'planned');

    for (const act of startingToday || []) {
      await supabase.from('notifications').insert({
        user_id: act.user_id,
        type: 'info',
        category: 'activity',
        title: `Czy aktywność "${act.name}" trwa?`,
        description: 'Aktywność miała rozpocząć się dzisiaj. Potwierdź, czy jest w trakcie realizacji.',
        entity_id: act.id,
        cta_path: '/',
      });
    }

    // 2. Activities with end_date < today and status = in_progress → mark completed + notify
    const { data: ended } = await supabase
      .from('activities')
      .select('id, name, user_id')
      .lt('end_date', today)
      .eq('status', 'in_progress');

    for (const act of ended || []) {
      await supabase
        .from('activities')
        .update({ status: 'completed' })
        .eq('id', act.id);

      await supabase.from('notifications').insert({
        user_id: act.user_id,
        type: 'warning',
        category: 'activity',
        title: `Aktywność "${act.name}" zakończona`,
        description: 'Aktywność została automatycznie oznaczona jako zrealizowana. Wymagany proof (zdjęcie).',
        entity_id: act.id,
        cta_path: '/',
      });
    }

    // 3. Activities starting in 3 days → reminder
    const { data: upcoming } = await supabase
      .from('activities')
      .select('id, name, user_id')
      .eq('start_date', threeDaysFromNow)
      .eq('status', 'planned');

    for (const act of upcoming || []) {
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('entity_id', act.id)
        .eq('title', `Zbliża się termin: "${act.name}"`)
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.from('notifications').insert({
          user_id: act.user_id,
          type: 'info',
          category: 'activity',
          title: `Zbliża się termin: "${act.name}"`,
          description: 'Aktywność rozpoczyna się za 3 dni.',
          entity_id: act.id,
          cta_path: '/',
        });
      }
    }

    return new Response(
      JSON.stringify({
        processed: {
          starting_today: startingToday?.length || 0,
          ended: ended?.length || 0,
          upcoming: upcoming?.length || 0,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
