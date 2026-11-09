import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Actor, AppRole } from "@/lib/rbac";

interface AuthState {
  session: Session | null;
  ready: boolean;
  actor: Actor | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({ session: null, ready: false, actor: null, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  const { data: actor = null } = useQuery({
    queryKey: ["actor", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Actor | null> => {
      const [{ data: role }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role, district_id, godown_id, shop_id").eq("user_id", userId!).maybeSingle(),
        supabase.from("profiles").select("username, full_name, email").eq("id", userId!).maybeSingle(),
      ]);
      if (!role) return null;
      return {
        username: profile?.username ?? profile?.email ?? "user",
        fullName: profile?.full_name ?? profile?.username ?? "User",
        role: role.role as AppRole,
        districtId: role.district_id,
        godownId: role.godown_id,
        shopId: role.shop_id,
      };
    },
  });

  return (
    <AuthContext.Provider
      value={{
        session,
        ready,
        actor: userId ? actor : null,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
