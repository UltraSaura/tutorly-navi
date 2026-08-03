export type ChildAccountActorRole = "guardian" | "admin";

export interface ResolveChildAccountAuthorizationInput {
  callerGuardianId: string | null;
  isAdmin: boolean;
  requestedGuardianUserId: string | null;
  requestedGuardianId: string | null;
  adminUserId: string;
}

export type ResolveChildAccountAuthorizationResult =
  | {
      ok: true;
      actorRole: ChildAccountActorRole;
      guardianId: string;
      actorKey: string;
    }
  | {
      ok: false;
      status: 400 | 403 | 404;
      error: string;
    };

export function resolveChildAccountAuthorization(
  input: ResolveChildAccountAuthorizationInput,
): ResolveChildAccountAuthorizationResult {
  if (input.callerGuardianId) {
    return {
      ok: true,
      actorRole: "guardian",
      guardianId: input.callerGuardianId,
      actorKey: input.callerGuardianId,
    };
  }

  if (!input.isAdmin) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden",
    };
  }

  if (!input.requestedGuardianUserId) {
    return {
      ok: false,
      status: 400,
      error: "Guardian target is required",
    };
  }

  if (!input.requestedGuardianId) {
    return {
      ok: false,
      status: 404,
      error: "Guardian target not found",
    };
  }

  return {
    ok: true,
    actorRole: "admin",
    guardianId: input.requestedGuardianId,
    actorKey: `admin:${input.adminUserId}`,
  };
}
