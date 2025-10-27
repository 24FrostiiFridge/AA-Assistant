import { NextRequest, NextResponse } from 'next/server';
import { queues, jobOpts } from '@aa/queue/src/queue';

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  if (params.token !== process.env.TELEGRAM_BOT_TOKEN) {
    return new NextResponse('forbidden', { status: 403 });
  }
  const json = await req.json();
  const externalId = `tg:${json.update_id}`;

  await queues.webhookIngest.add(
    'tg',
    { source: 'telegram', externalId, payload: json },
    jobOpts()
  );

  return NextResponse.json({ ok: true });
}
