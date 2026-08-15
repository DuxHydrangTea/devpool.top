import { Title } from "@solidjs/meta";
import { query, createAsync, revalidate } from "@solidjs/router";
import { authService } from "~/server/services/auth.service";
import { dashboardService } from "~/server/services/dashboard.service";
import AdminDashboard from "~/components/AdminDashboard";

const getDashboardDataServer = query(async () => {
  "use server";
  await authService.requireAuth();
  return await dashboardService.getDashboardOverview();
}, "admin-dashboard-data");

export default function AdminDashboardPage() {
  const data = createAsync(() => getDashboardDataServer());

  const handleRefresh = () => {
    revalidate("admin-dashboard-data");
  };

  return (
    <div class="admin-container admin-container-lg">
      <Title>Admin - Tổng Quan Hệ Thống (Dashboard)</Title>
      <AdminDashboard
        stats={data()?.stats}
        categories={data()?.categories}
        articles={data()?.articles}
        isLoading={!data()}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
