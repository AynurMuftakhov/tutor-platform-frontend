import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { getDashboardSummary } from "../services/dashboardSummary";

export const useDashboardSummary = () => {
  const { user } = useAuth();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return useQuery({
    queryKey: ["dashboard-summary", user?.id, timezone],
    queryFn: () => getDashboardSummary(timezone),
    enabled: !!user?.id,
  });
};

