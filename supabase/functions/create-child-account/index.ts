import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateChildRequest {
  username: string;        // NEW: Required username
  password: string;        // Required password
  firstName: string;
  lastName?: string;
  email?: string;          // NEW: Optional email for notifications
  country?: string;
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
    const { username, password, firstName, lastName, email, country, phoneNumber, schoolLevel, relation } = body;

    // Validate required fields
    if (!username || !password || !firstName || !schoolLevel || !relation) {
      throw new Error('Missing required fields: username, password, firstName, schoolLevel, and relation are required');
    }

    // Always use username@child.local as auth email for consistent username login
    const authEmail = `${username}@child.local`;

    // Create auth user with username
    const userMetadata = {
      first_name: firstName,
      last_name: lastName || '',
      user_type: 'student',
      username: username,
      country: country || null,
      phone_number: phoneNumber || null,
      actual_email: email || null,
    };

    let childUserId: string;

    const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (authCreateError) {
      // Handle case where auth user already exists (e.g. child was deleted and re-created)
      const isEmailExists = authCreateError.message?.toLowerCase().includes('already been registered') ||
        authCreateError.message?.toLowerCase().includes('email_exists') ||
        (authCreateError as any).code === 'email_exists';

      if (!isEmailExists) {
        console.error('Auth creation error:', authCreateError);
        throw new Error(`Failed to create auth account: ${authCreateError.message}`);
      }

      console.log('Auth user already exists for', authEmail, '— attempting to reuse');

      // Look up existing user by email
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw new Error(`Failed to list users: ${listError.message}`);

      const existingUser = listData.users.find((u: any) => u.email === authEmail);
      if (!existingUser) {
        throw new Error('User reportedly exists but could not be found');
      }

      // Check if this user is already an active child linked to ANOTHER guardian
      const { data: activeLinks } = await supabaseAdmin
        .from('guardian_child_links')
        .select('guardian_id, child_id')
        .eq('child_id', (await supabaseAdmin.from('children').select('id').eq('user_id', existingUser.id).maybeSingle()).data?.id || '00000000-0000-0000-0000-000000000000');

      if (activeLinks && activeLinks.length > 0) {
        // Check if any link belongs to a different guardian
        const { data: currentGuardian } = await supabaseAdmin
          .from('guardians')
          .select('id')
          .eq('user_id', user!.id)
          .single();

        const otherGuardianLink = activeLinks.find((l: any) => l.guardian_id !== currentGuardian?.id);
        if (otherGuardianLink) {
          throw new Error('This username is already linked to another guardian');
        }
      }

      // Update the existing auth user's metadata and password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password,
        user_metadata: userMetadata,
      });

      if (updateError) {
        console.error('Auth update error:', updateError);
        throw new Error(`Failed to update existing auth account: ${updateError.message}`);
      }

      childUserId = existingUser.id;
    } else if (!authData.user) {
      throw new Error('Failed to create auth account: no user returned');
    } else {
      childUserId = authData.user.id;
    }

    // The users table will be populated by the trigger (handle_new_user)
    // Wait a moment for the trigger to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if child profile already exists (idempotent creation)
    const { data: existingChild } = await supabaseAdmin
      .from('children')
      .select('id')
      .eq('user_id', childUserId)
      .maybeSingle();

    let childData;
    if (existingChild) {
      // Child already exists, reuse it
      childData = existingChild;
    } else {
      // Create child profile with optional email
      const { data: newChildData, error: childError } = await supabaseAdmin
        .from('children')
        .insert({
          user_id: childUserId,
          grade: schoolLevel,
          curriculum: country || null,
          status: 'active',
          contact_email: email || null,  // Use actual email if provided
        })
        .select()
        .single();

      if (childError || !newChildData) {
        console.error('Child creation error:', childError);
        // Cleanup: delete auth user if child creation fails
        await supabaseAdmin.auth.admin.deleteUser(childUserId);
        throw new Error(`Failed to create child profile: ${childError?.message}`);
      }
      childData = newChildData;
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
        error: (error as Error).message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
