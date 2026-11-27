export async function POST(req: Request) {
  try {
    const body = await req.json();
    const accountId =
      body.accountId ||
      process.env.CLOUDFLARE_ACCOUNT_ID ||
      process.env.NEXT_PUBLIC_CF_ACCOUNT_ID ||
      '';
    const apiToken =
      body.apiToken ||
      process.env.CLOUDFLARE_API_TOKEN ||
      process.env.NEXT_PUBLIC_CF_API_TOKEN ||
      '';
    const model = body.model;
    const payload = body.payload || {};

    if (!model) {
      return Response.json({ error: 'Missing model parameter' }, { status: 400 });
    }
    if (!accountId || !apiToken) {
      return Response.json(
        { error: 'Cloudflare credentials not configured. Please set them in Settings → Profile.' },
        { status: 401 }
      );
    }

    const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
    const cfRes = await fetch(cfUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const contentType = cfRes.headers.get('content-type') || 'application/json';
    if (contentType.includes('application/json')) {
      const data = await cfRes.json();
      return Response.json(data, { status: cfRes.status });
    } else {
      const buffer = await cfRes.arrayBuffer();
      return new Response(buffer, {
        status: cfRes.status,
        headers: { 'Content-Type': contentType },
      });
    }
  } catch (err: any) {
    return Response.json({ error: err?.message || 'Cloudflare error' }, { status: 500 });
  }
}
