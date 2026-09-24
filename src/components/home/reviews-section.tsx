import { Quote, Star } from "lucide-react";

const reviews = [
  {
    quote:
      "Daniel took the time to understand what I wanted and somehow made it easier to style at home. Best cut I’ve had in the city.",
    name: "Ethan M.",
    detail: "Signature Haircut",
  },
  {
    quote:
      "The shop feels elevated without trying too hard. Marcus is precise, easy to talk to, and the fade grows out incredibly clean.",
    name: "Chris A.",
    detail: "Skin Fade",
  },
  {
    quote:
      "Old-school attention to detail with a modern experience. The hot-towel shave is now part of my monthly routine.",
    name: "Noah R.",
    detail: "Traditional Shave",
  },
];

export function ReviewsSection() {
  return (
    <section className="section-space bg-[#f1eee6] text-[#111]">
      <div className="site-container">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Customer reviews</p>
            <h2 className="section-title mt-5">
              The word
              <br />
              <span className="italic text-[#9a7437]">around town.</span>
            </h2>
          </div>
          <div className="flex items-center gap-4 border-l border-black/15 pl-5">
            <p className="font-display text-5xl">4.9</p>
            <div>
              <div
                className="flex items-center gap-0.5 text-[#9a7437]"
                aria-label="4.9 out of 5 stars"
              >
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className="size-3.5 fill-current"
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="mt-1.5 text-[10px] tracking-[0.12em] text-black/45 uppercase">
                Local client rating
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden border border-black/15 bg-black/15 sm:mt-16 lg:grid-cols-3">
          {reviews.map((review, index) => (
            <figure
              key={review.name}
              className="flex min-h-[320px] flex-col bg-[#f7f4ec] p-7 sm:p-9"
            >
              <div className="flex items-start justify-between">
                <Quote
                  className="size-8 text-[#b18a4b]"
                  strokeWidth={1.2}
                  aria-hidden="true"
                />
                <span className="text-[9px] font-bold tracking-[0.16em] text-black/25">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <blockquote className="font-display mt-8 text-xl leading-[1.45] sm:text-[22px]">
                “{review.quote}”
              </blockquote>
              <figcaption className="mt-auto border-t border-black/10 pt-6">
                <p className="text-sm font-semibold">{review.name}</p>
                <p className="mt-1 text-[10px] tracking-[0.12em] text-[#8b672e] uppercase">
                  {review.detail}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
