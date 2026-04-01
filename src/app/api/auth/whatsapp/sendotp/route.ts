import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimit';

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function isValidPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone.replace(/\s+/g, ''));
}

async function sendWhatsAppOTP(phone: string, otp: string): Promise<boolean> {
  const message = `Your AARAH verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`;

  const provider = process.env.WHATSAPP_PROVIDER || 'twilio';
  
  if (provider === 'twilio') {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

    if (!accountSid || !authToken || !fromNumber) {
      console.error('[OTP] Twilio credentials not configured');
      return false;
    }

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: `whatsapp:${fromNumber}`,
          To: `whatsapp:+91${phone}`,
          Body: message,
        }),
      }
    );

    return res.ok;
  }

  if (provider === 'msg91') {
    const apiKey = process.env.MSG91_API_KEY;
    const templateId = process.env.MSG91_WHATSAPP_TEMPLATE_ID;

    if (!apiKey) {
      console.error('[OTP] MSG91 API key not configured');
      return false;
    }

    const res = await fetch(`https://api.msg91.com/api/v5/flow/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authkey': apiKey,
      },
      body: JSON.stringify({
        flow_id: templateId,
        sender: 'AARAHA',
        country: '91',
        mobile: phone,
        variables: { 1: otp },
      }),
    });

    return res.ok;
  }

  console.warn(`[OTP] Unknown WhatsApp provider: ${provider}, falling back to console log`);
  console.log(`[OTP] Would send OTP ${otp} to +91${phone}: ${message}`);
  return true;
}

export async function POST(request: Request) {
  const rl = await rateLimit(request, RATE_LIMITS.AUTH_STRICT);
  if (rl) return rl;

  try {
    const { phone } = await request.json();

    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json({ error: 'Valid 10-digit phone number required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\s+/g, '').replace(/^\+91/, '');
    const key = `otp:${cleanPhone}`;

    const existing = await getRedis().get<string>(key);
    if (existing) {
      const ttl = await getRedis().ttl(key);
      if (ttl > 270) {
        return NextResponse.json(
          { error: 'OTP already sent. Please wait before requesting again.' },
          { status: 429 }
        );
      }
      await getRedis().del(key);
    }

    const otp = generateOTP();
    const stored = JSON.stringify({ otp, attempts: 0, createdAt: Date.now() });
    await getRedis().set(key, stored, { ex: 300 });

    const sent = await sendWhatsAppOTP(cleanPhone, otp);
    if (!sent) {
      await getRedis().del(key);
      return NextResponse.json({ error: 'Failed to send OTP. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('[SEND_OTP_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
