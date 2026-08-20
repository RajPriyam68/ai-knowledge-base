import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import type { Transporter } from "nodemailer";

let transporterPromise: Promise<Transporter> | null = null;

function hasSmtpConfig(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function getTransporter(): Promise<Transporter | null> {
  if (!hasSmtpConfig()) return null;
  if (!transporterPromise) {
    transporterPromise = import("nodemailer").then((nodemailer) =>
      nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }),
    );
  }
  return transporterPromise;
}

export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(options: MailOptions): Promise<{ delivered: boolean; previewUrl?: string }> {
  const transporter = await getTransporter();

  if (!transporter) {
    logger.info(`[Mail] (dev) Would send to ${options.to}: ${options.subject}\n${options.text}`);
    if (env.LOG_EMAILS_INSTEAD_OF_SEND) {
      return { delivered: false };
    }
    return { delivered: false };
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? `"AI Knowledge Base" <${process.env.SMTP_USER}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
  return { delivered: true };
}

export async function sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
  const link = `${env.CLIENT_URL}/verify-email?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to,
    subject: "Verify your email address",
    text: `Hi ${name},\n\nPlease verify your email address by clicking the link below:\n${link}\n\nThis link expires in 24 hours.`,
    html: `<p>Hi ${name},</p><p>Please verify your email by clicking the link below:</p><p><a href="${link}">Verify email</a></p><p>This link expires in 24 hours.</p>`,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string,
): Promise<void> {
  const link = `${env.CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to,
    subject: "Reset your password",
    text: `Hi ${name},\n\nYou requested a password reset. Click the link below to set a new password:\n${link}\n\nIf you did not request this, you can safely ignore this email. The link expires in 1 hour.`,
    html: `<p>Hi ${name},</p><p>You requested a password reset. Click the link below to set a new password:</p><p><a href="${link}">Reset password</a></p><p>If you did not request this, you can safely ignore this email.</p>`,
  });
}
