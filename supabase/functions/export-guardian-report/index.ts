import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { childId, format = 'csv' } = await req.json();

    // Get guardian data
    const { data: guardian } = await supabase
      .from('guardians')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!guardian) {
      throw new Error('Not a guardian');
    }

    // Verify guardian has access to this child
    const { data: link } = await supabase
      .from('guardian_child_links')
      .select('child_id')
      .eq('guardian_id', guardian.id)
      .eq('child_id', childId)
      .single();

    if (!link) {
      throw new Error('No access to this child');
    }

    // Get child info
    const { data: child } = await supabase
      .from('children')
      .select('id, users!inner(first_name, last_name, level)')
      .eq('id', childId)
      .single();

    // Get exercise history
    const { data: exercises } = await supabase
      .from('exercise_history')
      .select('*')
      .eq('user_id', (child as any).users.id)
      .order('created_at', { ascending: false });

    if (format === 'csv') {
      const csv = generateCSV(child, exercises || []);
      return new Response(csv, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="child-report-${childId}.csv"`,
        },
      });
    }

    throw new Error('Unsupported format');
  } catch (error) {
    console.error('Error generating report:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateCSV(child: any, exercises: any[]): string {
  const childName = `${child.users.first_name} ${child.users.last_name}`;
  const rows = [
    ['Child Progress Report'],
    [''],
    ['Child Name', childName],
    ['Grade Level', child.users.level || 'N/A'],
    ['Report Generated', new Date().toISOString()],
    [''],
    ['Date', 'Subject', 'Exercise', 'Result', 'Attempts', 'Time Spent (seconds)'],
  ];

  for (const exercise of exercises) {
    rows.push([
      new Date(exercise.created_at).toLocaleDateString(),
      exercise.subject_id || 'General',
      exercise.exercise_content.substring(0, 100),
      exercise.is_correct ? 'Correct' : 'Incorrect',
      exercise.attempts_count.toString(),
      exercise.time_spent_seconds.toString(),
    ]);
  }

  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}
