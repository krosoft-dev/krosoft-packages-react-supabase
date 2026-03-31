import type { TenantMetadata } from "./TenantMetadata";

export interface CustomUserMetadata {
  avatar_url?: string;
  name?: string;
  roles?: string[];
  permissions?: string[];
  tenants?: TenantMetadata[];
}
