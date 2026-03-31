import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useSupabaseQuery } from "../../src/hooks/useSupabaseQuery";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
};

describe("useSupabaseQuery", () => {
  it("retourne les données si la query réussit", async () => {
    const { result } = renderHook(
      () =>
        useSupabaseQuery(["test"], async () => ({
          data: { id: "1", name: "test" },
          error: null,
        })),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: "1", name: "test" });
  });

  it("retourne une erreur si Supabase retourne une erreur", async () => {
    const { result } = renderHook(
      () =>
        useSupabaseQuery(["test-error"], async () => ({
          data: null,
          error: { message: "not found", code: "404", details: "", hint: "", name: "PostgrestError" },
        })),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("not found");
  });
});
