import MailjetDefault from "node-mailjet";
import type { Client } from "node-mailjet";
import type { IEmailProvider } from "./email.interface.ts";

const MailjetClient = MailjetDefault as unknown as {
  apiConnect(apiKey: string, apiSecret: string): Client;
};

export interface MailjetConfig {
  apiKey: string;
  secretKey: string;
  fromEmail: string;
  fromName: string;
}

export class MailjetEmailProvider implements IEmailProvider {
  private readonly client: Client;

  constructor(private readonly config: MailjetConfig) {
    this.client = MailjetClient.apiConnect(config.apiKey, config.secretKey);
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    await this.client.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: this.config.fromEmail,
            Name: this.config.fromName,
          },
          To: [{ Email: to }],
          Subject: subject,
          HTMLPart: html,
        },
      ],
    });
  }
}
