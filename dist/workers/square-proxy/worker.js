/**
 * ⚡ SmartMenu Australia - Square POS Enterprise Proxy Worker
 * Secure, zero-latency micro-backend for Cloudflare Workers
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 1. Test Connection Endpoint
      if (path === '/api/square/test-connection') {
        const body = await request.json();
        const { environment = 'sandbox', accessToken, locationId } = body;
        const token = (accessToken || env.SQUARE_ACCESS_TOKEN || '').trim();
        const locId = (locationId || env.SQUARE_LOCATION_ID || '').trim();

        if (!token || !locId) {
          return new Response(JSON.stringify({ success: false, message: 'Missing Square Token or Location ID' }), { status: 400, headers: corsHeaders });
        }

        const baseUrl = environment === 'production' ? 'https://connect.squareup.com/v2' : 'https://connect.squareupsandbox.com/v2';
        const res = await fetch(`${baseUrl}/locations/${locId}`, {
          headers: {
            'Square-Version': '2024-08-21',
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return new Response(JSON.stringify({ success: false, message: errData.errors?.[0]?.detail || `Square error (${res.status})` }), { status: res.status, headers: corsHeaders });
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
      }

      // 2. Catalog Sync Endpoint
      if (path === '/api/square/catalog') {
        const body = await request.json();
        const { environment = 'sandbox', accessToken } = body;
        const token = (accessToken || env.SQUARE_ACCESS_TOKEN || '').trim();

        if (!token) {
          return new Response(JSON.stringify({ success: false, message: 'Missing Square Access Token' }), { status: 400, headers: corsHeaders });
        }

        const baseUrl = environment === 'production' ? 'https://connect.squareup.com/v2' : 'https://connect.squareupsandbox.com/v2';
        const res = await fetch(`${baseUrl}/catalog/list?types=ITEM,CATEGORY`, {
          headers: {
            'Square-Version': '2024-08-21',
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return new Response(JSON.stringify({ success: false, message: errData.errors?.[0]?.detail || 'Catalog fetch failed' }), { status: res.status, headers: corsHeaders });
        }

        const data = await res.json();
        const objects = data.objects || [];
        const sqCategories = objects.filter(o => o.type === 'CATEGORY');
        const sqItems = objects.filter(o => o.type === 'ITEM');

        const categories = sqCategories.map(c => ({ id: c.id, name: c.category_data?.name || 'Category' }));
        const items = sqItems.map(it => {
          const itemData = it.item_data || {};
          const variation = itemData.variations?.[0]?.item_variation_data;
          const priceCents = variation?.price_money?.amount || 0;
          return {
            id: `sq-${it.id}`,
            squareId: it.id,
            categoryId: itemData.category_id || (categories[0]?.id || 'bites'),
            name: itemData.name || 'Square Dish',
            description: itemData.description || '',
            price: priceCents > 0 ? Number((priceCents / 100).toFixed(2)) : 15.00,
            image: itemData.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
            station: 'kitchen',
            isAvailable: true,
            isVisible: true
          };
        });

        return new Response(JSON.stringify({ success: true, categories, items, count: items.length }), { status: 200, headers: corsHeaders });
      }

      // 3. Order Forwarding Endpoint
      if (path === '/api/square/order') {
        const body = await request.json();
        const { environment = 'sandbox', accessToken, locationId, order } = body;
        const token = (accessToken || env.SQUARE_ACCESS_TOKEN || '').trim();
        const locId = (locationId || env.SQUARE_LOCATION_ID || '').trim();

        if (!token || !locId || !order) {
          return new Response(JSON.stringify({ success: false, message: 'Missing credentials or order' }), { status: 400, headers: corsHeaders });
        }

        const baseUrl = environment === 'production' ? 'https://connect.squareup.com/v2' : 'https://connect.squareupsandbox.com/v2';
        const lineItems = (order.items || []).map(it => ({
          name: it.name || 'Dish',
          quantity: String(it.quantity || 1),
          base_price_money: { amount: Math.round((it.unitPrice || it.price || 0) * 100), currency: 'AUD' },
          note: it.notes || undefined
        }));

        const payload = {
          idempotency_key: `sm-${order.id}-${Date.now()}`,
          order: {
            location_id: locId,
            reference_id: `SM-${order.orderNumber}`,
            ticket_name: order.orderType === 'takeaway' ? `Takeaway #${order.orderNumber} - ${order.customerName || 'Guest'}` : `Table #${order.tableNumber} - ${order.customerName || 'Guest'}`,
            source: { name: 'SmartMenu AU' },
            line_items: lineItems,
            taxes: [{ name: 'GST (10% AU Included)', percentage: '10.0', type: 'INCLUSIVE' }],
            fulfillments: [{ type: order.orderType === 'takeaway' ? 'PICKUP' : 'DINE_IN', state: 'PROPOSED' }]
          }
        };

        const res = await fetch(`${baseUrl}/orders`, {
          method: 'POST',
          headers: {
            'Square-Version': '2024-08-21',
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return new Response(JSON.stringify({ success: false, message: errData.errors?.[0]?.detail || `Square error (${res.status})` }), { status: res.status, headers: corsHeaders });
        }

        const resData = await res.json();
        return new Response(JSON.stringify({
          success: true,
          squareOrderId: resData.order?.id,
          squareReference: resData.order?.reference_id || `SM-${order.orderNumber}`
        }), { status: 200, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ message: 'SmartMenu Square POS Proxy Active' }), { status: 200, headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: corsHeaders });
    }
  }
};
