const nodemailer = require('nodemailer');

const getTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.warn('WARNING: EMAIL_USER or EMAIL_PASS missing from environment. Emails cannot be delivered.');
    return null;
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: emailUser, pass: emailPass },
    tls: { rejectUnauthorized: false },
  });
};

/**
 * Send an organization invitation email to a user with a unique invite code.
 */
exports.sendInviteEmail = async (email, orgName, inviteCode, senderName = 'Youth Room') => {
  const transporter = getTransporter();
  if (!transporter) return false;

  const mailOptions = {
    from: `"Youth Room Workspaces" <${process.env.EMAIL_USER}>`,
    to: email.toLowerCase(),
    subject: `Join ${orgName} on Youth Room`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6fa; padding: 40px 20px; text-align: center; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: left;">
          
          <!-- Banner Header -->
          <div style="background: linear-gradient(135deg, #146C94, #19A7CE); padding: 35px 25px; color: #ffffff; text-align: center;">
            <h1 style="margin: 0; font-size: 26px; font-weight: bold; letter-spacing: 0.5px;">Workspace Invitation</h1>
            <p style="margin: 8px 0 0 0; font-size: 15px; opacity: 0.9;">You have been invited to collaborate on Youth Room</p>
          </div>

          <!-- Body Content -->
          <div style="padding: 40px 30px;">
            <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">
              Hello,
            </p>
            <p style="font-size: 16px; line-height: 1.6;">
              <strong>${senderName}</strong> has invited you to join the <strong>${orgName}</strong> workspace on the Youth Room platform.
            </p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              To accept this invitation and access the workspace features (discussion boards, prayer wall, Bible planner, and book rentals), open the Youth Room app and enter this unique, single-use invite code:
            </p>

            <!-- Invite Code Badge -->
            <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f7f9fc; border: 1px dashed #c3dae8; border-radius: 8px;">
              <span style="font-family: 'Courier New', Courier, monospace; font-size: 28px; font-weight: bold; letter-spacing: 2px; color: #146C94;">
                ${inviteCode}
              </span>
            </div>

            <p style="font-size: 14px; color: #888; line-height: 1.5; margin-top: 30px;">
              * Note: This invite code is unique to your email address (<strong>${email}</strong>) and can only be used once. It will expire in 7 days.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #fafbfc; border-top: 1px solid #f1f2f6; padding: 20px; text-align: center; font-size: 12px; color: #99aab5;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Youth Room. All rights reserved.</p>
            <p style="margin: 4px 0 0 0;">This email was sent dynamically. Please do not reply directly to this message.</p>
          </div>

        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Invite email successfully sent to ${email} for organization ${orgName}`);
    return true;
  } catch (error) {
    console.error(`Failed to send invite email to ${email}:`, error);
    return false;
  }
};
