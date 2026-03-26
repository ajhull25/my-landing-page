const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const EIGHT_HOURS = 8 * 60 * 60 * 1000;
const FIVE_MIN = 5 * 60 * 1000;

let scheduleCache = null;
let scheduleCachedAt = 0;
let trafficCache = null;
let trafficCachedAt = 0;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy: adsb.fi live approach traffic (CORS not allowed from browser)
    if (url.pathname === '/proxy/approach') {
      try {
        const res = await fetch('https://opendata.adsb.fi/api/v2/lat/30.1975/lon/-97.6664/dist/60');
        const data = await res.json();
        return new Response(JSON.stringify(data), { headers: CORS });
      } catch (e) {
        return new Response('{"aircraft":[]}', { headers: CORS });
      }
    }

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

    // Proxy: TomTom traffic flow — all segments in one call, cached 5 min
    if (url.pathname === '/proxy/traffic') {
      if (trafficCache && Date.now() - trafficCachedAt < FIVE_MIN) {
        return new Response(trafficCache, { headers: CORS });
      }
      const tomtomKey = 'WG0okRUj3UrYD5hXP95MKOEsFdvSuz3o';
      const points = [
        { id: 'i35-north',   label: 'North (Rundberg)',   lat: 30.3500, lon: -97.7065, hwy: 'i35' },
        { id: 'i35-central', label: 'Central (Downtown)', lat: 30.2745, lon: -97.7388, hwy: 'i35' },
        { id: 'i35-south',   label: 'South (Ben White)',  lat: 30.2155, lon: -97.7735, hwy: 'i35' },
        { id: '183-airport', label: 'At Airport Blvd',    lat: 30.3040, lon: -97.6987, hwy: '183' },
        { id: '183-braker',  label: 'At Braker Ln',       lat: 30.3871, lon: -97.7282, hwy: '183' },
      ];
      const results = await Promise.all(
        points.map(p =>
          fetch(`https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${p.lat},${p.lon}&key=${tomtomKey}`)
            .then(r => r.json())
            .then(d => ({ ...p, flow: d.flowSegmentData || null }))
            .catch(() => ({ ...p, flow: null }))
        )
      );
      trafficCache = JSON.stringify(results);
      trafficCachedAt = Date.now();
      return new Response(trafficCache, { headers: CORS });
    }

    // All other routes → serve static assets
    return env.ASSETS.fetch(request);
  }
};
