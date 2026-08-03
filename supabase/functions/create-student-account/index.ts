import {
  authenticateRequest,
  consumeRateLimit,
  handleCors,
  jsonResponse,
  parseJsonBody,
  recordSecurityAuditEvent,
} from "../_shared/security.ts";

const MAX_BODY_BYTES = Number(Deno.env.get("CREATE_STUDENT_MAX_BODY_BYTES") ?? 20_000);
const REQUEST_LIMIT = Number(Deno.env.get("CREATE_STUDENT_RATE_LIMIT") ?? 5);
const REQUEST_WINDOW_SECONDS = Number(Deno.env.get("CREATE_STUDENT_RATE_WINDOW_SECONDS") ?? 3600);

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
  const corsResponse = handleCors(req, ["POST", "OPTIONS"]);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return jsonResponse(req, { success: false, error: "Method not allowed" }, 405);
  }

  try {
    const auth = await authenticateRequest(req, { requireAdmin: true });
    if (auth.response || !auth.context) {
      return auth.response!;
    }

    const { adminClient: supabaseAdmin, user, requestId } = auth.context;
    const bodyResult = await parseJsonBody<CreateStudentRequest>(req, MAX_BODY_BYTES);
    if (bodyResult.response || !bodyResult.data) {
      return bodyResult.response!;
    }

    const rateLimit = await consumeRateLimit(supabaseAdmin, {
      scope: "create-student-account",
      actorKey: `admin:${user.id}`,
      limit: REQUEST_LIMIT,
      windowSeconds: REQUEST_WINDOW_SECONDS,
    });

    if (!rateLimit.allowed) {
      return jsonResponse(req, { success: false, error: "Too many requests", requestId }, 429);
    }

    const body: CreateStudentRequest = bodyResult.data;
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
      return jsonResponse(req, { success: false, error: 'Invalid registration data', requestId }, 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(contactEmail).trim())) {
      return jsonResponse(req, { success: false, error: 'Invalid registration data', requestId }, 400);
    }

    if (!username) {
      return jsonResponse(req, { success: false, error: 'Invalid registration data', requestId }, 400);
    }

    if (!USERNAME_RE.test(username)) {
      return jsonResponse(req, { success: false, error: 'Invalid registration data', requestId }, 400);
    }

    const authEmail = `${username}@student.local`;

    const { data: existingUsername } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existingUsername) {
      return jsonResponse(req, { success: false, error: 'Unable to create account', requestId }, 409);
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
        return jsonResponse(req, { success: false, error: 'Unable to create account', requestId }, 409);
      }
      console.error('[create-student-account] auth create failed', { message: authCreateError.message });
      return jsonResponse(req, { success: false, error: 'Unable to create account', requestId }, 500);
    }

    if (!authData.user) {
      return jsonResponse(req, { success: false, error: 'Unable to create account', requestId }, 500);
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
      console.error('[create-student-account] user profile update failed', { message: userUpdateError.message });
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return jsonResponse(req, { success: false, error: 'Unable to create account', requestId }, 500);
    }

    await recordSecurityAuditEvent(supabaseAdmin, {
      requestId,
      scope: "create-student-account",
      eventType: "admin_student_creation",
      outcome: "success",
      actorUserId: user.id,
      metadata: {
        createdUserId: userId,
        username,
        schoolLevel,
        country: country || null,
      },
    });

    return jsonResponse(req, {
        success: true,
        user_id: userId,
        requestId,
      });
  } catch (error) {
    console.error('[create-student-account] request failed', {
      message: (error as Error).message || String(error),
    });
    return jsonResponse(req, {
        success: false,
        error: 'Unable to create account',
      }, 500);
  }
});
