import type { Session, User } from "@supabase/supabase-js";
import { jwtDecode } from "jwt-decode";

export interface CustomUserMetadata {
  avatar_url?: string;
  name?: string;
  roles?: string[];
  permissions?: string[];
  tenants?: TenantMetadata[];
}

export interface JwtPayloadWithMetadata {
  user_metadata?: CustomUserMetadata;
}

export interface TenantMetadata {
  id: string;
  name: string;
  logo_url?: string | null;
}

export const enrichUserWithMetadata = (user: User, session: Session): User => {
  if (!user || !session) {
    return user;
  }

  const metadata = extractUserMetadataFromSession(session);

  return {
    ...user,
    user_metadata: {
      ...user.user_metadata,
      roles: metadata.roles,
      permissions: metadata.permissions,
      tenants: metadata.tenants,
    },
  };
};

export const extractUserMetadataFromSession = (
  session: Session | null,
): { roles: string[]; permissions: string[]; tenants: TenantMetadata[] } => {
  if (!session?.access_token) {
    return { roles: [], permissions: [], tenants: [] };
  }

  try {
    const jwt = jwtDecode<JwtPayloadWithMetadata>(session.access_token);

    return {
      roles: jwt.user_metadata?.roles ?? [],
      permissions: jwt.user_metadata?.permissions ?? [],
      tenants: jwt.user_metadata?.tenants ?? [],
    };
  } catch {
    return { roles: [], permissions: [], tenants: [] };
  }
};

export const getTenantsId = (user: User | null): string[] => {
  return getTenants(user).map(tenant => tenant.id);
};

export const getTenant = (user: User | null): TenantMetadata | null => {
  const tenants = getTenants(user);
  return tenants.length === 0 ? null : tenants[0];
};

export const getTenants = (user: User | null): TenantMetadata[] => {
  if (!user?.user_metadata?.tenants) {
    return [];
  }

  const metadata = user.user_metadata as CustomUserMetadata;
  const tenants = (metadata.tenants ?? []) as TenantMetadata[];

  return [...tenants].sort((a, b) => a.name.localeCompare(b.name));
};

export const checkMultiTenants = (tenants: TenantMetadata[] | null): boolean => {
  return (tenants?.length ?? 0) > 1;
};
