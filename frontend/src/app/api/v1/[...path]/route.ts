import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NESTJS_BACKEND_URL || 'https://european-tester.vercel.app/api/v1';

async function handleProxy(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await context.params;
  const pathParts = resolvedParams.path || [];
  const subPath = pathParts.join('/');

  const searchParams = req.nextUrl.search;
  const targetUrl = `${BACKEND_URL}/${subPath}${searchParams}`;

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
      headers[key] = value;
    }
  });

  let body: any = null;
  if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
    try {
      body = await req.text();
    } catch {
      body = null;
    }
  }

  try {
    const backendRes = await fetch(targetUrl, {
      method: req.method,
      headers: {
        ...headers,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: body || undefined,
      cache: 'no-store',
    });

    const dataText = await backendRes.text();
    const resHeaders: Record<string, string> = {
      'content-type': backendRes.headers.get('content-type') || 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'access-control-allow-headers': '*',
    };

    return new NextResponse(dataText, {
      status: backendRes.status,
      headers: resHeaders,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'ERROR', message: `Proxy Error: ${err.message || 'Could not connect to backend'}` },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, context);
}

export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, context);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, context);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, context);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, context);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'access-control-allow-headers': '*',
    },
  });
}
