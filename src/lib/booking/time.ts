import { addMinutes } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const SHOP_TIME_ZONE = "America/New_York";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateKey(value: string) {
  if (!DATE_KEY_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function shiftDateKey(dateKey: string, days: number) {
  if (!isValidDateKey(dateKey)) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));

  return shifted.toISOString().slice(0, 10);
}

export function getShopDateKey(date = new Date()) {
  return formatInTimeZone(date, SHOP_TIME_ZONE, "yyyy-MM-dd");
}

export function getLastBookableDateKey(
  bookingWindowDays: number,
  now = new Date(),
) {
  return shiftDateKey(getShopDateKey(now), bookingWindowDays);
}

export function isDateWithinBookingWindow(
  dateKey: string,
  bookingWindowDays: number,
  now = new Date(),
) {
  if (!isValidDateKey(dateKey)) {
    return false;
  }

  const today = getShopDateKey(now);
  const lastDay = getLastBookableDateKey(bookingWindowDays, now);

  return dateKey >= today && dateKey <= lastDay;
}

export function getDayOfWeek(dateKey: string) {
  if (!isValidDateKey(dateKey)) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }

  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function fromShopTime(dateKey: string, minuteOfDay: number) {
  if (!isValidDateKey(dateKey)) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }

  if (
    !Number.isInteger(minuteOfDay) ||
    minuteOfDay < 0 ||
    minuteOfDay > 1440
  ) {
    throw new Error(`Invalid minute of day: ${minuteOfDay}`);
  }

  if (minuteOfDay === 1440) {
    return fromZonedTime(
      `${shiftDateKey(dateKey, 1)}T00:00:00`,
      SHOP_TIME_ZONE,
    );
  }

  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const localDateTime = `${dateKey}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;

  return fromZonedTime(localDateTime, SHOP_TIME_ZONE);
}

export function getShopDayBounds(dateKey: string) {
  return {
    startsAt: fromShopTime(dateKey, 0),
    endsAt: fromShopTime(dateKey, 1440),
  };
}

export function addBookingMinutes(date: Date, minutes: number) {
  return addMinutes(date, minutes);
}

export function isSameShopDate(date: Date, dateKey: string) {
  return getShopDateKey(date) === dateKey;
}

export function rangesOverlap(
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date,
) {
  return firstStart < secondEnd && firstEnd > secondStart;
}

export function formatSlotTime(date: Date) {
  return formatInTimeZone(date, SHOP_TIME_ZONE, "h:mm a");
}

export function formatBookingDate(date: Date) {
  return formatInTimeZone(date, SHOP_TIME_ZONE, "EEEE, MMMM d, yyyy");
}
