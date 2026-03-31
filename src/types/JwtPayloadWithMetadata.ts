import type { CustomUserMetadata } from "./CustomUserMetadata";

export interface JwtPayloadWithMetadata {
  user_metadata?: CustomUserMetadata;
}
