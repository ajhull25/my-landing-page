const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const EIGHT_HOURS = 8 * 60 * 60 * 1000;

let scheduleCache = null;
let scheduleCachedAt = 0;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy: AviationStack scheduled arrivals — in-memory cache, 8 hours
    if (url.pathname === '/proxy/aus-schedule') {
      if (scheduleCache && Date.now() - scheduleCachedAt < EIGHT_HOURS) {
        return new Response(scheduleCache, { headers: CORS });
      }
      const key = '90cae370433a7d969a873e4e33fd46e0';
      try {
        const res = await fetch(
          `http://api.aviationstack.com/v1/flights?access_key=${key}&arr_iata=AUS&flight_status=scheduled&limit=100`
        );
        const data = await res.json();
        scheduleCache = JSON.stringify(data);
        scheduleCachedAt = Date.now();
        return new Response(scheduleCache, { headers: CORS });
      } catch (e) {
        return new Response('{"data":[]}', { headers: CORS });
      }
    }

    // All other routes → serve static assets
    return env.ASSETS.fetch(request);
  }
};
