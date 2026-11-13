// Adapt the existing Vercel handlers to the Fetch API without changing their
// authorization or writing secrets into client-side code.
export async function adapt(request, handler) {
  const headers = Object.fromEntries(request.headers.entries());
  const url = new URL(request.url);
  let body;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const maxBodyBytes = 3 * 1024 * 1024;
    if (Number(headers['content-length'] || 0) > maxBodyBytes) {
      return Response.json({error: 'Kërkesa është shumë e madhe.'}, {status: 413});
    }
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > maxBodyBytes) return Response.json({error: 'Kërkesa është shumë e madhe.'}, {status: 413});
    if (bytes.byteLength) {
      try { body = JSON.parse(new TextDecoder().decode(bytes)); }
      catch { return Response.json({error: 'JSON i pavlefshëm.'}, {status: 400}); }
    }
  }
  const req = { method: request.method, headers, query: Object.fromEntries(url.searchParams), body };
  let status = 200;
  const responseHeaders = new Headers();
  let response;
  const res = {
    setHeader(name, value) { responseHeaders.set(name, value); return this; },
    status(code) { status = code; return this; },
    json(value) {
      responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
      response = new Response(JSON.stringify(value), {status, headers: responseHeaders});
      return this;
    },
    end() { response = new Response(null, {status, headers: responseHeaders}); return this; },
  };
  await handler(req, res);
  return response || Response.json({error: 'Përgjigjja mungon.'}, {status: 500});
}
