import Stripe from "stripe";

export class StripeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeConfigurationError";
  }
}

let stripeClient: Stripe | undefined;

function readRequiredEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim();

  if (!value || value.endsWith("_replace_me")) {
    throw new StripeConfigurationError(`${name} is not configured.`);
  }

  return value;
}

export function getStripeClient() {
  if (!stripeClient) {
    stripeClient = new Stripe(
      readRequiredEnvironmentVariable("STRIPE_SECRET_KEY"),
      {
        appInfo: {
          name: "Crown & Blade Booking",
          version: "0.1.0",
        },
      },
    );
  }

  return stripeClient;
}

export function getStripeWebhookSecret() {
  return readRequiredEnvironmentVariable("STRIPE_WEBHOOK_SECRET");
}

export function getApplicationUrl() {
  const value = readRequiredEnvironmentVariable("NEXT_PUBLIC_APP_URL");
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new StripeConfigurationError(
      "NEXT_PUBLIC_APP_URL must be a valid absolute URL.",
    );
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new StripeConfigurationError(
      "NEXT_PUBLIC_APP_URL must use HTTP or HTTPS.",
    );
  }

  return url.toString().replace(/\/$/, "");
}
