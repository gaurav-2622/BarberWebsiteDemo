import type { Metadata } from "next";

import {
  AdminField,
  AdminPageHeader,
  AdminPanel,
  adminInputClassName,
  SubmitButton,
} from "@/components/admin/admin-ui";

export const metadata: Metadata = {
  title: "Settings",
};
import { updateSettingsAction } from "@/lib/admin/settings-actions";
import { prisma } from "@/lib/prisma";

type SettingsPageProps = {
  searchParams: Promise<{
    notice?: string | string[];
  }>;
};

export default async function AdminSettingsPage({
  searchParams,
}: SettingsPageProps) {
  const query = await searchParams;
  const saved =
    (Array.isArray(query.notice) ? query.notice[0] : query.notice) === "saved";
  const settings = await prisma.shopSettings.findUniqueOrThrow({
    where: { id: "default" },
  });

  return (
    <>
      <AdminPageHeader
        eyebrow="Shop configuration"
        title="Settings"
        description="Manage public contact details and the rules that control online booking."
      />

      {saved ? (
        <p
          role="status"
          className="mt-5 border border-emerald-900/15 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          Shop settings saved.
        </p>
      ) : null}

      <form action={updateSettingsAction}>
        <AdminPanel title="Business profile" className="mt-7">
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
            <AdminField label="Business name">
              <input
                name="businessName"
                defaultValue={settings.businessName}
                required
                className={adminInputClassName}
              />
            </AdminField>
            <AdminField label="Tagline">
              <input
                name="tagline"
                defaultValue={settings.tagline ?? ""}
                maxLength={160}
                className={adminInputClassName}
              />
            </AdminField>
            <AdminField label="Public email">
              <input
                name="email"
                type="email"
                defaultValue={settings.email}
                required
                className={adminInputClassName}
              />
            </AdminField>
            <AdminField label="Public phone">
              <input
                name="phone"
                type="tel"
                defaultValue={settings.phone}
                required
                className={adminInputClassName}
              />
            </AdminField>
            <AdminField label="Address line 1">
              <input
                name="addressLine1"
                defaultValue={settings.addressLine1}
                required
                className={adminInputClassName}
              />
            </AdminField>
            <AdminField label="Address line 2">
              <input
                name="addressLine2"
                defaultValue={settings.addressLine2 ?? ""}
                className={adminInputClassName}
              />
            </AdminField>
            <AdminField label="City">
              <input
                name="city"
                defaultValue={settings.city}
                required
                className={adminInputClassName}
              />
            </AdminField>
            <AdminField label="State">
              <input
                name="state"
                defaultValue={settings.state}
                required
                className={adminInputClassName}
              />
            </AdminField>
            <AdminField label="Postal code">
              <input
                name="postalCode"
                defaultValue={settings.postalCode}
                required
                className={adminInputClassName}
              />
            </AdminField>
          </div>
        </AdminPanel>

        <AdminPanel title="Booking rules" className="mt-7">
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
            <AdminField label="Booking window (days)">
              <input
                name="bookingWindowDays"
                type="number"
                min={1}
                max={365}
                defaultValue={settings.bookingWindowDays}
                required
                className={adminInputClassName}
              />
            </AdminField>
            <AdminField label="Minimum notice (minutes)">
              <input
                name="minimumLeadTimeMinutes"
                type="number"
                min={0}
                max={10_080}
                defaultValue={settings.minimumLeadTimeMinutes}
                required
                className={adminInputClassName}
              />
            </AdminField>
            <AdminField label="Slot interval (minutes)">
              <input
                name="slotIntervalMinutes"
                type="number"
                min={5}
                max={120}
                defaultValue={settings.slotIntervalMinutes}
                required
                className={adminInputClassName}
              />
            </AdminField>
            <AdminField
              label="Customer change window (hours)"
              hint="How far ahead clients must cancel or reschedule online."
            >
              <input
                name="cancellationWindowHours"
                type="number"
                min={0}
                max={168}
                defaultValue={settings.cancellationWindowHours}
                required
                className={adminInputClassName}
              />
            </AdminField>
            <label className="flex min-h-14 items-center gap-3 border border-black/15 bg-white px-4 text-sm">
              <input
                type="checkbox"
                name="bookingEnabled"
                defaultChecked={settings.bookingEnabled}
                className="size-4 accent-[#9a7437]"
              />
              Online booking enabled
            </label>
            <label className="flex min-h-14 items-center gap-3 border border-black/15 bg-white px-4 text-sm">
              <input
                type="checkbox"
                name="onlinePaymentsEnabled"
                defaultChecked={settings.onlinePaymentsEnabled}
                className="size-4 accent-[#9a7437]"
              />
              Stripe payments enabled
            </label>
          </div>
        </AdminPanel>

        <div className="mt-6">
          <SubmitButton tone="gold">Save settings</SubmitButton>
        </div>
      </form>
    </>
  );
}
