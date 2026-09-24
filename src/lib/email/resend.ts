import { Resend } from "resend";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailSender = (message: EmailMessage) => Promise<void>;

export class EmailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailConfigurationError";
  }
}

function readConfiguredValue(name: string) {
  const value = process.env[name]?.trim();

  if (!value || value.includes("replace_me") || value.includes("replace_with")) {
    return null;
  }

  return value;
}

export function isEmailConfigured() {
  return Boolean(readConfiguredValue("RESEND_API_KEY"));
}

export function getEmailFromAddress() {
  return (
    readConfiguredValue("RESEND_FROM_EMAIL") ??
    "Crown & Blade Barbershop <bookings@crownandblade.example>"
  );
}

export function createResendSender(): EmailSender {
  const apiKey = readConfiguredValue("RESEND_API_KEY");

  if (!apiKey) {
    throw new EmailConfigurationError("RESEND_API_KEY is not configured.");
  }

  const resend = new Resend(apiKey);
  const from = getEmailFromAddress();

  return async (message) => {
    const result = await resend.emails.send({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }
  };
}

export async function deliverEmail(
  message: EmailMessage,
  sender?: EmailSender,
) {
  if (!sender && !isEmailConfigured()) {
    console.info(`Skipped email "${message.subject}" to ${message.to}.`);
    return { delivered: false as const };
  }

  const send = sender ?? createResendSender();
  await send(message);

  return { delivered: true as const };
}
