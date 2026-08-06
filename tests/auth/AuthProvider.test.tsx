import { describe, it, expect, afterEach } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AuthChangeEvent, Session, SupabaseClient } from "@supabase/supabase-js";
import { AuthProvider } from "../../src/providers/AuthProvider";

/* eslint-disable @typescript-eslint/naming-convention -- les champs d'une session sont imposés par l'API Supabase. */
const buildSession = (userId: string): Session =>
  ({
    access_token: "access-token",
    refresh_token: "refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    user: { id: userId, aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "" },
  }) as unknown as Session;
/* eslint-enable @typescript-eslint/naming-convention */

type AuthListener = (event: AuthChangeEvent, session: Session | null) => void;

interface FakeClient {
  client: SupabaseClient;
  emit: (event: AuthChangeEvent, session: Session | null) => void;
}

/** Client Supabase minimal : on garde la main sur le listener pour rejouer les events d'auth. */
const createFakeClient = (session: Session | null): FakeClient => {
  let listener: AuthListener | null = null;

  const client = {
    auth: {
      getSession: () => Promise.resolve({ data: { session }, error: null }),
      onAuthStateChange: (callback: AuthListener) => {
        listener = callback;
        callback("INITIAL_SESSION", session);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
  } as unknown as SupabaseClient;

  const emit = (event: AuthChangeEvent, newSession: Session | null): void => {
    act(() => {
      listener?.(event, newSession);
    });
  };

  return { client, emit };
};

/** Monte le provider pour un utilisateur connecté, avec une donnée déjà en cache. */
const renderProvider = async (session: Session | null): Promise<{ queryClient: QueryClient; emit: FakeClient["emit"] }> => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { client, emit } = createFakeClient(session);

  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider client={client} navigate={() => {}}>
        <div>contenu</div>
      </AuthProvider>
    </QueryClientProvider>,
  );

  await screen.findByText("contenu");
  queryClient.setQueryData(["medias"], ["un média"]);

  return { queryClient, emit };
};

describe("AuthProvider", () => {
  // Pas de globals vitest dans ce repo : le nettoyage du DOM entre les tests n'est pas automatique.
  afterEach(cleanup);

  it("conserve le cache quand le token est rafraîchi pour le même utilisateur", async () => {
    const { queryClient, emit } = await renderProvider(buildSession("user-1"));

    // Émis notamment au retour sur l'onglet, quand Supabase récupère la session.
    emit("TOKEN_REFRESHED", buildSession("user-1"));

    expect(queryClient.getQueryData(["medias"])).toEqual(["un média"]);
  });

  it("conserve le cache quand un autre onglet resignale le même utilisateur", async () => {
    const { queryClient, emit } = await renderProvider(buildSession("user-1"));

    emit("SIGNED_IN", buildSession("user-1"));

    expect(queryClient.getQueryData(["medias"])).toEqual(["un média"]);
  });

  it("vide le cache à la déconnexion", async () => {
    const { queryClient, emit } = await renderProvider(buildSession("user-1"));

    emit("SIGNED_OUT", null);

    expect(queryClient.getQueryData(["medias"])).toBeUndefined();
  });

  it("vide le cache quand un autre utilisateur se connecte", async () => {
    const { queryClient, emit } = await renderProvider(buildSession("user-1"));

    emit("SIGNED_IN", buildSession("user-2"));

    expect(queryClient.getQueryData(["medias"])).toBeUndefined();
  });
});
