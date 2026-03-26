const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy: AviationStack scheduled arrivals — cached 8 hours to stay within free tier
    if (url.pathname === '/proxy/aus-schedule') {
      const cacheKey = new Request('https://cache.internal/aus-schedule');
      const cache = caches.default;
      const cached = await cache.match(cacheKey);
      if (cached) {
        return new Response(await cached.text(), { headers: CORS });
      }
      const key = '90cae370433a7d969a873e4e33fd46e0';
      try {
        const res = await fetch(
          `http://api.aviationstack.com/v1/flights?access_key=${key}&arr_iata=AUS&flight_status=scheduled&limit=100`
        );
        const data = await res.json();
        const body = JSON.stringify(data);
        await cache.put(cacheKey, new Response(body, {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=28800' }
        }));
        return new Response(body, { headers: CORS });
      } catch (e) {
        return new Response('{"data":[]}', { headers: CORS });
      }
    }

    // All other routes → serve static assets
    return env.ASSETS.fetch(request);
  }
};
