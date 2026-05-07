import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

interface CreateStudentRequest {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  country?: string;
  phoneNumber?: string;
  schoolLevel: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body: CreateStudentRequest = await req.json();
    const {
      username: rawUsername,
      password,
      email: contactEmail,
      firstName,
      lastName,
      country: rawCountry,
      phoneNumber,
      schoolLevel: rawSchoolLevel,
    } = body;

    const username = String(rawUsername || '')
      .trim()
      .toLowerCase();

    const country = rawCountry?.toLowerCase() || undefined;
    const schoolLevel = rawSchoolLevel?.toLowerCase() || undefined;

    if (!password || !firstName || !lastName || !contactEmail || !schoolLevel) {
      throw new Error(
        'Missing required fields: username, password, first name, last name, email, and school level are required',
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(contactEmail).trim())) {
      throw new Error('Please enter a valid email address');
    }

    if (!username) {
      throw new Error('Username is required');
    }

    if (!USERNAME_RE.test(username)) {
      throw new Error(
        'Username must be 3–30 characters: lowercase letters, numbers, and underscores only',
      );
    }

    const authEmail = `${username}@student.local`;

    const { data: existingUsername } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existingUsername) {
      throw new Error('This username is already taken');
    }

    const userMetadata = {
      first_name: firstName,
      last_name: lastName,
      user_type: 'student',
      username,
      country: country || null,
      phone_number: phoneNumber || null,
      level: schoolLevel,
      actual_email: contactEmail,
    };

    const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (authCreateError) {
      const msg = authCreateError.message?.toLowerCase() || '';
      const isDup =
        msg.includes('already been registered') ||
        msg.includes('email_exists') ||
        (authCreateError as { code?: string }).code === 'email_exists';

      if (isDup) {
        throw new Error('This username is already taken');
      }
      console.error('Auth creation error:', authCreateError);
      throw new Error(`Failed to create account: ${authCreateError.message}`);
    }

    if (!authData.user) {
      throw new Error('Failed to create account: no user returned');
    }

    const userId = authData.user.id;

    await new Promise((r) => setTimeout(r, 500));

    const { error: userUpdateError } = await supabaseAdmin
      .from('users')
      .update({
        curriculum_country_code: country || null,
        curriculum_level_code: schoolLevel || null,
        country: country || null,
        level: schoolLevel || null,
        contact_email: contactEmail,
      })
      .eq('id', userId);

    if (userUpdateError) {
      console.error('User curriculum update error:', userUpdateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error creating student account:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
