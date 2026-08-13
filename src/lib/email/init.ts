import { MailjetEmailProvider } from "../../pkg/email/mailjet.ts";
import { env } from "../config/env.ts";

export const emailProvider = new MailjetEmailProvider({
  apiKey: env.mailjet.apiKey,
  secretKey: env.mailjet.secretKey,
  fromEmail: env.mailjet.fromEmail,
  fromName: env.mailjet.fromName,
});
