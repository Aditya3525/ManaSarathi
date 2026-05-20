export interface EmailVerificationSendResult {
  sent: boolean;
  provider: 'resend' | 'log';
  message?: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildVerificationHtml = (name: string, verificationUrl: string): string => {
  const safeName = escapeHtml(name || 'there');
  const safeUrl = escapeHtml(verificationUrl);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111827; line-height: 1.6;">
      <h2 style="margin-bottom: 8px;">Verify your email address</h2>
      <p>Hi ${safeName},</p>
      <p>Thanks for signing up for ManaSarathi. Please verify your email to activate login for your account.</p>
      <p style="margin: 24px 0;">
        <a href="${safeUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: 600;">
          Verify Email
        </a>
      </p>
      <p>If the button does not work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #1d4ed8;">${safeUrl}</p>
      <p>This link expires in 24 hours.</p>
    </div>
  `;
};

export const sendEmailVerificationEmail = async (params: {
  to: string;
  name: string;
  verificationUrl: string;
}): Promise<EmailVerificationSendResult> => {
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'ManaSarathi <no-reply@manasarthi.app>';

  if (!resendApiKey) {
    console.info('[Email Verification] RESEND_API_KEY not configured. Verification link (dev fallback):', params.verificationUrl);
    return {
      sent: false,
      provider: 'log',
      message: 'Email provider not configured. Verification link logged on server.',
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [params.to],
        subject: 'Verify your email for ManaSarathi',
        html: buildVerificationHtml(params.name, params.verificationUrl),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Resend request failed with status ${response.status}: ${errorBody}`);
    }

    return {
      sent: true,
      provider: 'resend',
    };
  } catch (error) {
    console.error('Failed to send email verification via Resend:', error);
    console.info('[Email Verification] Falling back to server log URL:', params.verificationUrl);
    return {
      sent: false,
      provider: 'log',
      message: 'Unable to send verification email right now. Verification link logged on server.',
    };
  }
};
