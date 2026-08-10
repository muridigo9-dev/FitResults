import { useAuth } from "@/contexts/AuthContext";

export function useMustChangePassword() {
  const { user } = useAuth();
  
  // Check if user has the must_change_password flag in metadata
  const mustChangePassword = user?.user_metadata?.must_change_password === true;
  
  return {
    mustChangePassword,
    userId: user?.id,
    email: user?.email,
  };
}
