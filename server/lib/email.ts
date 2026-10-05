import nodemailer from "nodemailer";

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD;

// Gmail SMTP via an App Password (not the account's real password) — the
// account needs 2-Step Verification enabled to generate one. `null` when
// unconfigured so local/dev setups without email creds don't crash on boot.
const transporter =
  EMAIL_USER && EMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: "gmail",
        auth: { user: EMAIL_USER, pass: EMAIL_APP_PASSWORD },
      })
    : null;

// Fire-and-forget: notification emails are a courtesy, not part of the
// request that triggers them (report submission, disposition, ...) — a
// failure here must never break that request. Catches internally so callers
// can call this without awaiting and without risking an unhandled rejection.
export async function sendNotificationEmail(to: string | string[], subject: string, text: string): Promise<void> {
  if (!transporter) {
    console.warn(`Email not configured (EMAIL_USER/EMAIL_APP_PASSWORD missing) — skipped: "${subject}" to ${to}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: `"Lapor FTI" <${EMAIL_USER}>`,
      to,
      subject,
      text,
    });
  } catch (err) {
    console.error("Failed to send notification email:", err);
  }
}
