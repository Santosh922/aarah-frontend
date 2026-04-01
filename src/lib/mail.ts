import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendInvoiceEmail(order: any) {
  const { customer, items, total, orderId } = order;

  const html = `
    <div style="font-family: 'Georgia', serif; color: #111; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 40px;">
      <h1 style="letter-spacing: 4px; text-align: center;">AARAH</h1>
      <p style="text-align: center; font-size: 10px; color: #666; text-transform: uppercase;">Maternity & Nursing Wear</p>
      
      <div style="margin-top: 40px; border-top: 1px solid #000; padding-top: 20px;">
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 30px;">
        <thead>
          <tr style="border-bottom: 1px solid #eee; text-align: left; font-size: 10px; color: #999;">
            <th style="padding-bottom: 10px;">ITEM</th>
            <th style="padding-bottom: 10px; text-align: center;">QTY</th>
            <th style="padding-bottom: 10px; text-align: right;">PRICE</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item: any) => `
            <tr style="border-bottom: 1px dashed #eee; font-size: 12px;">
              <td style="padding: 15px 0;">
                <span style="font-weight: bold; display: block;">${item.name}</span>
                <span style="color: #888; font-size: 10px;">Size: ${item.size}</span>
              </td>
              <td style="text-align: center;">${item.quantity}</td>
              <td style="text-align: right;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="margin-top: 30px; text-align: right; font-size: 14px; font-weight: bold; border-top: 2px solid #000; padding-top: 15px;">
        TOTAL PAID: ₹${total.toLocaleString('en-IN')}
      </div>

      <div style="margin-top: 50px; text-align: center; font-size: 10px; color: #999; line-height: 1.6;">
        <p>Thank you for choosing Aarah. We hope you love your pieces!</p>
        <p>If you have any questions, reply to this email or contact support@aarah.in</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"AARAH" <${process.env.SMTP_USER}>`,
      to: customer.email,
      subject: `Invoice for Order ${orderId}`,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('[MAIL_ERROR]', error);
    return { success: false, error };
  }
}

export async function sendEmail({ to, subject, html, replyTo }: { to: string; subject: string; html: string; replyTo?: string }) {
  try {
    await transporter.sendMail({
      from: `"AARAH" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      replyTo: replyTo || undefined,
    });
    return { success: true };
  } catch (error) {
    console.error('[MAIL_ERROR]', error);
    return { success: false, error };
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_API_URL}/reset-password?token=${resetToken}`;
  
  const html = `
    <div style="font-family: 'Georgia', serif; color: #111; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 40px;">
      <h1 style="letter-spacing: 4px; text-align: center;">AARAH</h1>
      <p style="text-align: center; font-size: 10px; color: #666; text-transform: uppercase;">Password Reset Request</p>
      
      <div style="margin-top: 40px;">
        <p>You requested a password reset for your AARAH account.</p>
        <p>Click the button below to reset your password:</p>
      </div>

      <div style="margin-top: 30px; text-align: center;">
        <a href="${resetUrl}" style="display: inline-block; background: #191919; color: white; padding: 15px 30px; text-decoration: none; font-weight: bold; letter-spacing: 2px;">RESET PASSWORD</a>
      </div>

      <div style="margin-top: 30px; font-size: 12px; color: #666;">
        <p>If you didn't request this, please ignore this email.</p>
        <p>This link expires in 1 hour.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"AARAH" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset Your AARAH Password',
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('[MAIL_ERROR]', error);
    return { success: false, error };
  }
}
