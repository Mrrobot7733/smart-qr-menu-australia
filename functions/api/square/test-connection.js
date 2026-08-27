export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  try {
    const body = await context.request.json();
    const { environment = 'sandbox', accessToken, locationId } = body;

    const token = (accessToken || context.env?.SQUARE_ACCESS_TOKEN || '').trim();
    const locId = (locationId || context.env?.SQUARE_LOCATION_ID || '').trim();

    if (!token || !locId) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing Square Access Token or Location ID'
      }), { status: 400, headers: corsHeaders });
    }

    const baseUrl = environment === 'production'
      ? 'https://connect.squareup.com/v2'
      : 'https://connect.squareupsandbox.com/v2';

    const res = await fetch(`${baseUrl}/locations/${locId}`, {
      method: 'GET',
      headers: {
        'Square-Version': '2024-08-21',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.errors?.[0]?.detail || `Square API error (${res.status})`;
      return new Response(JSON.stringify({ success: false, message: errMsg }), { status: res.status, headers: corsHeaders });
    }

    const data = await res.json();
    const loc = data.location || {};

    return new Response(JSON.stringify({
      success: true,
      locationName: loc.name || 'Main Venue',
      currency: loc.currency || 'AUD',
      country: loc.country || 'AU',
      status: loc.status || 'ACTIVE'
    }), { status: 200, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      message: err.message || 'Internal Server Error'
    }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
