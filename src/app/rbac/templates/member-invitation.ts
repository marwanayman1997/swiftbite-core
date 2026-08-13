export function memberInvitationEmail(
  otp: string,
  role: string,
): { subject: string; html: string } {
  const subject = "You've been invited to join a Swiftbite team";
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${subject}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f5; font-family:Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden;">
            <tr>
              <td style="background-color:#ff5a1f; padding:24px; text-align:center;">
                <span style="color:#ffffff; font-size:20px; font-weight:bold;">Swiftbite</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 24px; color:#18181b;">
                <p style="margin:0 0 16px; font-size:16px; line-height:24px;">
                  You've been invited to join a restaurant team on Swiftbite as
                  <strong>${role}</strong>. Use the code below to accept the invitation.
                </p>
                <div style="margin:24px 0; text-align:center;">
                  <span style="display:inline-block; padding:12px 24px; background-color:#f4f4f5; border-radius:6px; font-size:28px; font-weight:bold; letter-spacing:6px; color:#18181b;">
                    ${otp}
                  </span>
                </div>
                <p style="margin:0 0 8px; font-size:14px; line-height:20px; color:#52525b;">
                  This code will expire shortly. If you weren't expecting this invitation, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px; background-color:#f4f4f5; text-align:center;">
                <span style="font-size:12px; color:#a1a1aa;">&copy; Swiftbite. All rights reserved.</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html };
}
