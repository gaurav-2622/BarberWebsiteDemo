import Link from "next/link";

export default function ManageBookingNotFound() {
  return (
    <main id="main-content" className="min-h-screen bg-[#0b0b0b] text-[#f7f3ea]">
      <div className="site-container flex min-h-screen flex-col justify-center py-20">
        <p className="text-[10px] font-bold tracking-[0.18em] text-[#c9a35d] uppercase">
          Booking link
        </p>
        <h1 className="font-display mt-4 text-5xl tracking-[-0.04em]">
          This appointment could not be found.
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-6 text-white/50">
          The management link may be incomplete or no longer valid. No
          appointment details are shown from an invalid link.
        </p>
        <Link
          href="/book"
          className="mt-8 inline-flex h-12 w-fit items-center justify-center rounded-full bg-[#c9a35d] px-6 text-xs font-bold tracking-[0.12em] text-black uppercase"
        >
          Book a new appointment
        </Link>
      </div>
    </main>
  );
}
