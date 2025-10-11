import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateChildRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  country: string;
  phoneNumber?: string;
  schoolLevel: string;
  relation: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Client for authenticated user
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Admin client for creating auth users
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the caller is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify the user is a guardian
    const { data: guardianData, error: guardianError } = await supabase
      .from('guardians')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (guardianError || !guardianData) {
      throw new Error('User is not a guardian');
    }

    const guardianId = guardianData.id;

    // Parse request body
    const body: CreateChildRequest = await req.json();
    const { email, password, firstName, lastName, country, phoneNumber, schoolLevel, relation } = body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !country || !schoolLevel || !relation) {
      throw new Error('Missing required fields');
    }

    // Generate username from email (remove @ and domain, add random suffix)
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Math.random().toString(36).substring(2, 8);

    // Create auth user
    const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        user_type: 'student',
        country,
        phone_number: phoneNumber || null,
        username: username,
      },
    });

    if (authCreateError || !authData.user) {
      console.error('Auth creation error:', authCreateError);
      throw new Error(`Failed to create auth account: ${authCreateError?.message}`);
    }

    const childUserId = authData.user.id;

    // The users table will be populated by the trigger (handle_new_user)
    // Wait a moment for the trigger to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create child profile
    const { data: childData, error: childError } = await supabaseAdmin
      .from('children')
      .insert({
        user_id: childUserId,
        grade: schoolLevel,
        curriculum: country,
        status: 'active',
        contact_email: email,
      })
      .select()
      .single();

    if (childError || !childData) {
      console.error('Child creation error:', childError);
      // Cleanup: delete auth user if child creation fails
      await supabaseAdmin.auth.admin.deleteUser(childUserId);
      throw new Error(`Failed to create child profile: ${childError?.message}`);
    }

    // Create guardian-child link
    const { error: linkError } = await supabaseAdmin
      .from('guardian_child_links')
      .insert({
        guardian_id: guardianId,
        child_id: childData.id,
        relation,
      });

    if (linkError) {
      console.error('Link creation error:', linkError);
      // Cleanup: delete auth user and child profile
      await supabaseAdmin.auth.admin.deleteUser(childUserId);
      await supabaseAdmin.from('children').delete().eq('id', childData.id);
      throw new Error(`Failed to link child to guardian: ${linkError.message}`);
    }

    console.log('Child account created successfully:', {
      childId: childData.id,
      userId: childUserId,
      guardianId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        child: {
          id: childData.id,
          user_id: childUserId,
          email,
          firstName,
          lastName,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating child account:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
