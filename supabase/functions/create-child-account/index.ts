import {
  authenticateRequest,
  consumeRateLimit,
  createAdminClient,
  handleCors,
  jsonResponse,
  parseJsonBody,
  recordSecurityAuditEvent,
} from "../_shared/security.ts";
import { resolveChildAccountAuthorization } from "./authorization.ts";

const MAX_BODY_BYTES = Number(Deno.env.get("CREATE_CHILD_MAX_BODY_BYTES") ?? 20_000);
const REQUEST_LIMIT = Number(Deno.env.get("CREATE_CHILD_RATE_LIMIT") ?? 10);
const REQUEST_WINDOW_SECONDS = Number(Deno.env.get("CREATE_CHILD_RATE_WINDOW_SECONDS") ?? 3600);
const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

interface CreateChildRequest {
  username: string;
  password: string;
  firstName: string;
  lastName?: string;
  email?: string;
  country?: string;
  phoneNumber?: string;
  schoolLevel: string;
  relation: string;
  guardianUserId?: string;
}

async function getGuardianId(adminClient: ReturnType<typeof createAdminClient>, userId: string) {
  const { data, error } = await adminClient
    .from("guardians")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.id as string;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req, ["POST", "OPTIONS"]);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return jsonResponse(req, { success: false, error: "Method not allowed" }, 405);
  }

  let createdAuthUserId: string | null = null;
  let createdChildId: string | null = null;

  try {
    const auth = await authenticateRequest(req, { resolveAdmin: true });
    if (auth.response || !auth.context) {
      return auth.response!;
    }

    const { adminClient, user, requestId, isAdmin } = auth.context;
    const callerGuardianId = await getGuardianId(adminClient, user.id);

    const bodyResult = await parseJsonBody<CreateChildRequest>(req, MAX_BODY_BYTES);
    if (bodyResult.response || !bodyResult.data) {
      return bodyResult.response!;
    }

    const body = bodyResult.data;
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const relation = String(body.relation ?? "").trim().toLowerCase();
    const country = typeof body.country === "string" ? body.country.trim().toLowerCase() : null;
    const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : null;
    const schoolLevel = String(body.schoolLevel ?? "").trim().toLowerCase();
    const requestedGuardianUserId = typeof body.guardianUserId === "string" ? body.guardianUserId.trim() : "";

    const requestedGuardianId = isAdmin && requestedGuardianUserId
      ? await getGuardianId(adminClient, requestedGuardianUserId)
      : null;

    const authorization = resolveChildAccountAuthorization({
      callerGuardianId,
      isAdmin,
      requestedGuardianUserId: requestedGuardianUserId || null,
      requestedGuardianId,
      adminUserId: user.id,
    });

    if (!authorization.ok) {
      return jsonResponse(req, { success: false, error: authorization.error, requestId }, authorization.status);
    }

    const guardianId = authorization.guardianId;
    const actorRole = authorization.actorRole;

    const rateLimit = await consumeRateLimit(adminClient, {
      scope: "create-child-account",
      actorKey: authorization.actorKey,
      limit: REQUEST_LIMIT,
      windowSeconds: REQUEST_WINDOW_SECONDS,
    });

    if (!rateLimit.allowed) {
      return jsonResponse(req, { success: false, error: "Too many requests", requestId }, 429);
    }

    if (!username || !password || !firstName || !schoolLevel || !relation) {
      return jsonResponse(req, { success: false, error: "Invalid request body", requestId }, 400);
    }

    if (!USERNAME_RE.test(username)) {
      return jsonResponse(req, { success: false, error: "Invalid request body", requestId }, 400);
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse(req, { success: false, error: "Invalid request body", requestId }, 400);
    }

    const authEmail = `${username}@child.local`;
    const userMetadata = {
      first_name: firstName,
      last_name: lastName || "",
      user_type: "student",
      username,
      country,
      phone_number: phoneNumber,
      actual_email: email || null,
    };

    const { data: existingUser } = await adminClient
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    let childUserId = existingUser?.id ?? null;

    if (!childUserId) {
      const { data: authData, error: authCreateError } = await adminClient.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: userMetadata,
      });

      if (authCreateError || !authData.user) {
        console.error("[create-child-account] auth create failed", {
          requestId,
          message: authCreateError?.message,
        });
        return jsonResponse(req, { success: false, error: "Unable to create child account", requestId }, 409);
      }

      childUserId = authData.user.id;
      createdAuthUserId = childUserId;
      await new Promise((resolve) => setTimeout(resolve, 500));
    } else {
      const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(childUserId, {
        password,
        user_metadata: userMetadata,
      });

      if (updateAuthError) {
        console.error("[create-child-account] auth update failed", {
          requestId,
          message: updateAuthError.message,
        });
        return jsonResponse(req, { success: false, error: "Unable to create child account", requestId }, 409);
      }
    }

    const { error: userUpdateError } = await adminClient
      .from("users")
      .update({
        curriculum_country_code: country,
        curriculum_level_code: schoolLevel,
        country,
        level: schoolLevel,
        contact_email: email || null,
      })
      .eq("id", childUserId);

    if (userUpdateError) {
      throw new Error(`USER_UPDATE_FAILED:${userUpdateError.message}`);
    }

    const { data: existingChild } = await adminClient
      .from("children")
      .select("id")
      .eq("user_id", childUserId)
      .maybeSingle();

    let childId = existingChild?.id ?? null;

    if (!childId) {
      const { data: insertedChild, error: childInsertError } = await adminClient
        .from("children")
        .insert({
          user_id: childUserId,
          grade: schoolLevel,
          curriculum: country,
          curriculum_country_code: country,
          curriculum_level_code: schoolLevel,
          status: "active",
          contact_email: email || null,
        })
        .select("id")
        .single();

      if (childInsertError || !insertedChild) {
        throw new Error(`CHILD_CREATE_FAILED:${childInsertError?.message ?? "unknown"}`);
      }

      childId = insertedChild.id;
      createdChildId = childId;
    } else {
      const { error: childUpdateError } = await adminClient
        .from("children")
        .update({
          grade: schoolLevel,
          curriculum: country,
          curriculum_country_code: country,
          curriculum_level_code: schoolLevel,
          contact_email: email || null,
        })
        .eq("id", childId);

      if (childUpdateError) {
        throw new Error(`CHILD_UPDATE_FAILED:${childUpdateError.message}`);
      }
    }

    const { data: existingLinks } = await adminClient
      .from("guardian_child_links")
      .select("guardian_id")
      .eq("child_id", childId);

    const linkedToOtherGuardian = (existingLinks ?? []).some((link) => link.guardian_id !== guardianId);
    if (linkedToOtherGuardian) {
      return jsonResponse(req, { success: false, error: "Unable to create child account", requestId }, 409);
    }

    const alreadyLinked = (existingLinks ?? []).some((link) => link.guardian_id === guardianId);
    if (!alreadyLinked) {
      const { error: linkInsertError } = await adminClient
        .from("guardian_child_links")
        .insert({
          guardian_id: guardianId,
          child_id: childId,
          relation,
        });

      if (linkInsertError) {
        throw new Error(`LINK_CREATE_FAILED:${linkInsertError.message}`);
      }
    }

    await recordSecurityAuditEvent(adminClient, {
      requestId,
      scope: "create-child-account",
      eventType: "guardian_child_creation",
      outcome: "success",
      actorUserId: user.id,
      metadata: {
        actorRole,
        childUserId,
        guardianId,
        schoolLevel,
        country,
        alreadyLinked,
      },
    });

    return jsonResponse(req, {
      success: true,
      child: {
        id: childId,
        user_id: childUserId,
        email: email || null,
        firstName,
        lastName: lastName || "",
      },
      requestId,
    });
  } catch (error) {
    console.error("[create-child-account] request failed", {
      message: (error as Error).message || String(error),
    });

    if (createdChildId) {
      await createAdminClient().from("children").delete().eq("id", createdChildId);
    }

    if (createdAuthUserId) {
      await createAdminClient().auth.admin.deleteUser(createdAuthUserId);
    }

    return jsonResponse(req, {
      success: false,
      error: "Unable to create child account",
    }, 500);
  }
});
