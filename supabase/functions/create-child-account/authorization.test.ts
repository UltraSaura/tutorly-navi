import { describe, expect, it } from "vitest";
import { resolveChildAccountAuthorization } from "./authorization";

describe("resolveChildAccountAuthorization", () => {
  it("allows guardians to create children for their own guardian profile", () => {
    expect(
      resolveChildAccountAuthorization({
        callerGuardianId: "guardian-1",
        isAdmin: false,
        requestedGuardianUserId: null,
        requestedGuardianId: null,
        adminUserId: "admin-1",
      }),
    ).toEqual({
      ok: true,
      actorRole: "guardian",
      guardianId: "guardian-1",
      actorKey: "guardian-1",
    });
  });

  it("rejects non-guardian, non-admin callers", () => {
    expect(
      resolveChildAccountAuthorization({
        callerGuardianId: null,
        isAdmin: false,
        requestedGuardianUserId: null,
        requestedGuardianId: null,
        adminUserId: "admin-1",
      }),
    ).toEqual({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
  });

  it("requires admins to provide a target guardian", () => {
    expect(
      resolveChildAccountAuthorization({
        callerGuardianId: null,
        isAdmin: true,
        requestedGuardianUserId: null,
        requestedGuardianId: null,
        adminUserId: "admin-1",
      }),
    ).toEqual({
      ok: false,
      status: 400,
      error: "Guardian target is required",
    });
  });

  it("rejects admins when the target guardian does not exist", () => {
    expect(
      resolveChildAccountAuthorization({
        callerGuardianId: null,
        isAdmin: true,
        requestedGuardianUserId: "parent-user-1",
        requestedGuardianId: null,
        adminUserId: "admin-1",
      }),
    ).toEqual({
      ok: false,
      status: 404,
      error: "Guardian target not found",
    });
  });

  it("allows admins to create children for a selected guardian", () => {
    expect(
      resolveChildAccountAuthorization({
        callerGuardianId: null,
        isAdmin: true,
        requestedGuardianUserId: "parent-user-1",
        requestedGuardianId: "guardian-9",
        adminUserId: "admin-1",
      }),
    ).toEqual({
      ok: true,
      actorRole: "admin",
      guardianId: "guardian-9",
      actorKey: "admin:admin-1",
    });
  });
});
