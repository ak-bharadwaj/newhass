"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import RegionalBrandingEditor from "@/components/admin/RegionalBrandingEditor";
import { apiClient, type RegionWithStats, type Region } from "@/lib/api";
import { activityFeedbacks } from "@/lib/activityFeedback";
import { EnterpriseDashboardLayout } from "@/components/dashboard/EnterpriseDashboardLayout";

function SettingsPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { pushEnabled, enablePushNotifications } = useNotifications();
  const { theme, region, refreshTheme } = useRegionalTheme();

  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState<RegionWithStats[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [currentBranding, setCurrentBranding] = useState<any>({});

  const isSuperAdmin = user?.role_name === "super_admin";
  const isRegionalAdmin = user?.role_name === "regional_admin";
  const canEditBranding = isSuperAdmin || isRegionalAdmin;

  // Initialize selected region only once when user loads
  useEffect(() => {
    if (!user) return;
    // Prefill region selection for regional admin (only on mount)
    if (isRegionalAdmin && user.region_id && !selectedRegionId) {
      setSelectedRegionId(user.region_id);
    }
  }, [user, isRegionalAdmin]); // Removed selectedRegionId from deps

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        setLoading(true);
        if (isSuperAdmin && token) {
          const r = await apiClient.getRegions(token);
          setRegions(r);
        }
        // Load current branding for selected region
        if ((isSuperAdmin || isRegionalAdmin) && token) {
          const regionId = (isRegionalAdmin ? user.region_id : selectedRegionId) || null;
          if (regionId) {
            const details = await apiClient.getRegion(regionId, token);
            if (details?.theme_settings) {
              setCurrentBranding(details.theme_settings);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token, isSuperAdmin, isRegionalAdmin, selectedRegionId]);

  const onBrandingUpdated = (branding: any) => {
    setCurrentBranding(branding);
    activityFeedbacks.settingsSaved();
  };

  const handleSaveBranding = async (branding: any) => {
    if (!token) return;
    try {
      const regionId = (isRegionalAdmin ? user?.region_id : selectedRegionId) as string;
      const updated: Region = await apiClient.updateRegionSettings(regionId, branding, token);
      setCurrentBranding(updated.theme_settings || {});
      // Refresh global theme after successful save
      await refreshTheme();
      activityFeedbacks.settingsSaved();
    } catch (e) {
      console.error("Failed to save regional settings", e);
    }
  };

  const quickLinks = useMemo(() => {
    const links: { label: string; href: string; roles?: string[] }[] = [
      { label: "Profile Settings", href: "/dashboard/profile" },
      { label: "Messages", href: "/dashboard/messages" },
    ];
    if (user?.role_name === "super_admin") {
      links.push({ label: "API Keys", href: "/dashboard/admin/api-keys" });
      links.push({ label: "Audit Logs", href: "/dashboard/admin/audit-logs" });
    }
    if (user?.role_name === "pharmacist") {
      links.push({ label: "Pharmacy Inventory", href: "/dashboard/pharmacist/inventory" });
    }
    return links;
  }, [user]);

  const roleForLayout = (() => {
    const r = user?.role_name || 'user';
    if (r === 'regional_admin') return 'admin';
    return r;
  })();

  return (
    <EnterpriseDashboardLayout role={roleForLayout}>
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-white/80 mt-1">Manage your profile, notifications, and organization preferences.</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {quickLinks.map((link) => (
          <button
            key={link.href}
            onClick={() => router.push(link.href)}
            className="group rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-4 text-left"
          >
            <div className="text-lg font-semibold text-white group-hover:text-white">{link.label}</div>
            <div className="text-sm text-white/70">Go to {link.label.toLowerCase()}</div>
          </button>
        ))}

        {/* Push Notifications */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-white">Push Notifications</div>
              <div className="text-sm text-white/70">Enable mobile/web push alerts for important events</div>
            </div>
            <button
              onClick={() => enablePushNotifications()}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                pushEnabled ? "bg-green-600/90 hover:bg-green-600 text-white" : "bg-blue-600/90 hover:bg-blue-600 text-white"
              }`}
            >
              {pushEnabled ? "Enabled" : "Enable"}
            </button>
          </div>
        </div>
      </div>

      {/* Organization / Branding Settings */}
      {canEditBranding && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Organization Branding</h2>
              <p className="text-white/80">Logo, banner, and theme colors for your region</p>
            </div>
            {isSuperAdmin && (
              <div className="flex items-center gap-2">
                <label className="text-white/80 text-sm">Region</label>
                <select
                  className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white"
                  value={selectedRegionId || ""}
                  onChange={(e) => setSelectedRegionId(e.target.value)}
                >
                  <option value="" disabled>
                    Select Region
                  </option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {(() => {
            const editorRegionId = (isRegionalAdmin ? user?.region_id : selectedRegionId) || "";
            const editorRegionName = isRegionalAdmin
              ? (region?.name || "My Region")
              : (regions.find(r => r.id === selectedRegionId)?.name || "Selected Region");
            return (
              <RegionalBrandingEditor
                regionId={editorRegionId}
                regionName={editorRegionName}
                token={token!}
                currentBranding={currentBranding}
                onUpdateSuccess={onBrandingUpdated}
              />
            );
          })()}

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => handleSaveBranding(currentBranding)}
              disabled={loading || (!selectedRegionId && isSuperAdmin)}
              className="px-4 py-2 rounded-lg bg-blue-600/90 hover:bg-blue-600 text-white disabled:opacity-50"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
    </EnterpriseDashboardLayout>
  );
}

// Render this page only on the client to ensure context providers are available
export default dynamic(() => Promise.resolve(SettingsPage), { ssr: false });
