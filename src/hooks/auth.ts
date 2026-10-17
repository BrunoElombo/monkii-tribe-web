import { useQuery } from "@tanstack/react-query";
import { getAuthProviders } from "../services/auth.service";

/** Sign-in providers the platform is configured for (Google client id, if any). */
export const useAuthProviders = () => useQuery({ queryKey: ["auth", "providers"], queryFn: getAuthProviders, staleTime: Infinity });
