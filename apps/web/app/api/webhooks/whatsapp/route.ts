import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { queues, jobOpts } from '@aa/queue/src/queue';

const APP_SECRET = process.env.WHATSAPP_APP_SECRET!;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;

// Facebook / WhatsApp verification handshake
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (
    url.searchParams.get('hub.mode') === 'subscribe' &&
    url.searchParams.get('hub.verify_token') === VERIFY_TOKEN
  ) {
    return new NextResponse(url.searchParams.get('hub.challenge') ?? '', { status: 200 });
  }
  return new NextResponse('forbidden', { status: 403 });
}

// Ingest webhook (idempotent via queue worker)
export async function POST(req: NextRequest) {
  // read raw body for signature
  const body = await req.text();
  const header = req.headers.get('x-hub-signature-256');
  if (!header || !header.startsWith('sha256=')) {
    return new NextResponse('bad signature', { status: 401 });
  }

  const sigHex = header.slice('sha256='.length).trim();
  // Reject immediately if header isn't a valid hex digest length (64 hex chars = 32 bytes)
  if (!/^[0-9a-f]{64}$/i.test(sigHex)) {
    return new NextResponse('bad signature', { status: 401 });
  }

  const macHex = crypto.createHmac('sha256', APP_SECRET).update(body).digest('hex');

  // Safe compare: buffers must be same length, otherwise 401 (do NOT call timingSafeEqual)
  const sigBuf = Buffer.from(sigHex, 'hex');
  const macBuf = Buffer.from(macHex, 'hex');
  if (sigBuf.length !== macBuf.length) {
    return new NextResponse('bad signature', { status: 401 });
  }
  if (!crypto.timingSafeEqual(sigBuf, macBuf)) {
    return new NextResponse('bad signature', { status: 401 });
  }

  const json = JSON.parse(body);

  // Stable id for idempotency (adjust if your payload differs)
  const providerMsgId = json?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id ?? '';
  const pageId = json?.entry?.[0]?.id ?? '';
  const externalId = `${pageId}:${providerMsgId}`;

  await queues.webhookIngest.add(
    'wa',
    { source: 'whatsapp', externalId, payload: json },
    jobOpts()
  );

  return NextResponse.json({ ok: true });
}
