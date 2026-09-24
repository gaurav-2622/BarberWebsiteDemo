-- Enable equality comparisons for UUID values in GiST indexes.
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- The database remains the final authority against overlapping active bookings,
-- even if requests arrive concurrently or bypass application-level checks.
ALTER TABLE "appointments"
ADD CONSTRAINT "appointments_no_overlapping_active_bookings"
EXCLUDE USING GIST (
    "barber_id" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
)
WHERE (
    "status" IN (
        'PENDING'::"AppointmentStatus",
        'PENDING_PAYMENT'::"AppointmentStatus",
        'CONFIRMED'::"AppointmentStatus"
    )
);
