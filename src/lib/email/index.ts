import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey && !resendApiKey.startsWith('re_xxxx') ? new Resend(resendApiKey) : null;
const fromEmail = process.env.EMAIL_FROM || 'Dentalo <noreply@dentalo.app>';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export interface SendInvitationParams {
  toEmail: string;
  recipientName?: string;
  companyName: string;
  token: string;
  role: string;
}

export interface InvitationDispatchResult {
  emailSent: boolean;
  inviteUrl: string;
  error?: string;
}

/**
 * Dispatches an onboarding/staff invitation email via Resend if configured,
 * and ALWAYS generates the direct copyable URL fallback.
 */
export async function dispatchInvitation(
  params: SendInvitationParams
): Promise<InvitationDispatchResult> {
  const inviteUrl = `${appUrl}/setup-account?token=${encodeURIComponent(params.token)}`;

  if (!resend) {
    // If Resend API key is not configured, we gracefully log and return the fallback link
    console.info(
      `[Dentalo Email Service] Resend API key not configured. Invitation fallback link generated for ${params.toEmail}: ${inviteUrl}`
    );
    return {
      emailSent: false,
      inviteUrl,
    };
  }

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: params.toEmail,
      subject: `You have been invited to join ${params.companyName} on Dentalo`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF9F6; color: #1F2326; margin: 0; padding: 32px 16px; }
              .card { max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #E4E2DD; border-radius: 6px; padding: 32px; }
              .logo { font-size: 18px; font-weight: 500; color: #1F6F6B; margin-bottom: 24px; }
              h1 { font-size: 18px; font-weight: 500; color: #1F2326; margin: 0 0 16px 0; }
              p { font-size: 14px; line-height: 22px; color: #4B5563; margin: 0 0 16px 0; }
              .btn { display: inline-block; background-color: #1F6F6B; color: #ffffff; font-size: 14px; font-weight: 500; text-decoration: none; padding: 10px 20px; border-radius: 6px; margin: 16px 0; }
              .footer { font-size: 12px; color: #6B7280; border-top: 1px solid #E4E2DD; padding-top: 16px; margin-top: 24px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="logo">Dentalo</div>
              <h1>Invitation to join ${params.companyName}</h1>
              <p>Hello${params.recipientName ? ` ${params.recipientName}` : ''},</p>
              <p>You have been invited to join <strong>${params.companyName}</strong> as a <strong>${params.role}</strong> on Dentalo.</p>
              <p>Click the button below to set up your account and get started. This link expires in 72 hours.</p>
              <p><a href="${inviteUrl}" class="btn">Set up your account</a></p>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; font-size: 13px; color: #1F6F6B;">${inviteUrl}</p>
              <div class="footer">
                If you did not expect this invitation, you can safely ignore this email.
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('[Dentalo Email Service] Failed to send email via Resend:', error);
      return {
        emailSent: false,
        inviteUrl,
        error: error.message,
      };
    }

    return {
      emailSent: true,
      inviteUrl,
    };
  } catch (err: any) {
    console.error('[Dentalo Email Service] Unexpected error:', err);
    return {
      emailSent: false,
      inviteUrl,
      error: err.message,
    };
  }
}
