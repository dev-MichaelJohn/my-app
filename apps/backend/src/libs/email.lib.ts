import {
  INITIALISM,
  INSTITUTE_NAME,
  SYSTEM_NAME,
  type WelcomeEmailOpts,
  type UpdateEmailOpts,
} from "@my-app/shared";

const T = {
  maxWidth: "600px",
  borderRadius: "8px",
  borderColor: "#e2e8f0",
  shadow: "0 2px 8px 0 rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0,0,0,0.04)",

  headerBg: "#0f172a",
  headerAccent: "#38bdf8",
  headerPadding: "28px 40px",

  bodyBg: "#ffffff",
  bodyPadding: "40px 40px 32px 40px",
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8",

  infoBg: "#f8fafc",
  infoBorder: "#e2e8f0",
  infoAccent: "#38bdf8",

  alertDangerBg: "#fef2f2",
  alertDangerBorder: "#fecaca",
  alertDangerText: "#991b1b",
  alertWarnBg: "#fff7ed",
  alertWarnBorder: "#fed7aa",
  alertWarnText: "#9a3412",

  btnBg: "#0284c7",
  btnText: "#ffffff",

  footerBg: "#f8fafc",

  otpBg: "#f1f5f9",
  otpBorder: "#cbd5e1",
  otpText: "#0f172a",
  otpBadgeBg: "#dbeafe",
  otpBadgeText: "#1e40af",
};

const Header = () => /* html */ `
  <tr>
    <td style="padding: ${T.headerPadding}; background-color: ${T.headerBg}; text-align: center;">
      <div style="display: inline-block; width: 36px; height: 2px; background-color: ${T.headerAccent}; margin-bottom: 10px; border-radius: 1px;"></div>
      <div style="color: rgba(255,255,255,0.55); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 5px;">
        ${INSTITUTE_NAME}
      </div>
      <div style="color: ${T.headerAccent}; font-size: 17px; font-weight: 700; letter-spacing: -0.01em;">
        ${SYSTEM_NAME}
      </div>
    </td>
  </tr>`;

const Footer = () => /* html */ `
  <tr>
    <td style="padding: 20px 40px; background-color: ${T.footerBg}; border-top: 1px solid ${T.borderColor}; text-align: center;">
      <p style="margin: 0 0 3px 0; font-size: 11px; font-weight: 600; color: ${T.textMuted}; text-transform: uppercase; letter-spacing: 0.06em;">
        ${INSTITUTE_NAME} · ${INITIALISM}
      </p>
      <p style="margin: 0; font-size: 11px; line-height: 16px; color: #cbd5e1;">
        Automated administrative notification — do not reply to this message.
      </p>
    </td>
  </tr>`;

const Wrapper = (content: string) => /* html */ `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: ${T.textPrimary};">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%"
      style="max-width: ${T.maxWidth}; margin: 40px auto; background-color: ${T.bodyBg}; border-radius: ${T.borderRadius}; border: 1px solid ${T.borderColor}; overflow: hidden; box-shadow: ${T.shadow};">
      ${content}
    </table>
  </body>
  </html>`;

export const WelcomeEmailTemplate = ({
  recipientName,
  email,
  generatedPassword,
  url,
}: WelcomeEmailOpts) => {
  const passwordRow = generatedPassword
    ? /* html */ `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid ${T.infoBorder};">
          <span style="display: block; font-size: 11px; font-weight: 600; color: ${T.textMuted}; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 3px;">Temporary Password</span>
          <code style="font-family: 'SFMono-Regular', Consolas, monospace; background-color: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 4px; font-size: 14px; font-weight: 700; letter-spacing: 0.03em;">${generatedPassword}</code>
        </td>
      </tr>`
    : "";

  const securityAlert = generatedPassword
    ? /* html */ `
      <div style="margin: 24px 0 0 0; padding: 14px 16px; background-color: ${T.alertDangerBg}; border-left: 3px solid ${T.alertDangerText}; border-radius: 4px; font-size: 13px; line-height: 20px; color: ${T.alertDangerText};">
        <strong>Action required:</strong> A temporary password was generated for you. Log in and change it immediately to secure your account.
      </div>`
    : "";

  return Wrapper(/* html */ `
    ${Header()}
 
    <tr>
      <td style="padding: ${T.bodyPadding};">
 
        <p style="margin: 0 0 4px 0; font-size: 19px; font-weight: 700; color: ${T.textPrimary}; letter-spacing: -0.01em;">
          Welcome, ${recipientName}
        </p>
        <p style="margin: 0 0 28px 0; font-size: 14px; color: ${T.textMuted};">
          Your account is ready on the ${INITIALISM} portal.
        </p>
 
        <div style="border: 1px solid ${T.infoBorder}; border-left: 3px solid ${T.infoAccent}; border-radius: 6px; overflow: hidden; background-color: ${T.infoBg}; padding: 16px 20px; margin-bottom: 8px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid ${T.infoBorder};">
                <span style="display: block; font-size: 11px; font-weight: 600; color: ${T.textMuted}; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 3px;">Username / Email</span>
                <span style="font-size: 14px; font-weight: 600; color: ${T.textPrimary};">${email}</span>
              </td>
            </tr>
            ${passwordRow}
          </table>
        </div>
 
        ${securityAlert}
 
        <div style="margin: 32px 0 28px 0; text-align: center;">
          <a href="${url}" target="_blank"
            style="display: inline-block; padding: 11px 32px; background-color: ${T.btnBg}; color: ${T.btnText}; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 6px; letter-spacing: 0.01em;">
            Log In to Portal →
          </a>
        </div>
 
        <p style="margin: 0; font-size: 13px; line-height: 20px; color: ${T.textMuted}; border-top: 1px solid ${T.borderColor}; padding-top: 20px;">
          Never share your credentials or password with anyone, including IT staff.
        </p>
 
      </td>
    </tr>
 
    ${Footer()}
  `);
};

export const UpdateEmailTemplate = ({
  recipientName,
  updatedAt,
  updatedFields,
}: UpdateEmailOpts) => {
  const formattedDate = updatedAt.toLocaleString("en-PH", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const fieldRows = updatedFields
    .map(
      (f) => /* html */ `
        <tr>
          <td style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: ${T.textPrimary}; background-color: ${T.infoBg}; border-bottom: 1px solid ${T.infoBorder}; white-space: nowrap;">
            ${f.label}
          </td>
          <td style="padding: 10px 14px; font-size: 13px; color: ${T.textSecondary}; border-bottom: 1px solid ${T.infoBorder};">
            <code style="font-family: 'SFMono-Regular', Consolas, monospace; background-color: #fee2e2; padding: 2px 7px; border-radius: 4px; color: #991b1b; font-size: 12px;">${f.oldValue}</code>
          </td>
          <td style="padding: 10px 14px; font-size: 13px; color: ${T.textSecondary}; border-bottom: 1px solid ${T.infoBorder};">
            <code style="font-family: 'SFMono-Regular', Consolas, monospace; background-color: #dcfce7; padding: 2px 7px; border-radius: 4px; color: #166534; font-size: 12px;">${f.newValue}</code>
          </td>
        </tr>`,
    )
    .join("");

  return Wrapper(/* html */ `
    ${Header()}
 
    <tr>
      <td style="padding: ${T.bodyPadding};">
 
        <p style="margin: 0 0 2px 0; font-size: 19px; font-weight: 700; color: ${T.textPrimary}; letter-spacing: -0.01em;">
          Account Updated
        </p>
        <p style="margin: 0 0 24px 0; font-size: 13px; color: ${T.textMuted};">
          ${formattedDate}
        </p>
 
        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: ${T.textSecondary};">
          Hello <strong style="color: ${T.textPrimary};">${recipientName}</strong> — an administrator made the following changes to your ${INITIALISM} account:
        </p>
 
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
          style="border: 1px solid ${T.infoBorder}; border-left: 3px solid ${T.infoAccent}; border-radius: 6px; overflow: hidden; margin-bottom: 24px;">
          <thead>
            <tr>
              <th style="padding: 9px 14px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: ${T.textMuted}; background-color: #f1f5f9; text-align: left; border-bottom: 1px solid ${T.infoBorder};">Field</th>
              <th style="padding: 9px 14px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: ${T.textMuted}; background-color: #f1f5f9; text-align: left; border-bottom: 1px solid ${T.infoBorder};">Previous</th>
              <th style="padding: 9px 14px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: ${T.textMuted}; background-color: #f1f5f9; text-align: left; border-bottom: 1px solid ${T.infoBorder};">Updated</th>
            </tr>
          </thead>
          <tbody>
            ${fieldRows}
          </tbody>
        </table>
 
        <div style="padding: 14px 16px; background-color: ${T.alertWarnBg}; border-left: 3px solid #f97316; border-radius: 4px; font-size: 13px; line-height: 20px; color: ${T.alertWarnText};">
          <strong>Unexpected change?</strong> Contact the IT Services Office or your system administrator immediately if you did not authorize these updates.
        </div>
 
      </td>
    </tr>
 
    ${Footer()}
  `);
};

export const OTPEmailTemplate = (otpCode: string) => {
  return Wrapper(/* html */ `
    ${Header()}
 
    <tr>
      <td style="padding: ${T.bodyPadding};">
 
        <p style="margin: 0 0 4px 0; font-size: 19px; font-weight: 700; color: ${T.textPrimary}; letter-spacing: -0.01em;">
          Verification Code
        </p>
        <p style="margin: 0 0 32px 0; font-size: 14px; line-height: 22px; color: ${T.textSecondary};">
          Someone requested to authenticate into your account on the ${INITIALISM} portal. Use the code below to complete the sign-in.
        </p>
 
        <div style="text-align: center; margin: 0 0 32px 0;">
          <div style="display: inline-block; padding: 20px 48px; background-color: ${T.otpBg}; border: 1px solid ${T.otpBorder}; border-radius: 8px;">
            <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 40px; font-weight: 800; letter-spacing: 10px; color: ${T.otpText}; line-height: 1;">
              ${otpCode}
            </div>
          </div>
          <p style="margin: 12px 0 0 0; font-size: 12px; color: ${T.textMuted};">
            Single-use · Expires in
            <span style="display: inline-block; background-color: ${T.otpBadgeBg}; color: ${T.otpBadgeText}; font-weight: 700; font-size: 11px; padding: 1px 7px; border-radius: 10px; margin-left: 2px;">5 minutes</span>
          </p>
        </div>
 
        <p style="margin: 0; font-size: 13px; line-height: 20px; color: ${T.textMuted}; border-top: 1px solid ${T.borderColor}; padding-top: 20px;">
          <strong style="color: ${T.textSecondary};">Didn't request this?</strong> The ${INITIALISM} support team will never ask for your password via email. Report unauthorized attempts to the IT Services Office.
        </p>
 
      </td>
    </tr>
 
    ${Footer()}
  `);
};

export const PasswordResetEmailTemplate = (otpCode: string) => {
  return Wrapper(/* html */ `
    ${Header()}
 
    <tr>
      <td style="padding: ${T.bodyPadding};">
 
        <p style="margin: 0 0 4px 0; font-size: 19px; font-weight: 700; color: ${T.textPrimary}; letter-spacing: -0.01em;">
          Password Reset
        </p>
        <p style="margin: 0 0 32px 0; font-size: 14px; line-height: 22px; color: ${T.textSecondary};">
          We received a request to reset the password on your ${INITIALISM} account. Use the code below to authorize the reset.
        </p>
 
        <div style="text-align: center; margin: 0 0 32px 0;">
          <div style="display: inline-block; padding: 20px 48px; background-color: ${T.otpBg}; border: 1px solid ${T.otpBorder}; border-radius: 8px;">
            <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 40px; font-weight: 800; letter-spacing: 10px; color: ${T.otpText}; line-height: 1;">
              ${otpCode}
            </div>
          </div>
          <p style="margin: 12px 0 0 0; font-size: 12px; color: ${T.textMuted};">
            Single-use · Expires in
            <span style="display: inline-block; background-color: ${T.otpBadgeBg}; color: ${T.otpBadgeText}; font-weight: 700; font-size: 11px; padding: 1px 7px; border-radius: 10px; margin-left: 2px;">5 minutes</span>
          </p>
        </div>
 
        <div style="padding: 14px 16px; background-color: ${T.alertDangerBg}; border-left: 3px solid ${T.alertDangerText}; border-radius: 4px; font-size: 13px; line-height: 20px; color: ${T.alertDangerText}; margin-bottom: 20px;">
          <strong>Didn't request this?</strong> Contact the IT Services Office immediately — someone may be attempting to access your account.
        </div>
 
        <p style="margin: 0; font-size: 13px; line-height: 20px; color: ${T.textMuted}; border-top: 1px solid ${T.borderColor}; padding-top: 20px;">
          The ${INITIALISM} support team will never ask for your password or this code via email or phone.
        </p>
 
      </td>
    </tr>
 
    ${Footer()}
  `);
};

export const WelcomeTextTemplate = ({
  recipientName,
  email,
  generatedPassword,
  url,
}: WelcomeEmailOpts): string =>
  `
${INSTITUTE_NAME} — ${SYSTEM_NAME}
 
Welcome, ${recipientName}
 
Your account is ready on the ${INITIALISM} portal.
 
Account credentials
  Username / Email  : ${email}${
    generatedPassword
      ? `\n  Temporary Password: ${generatedPassword}\n\nACTION REQUIRED: A temporary password was generated for you.\nLog in and change it immediately to secure your account.`
      : ""
  }
 
Log in here: ${url}
 
Never share your credentials or password with anyone, including IT staff.
 
—
${INSTITUTE_NAME} · ${INITIALISM}
Automated administrative notification — do not reply to this message.
`.trim();

export const UpdateTextTemplate = ({
  recipientName,
  updatedFields,
  updatedAt,
}: UpdateEmailOpts): string => {
  const formattedDate = updatedAt.toLocaleString("en-PH", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const fieldLines = updatedFields
    .map((f) => `  ${f.label}: ${f.oldValue} → ${f.newValue}`)
    .join("\n");

  return `
${INSTITUTE_NAME} — ${SYSTEM_NAME}
 
Account Update Notice
${formattedDate}
 
Hello ${recipientName},
 
An administrator made the following changes to your ${INITIALISM} account:
 
${fieldLines}
 
If you did not authorize these changes, contact the IT Services Office
or your system administrator immediately.
 
—
${INSTITUTE_NAME} · ${INITIALISM}
Automated administrative notification — do not reply to this message.
`.trim();
};

export const OTPTextTemplate = (otpCode: string): string =>
  `
${INSTITUTE_NAME} — ${SYSTEM_NAME}
 
Verification Code
 
Someone requested to authenticate into your account on the ${INITIALISM} portal.
Use the code below to complete the sign-in.
 
  ${otpCode}
 
This code is single-use and expires in 5 minutes.
 
Didn't request this? The ${INITIALISM} support team will never ask for your
password via email. Report unauthorized attempts to the IT Services Office.
 
—
${INSTITUTE_NAME} · ${INITIALISM}
Automated administrative notification — do not reply to this message.
`.trim();

export const PasswordResetTextTemplate = (otpCode: string): string =>
  `
${INSTITUTE_NAME} — ${SYSTEM_NAME}
 
Password Reset
 
We received a request to reset the password on your ${INITIALISM} account.
Use the code below to authorize the reset.
 
  ${otpCode}
 
This code is single-use and expires in 5 minutes.
 
Didn't request this? Contact the IT Services Office immediately —
someone may be attempting to access your account. The ${INITIALISM} team
will never ask for your password or this code via email or phone.
 
—
${INSTITUTE_NAME} · ${INITIALISM}
Automated administrative notification — do not reply to this message.
`.trim();
