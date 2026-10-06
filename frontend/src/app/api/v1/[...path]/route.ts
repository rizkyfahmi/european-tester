import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NESTJS_BACKEND_URL || 'https://european-tester.vercel.app/api/v1';

let globalProxySitesCache: any[] = [];
let hasReceivedClientSync = false;

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

  let bodyText: any = null;

  // Handle DELETE request to remove site from proxy cache
  if (req.method === 'DELETE' && subPath.startsWith('sites')) {
    const rawTarget = decodeURIComponent(subPath.replace(/^sites\//, '')).trim().toLowerCase();
    const cleanTarget = rawTarget.replace(/^by-name\//, '');
    globalProxySitesCache = globalProxySitesCache.filter((s) => {
      const sId = (s.id || '').toLowerCase();
      const sName = (s.name || '').toLowerCase();
      if (sId === cleanTarget || sName === cleanTarget || sId.includes(cleanTarget)) return false;
      return true;
    });
  }

  if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
    try {
      bodyText = await req.text();
      if (subPath === 'sites/sync' || subPath === 'sites') {
        const parsed = JSON.parse(bodyText);
        const incomingSites = Array.isArray(parsed) ? parsed : parsed.sites || parsed.data;
        if (Array.isArray(incomingSites)) {
          globalProxySitesCache = incomingSites;
          hasReceivedClientSync = true;
        }
      }
    } catch {
      // ignore JSON parse error
    }
  }

  try {
    const backendRes = await fetch(targetUrl, {
      method: req.method,
      headers: {
        ...headers,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: bodyText || undefined,
      cache: 'no-store',
    });

    const dataText = await backendRes.text();
    const resHeaders: Record<string, string> = {
      'content-type': backendRes.headers.get('content-type') || 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'access-control-allow-headers': '*',
    };

    if (subPath === 'sites' && req.method === 'GET' && backendRes.status === 200) {
      try {
        const json = JSON.parse(dataText);
        const sitesArr = Array.isArray(json) ? json : json.data || [];

        // If client sync has occurred, prioritize globalProxySitesCache so deleted sites stay deleted
        if (hasReceivedClientSync) {
          return NextResponse.json(
            { status: 'SUCCESS', data: globalProxySitesCache },
            { status: 200, headers: resHeaders }
          );
        }

        if (sitesArr.length > 0) {
          globalProxySitesCache = sitesArr;
        } else if (globalProxySitesCache.length > 0) {
          return NextResponse.json(
            { status: 'SUCCESS', data: globalProxySitesCache },
            { status: 200, headers: resHeaders }
          );
        }
      } catch {
        // ignore
      }
    }

    return new NextResponse(dataText, {
      status: backendRes.status,
      headers: resHeaders,
    });
  } catch (err: any) {
    if (subPath === 'sites' && req.method === 'GET') {
      return NextResponse.json(
        { status: 'SUCCESS', data: globalProxySitesCache },
        { status: 200 }
      );
    }
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
