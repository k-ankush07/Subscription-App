import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  console.log("[mailer] SMTP_HOST from process.env is:", JSON.stringify(process.env.SMTP_HOST));

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465, // true for port 465, false for 587/25
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

export async function sendMail({ to, subject, html, fromName }) {
  const t = getTransporter();
  const displayName = fromName || "Store";

  try {
    const info = await t.sendMail({
      from: `"${displayName}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("sendMail failed:", err);
    return { success: false, error: err.message };
  }
}