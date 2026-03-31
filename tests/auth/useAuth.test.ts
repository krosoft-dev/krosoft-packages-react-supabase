import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuth } from "@/hooks/behaviors/useAuth";

describe("useAuth", () => {
  it("lance une erreur si utilisé hors AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrowError("useAuth must be used within an AuthProvider");
  });
});
