const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy: OpenSky aircraft metadata (no CORS headers on their end)
    if (url.pathname.startsWith('/proxy/aircraft/')) {
      const icao24 = url.pathname.split('/').pop();
      try {
        const res = await fetch(`https://opensky-network.org/api/metadata/aircraft/icao/${icao24}`);
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...CORS, 'Cache-Control': 'public, max-age=86400' }
        });
      } catch (e) {
        return new Response('{}', { headers: CORS });
      }
    }

    // Proxy: AviationStack (HTTP-only on free tier, can't call from HTTPS browser)
    if (url.pathname === '/proxy/aus-flights') {
      const key = '90cae370433a7d969a873e4e33fd46e0';
      try {
        const res = await fetch(
          `http://api.aviationstack.com/v1/flights?access_key=${key}&arr_iata=AUS&flight_status=active&limit=10`
        );
        const data = await res.json();
        return new Response(JSON.stringify(data), { headers: CORS });
      } catch (e) {
        return new Response('{"data":[]}', { headers: CORS });
      }
    }

    // All other routes → serve static assets
    return env.ASSETS.fetch(request);
  }
};
