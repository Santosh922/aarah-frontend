import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mail';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimit';

const escapeHTML = (str: string) => {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, (tag) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
};

export async function POST(request: NextRequest) {
  const rl = await rateLimit(request, RATE_LIMITS.CONTACT);
  if (rl) return rl;

  try {
    const { name, email, subject, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const safeName = escapeHTML(name);
    const safeSubject = escapeHTML(subject || 'New Contact Form Submission');
    const safeMessage = escapeHTML(message);
    const safeEmail = escapeHTML(email);

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="border-bottom: 2px solid #191919; padding-bottom: 10px;">${safeSubject}</h2>
        <p><strong>From:</strong> ${safeName}</p>
        <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
        <hr style="border: 1px solid #eee; margin: 20px 0;" />
        <div style="white-space: pre-wrap; line-height: 1.6; color: #333;">${safeMessage}</div>
      </div>
    `;

    await sendEmail({
      to: process.env.ADMIN_EMAIL || 'orders@aarah.in',
      subject: `Contact Form: ${safeSubject}`,
      html: emailHtml,
      replyTo: email,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[CONTACT_ERROR]', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
