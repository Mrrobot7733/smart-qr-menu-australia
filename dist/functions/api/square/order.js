export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  try {
    const body = await context.request.json();
    const { environment = 'sandbox', accessToken, locationId, order, venueName = 'SmartMenu Venue' } = body;

    const token = (accessToken || context.env?.SQUARE_ACCESS_TOKEN || '').trim();
    const locId = (locationId || context.env?.SQUARE_LOCATION_ID || '').trim();

    if (!token || !locId || !order) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing Square credentials or order payload'
      }), { status: 400, headers: corsHeaders });
    }

    const baseUrl = environment === 'production'
      ? 'https://connect.squareup.com/v2'
      : 'https://connect.squareupsandbox.com/v2';

    const lineItems = (order.items || []).map(it => {
      const unitPrice = it.unitPrice || it.price || 0;
      return {
        name: it.name || 'Dish',
        quantity: String(it.quantity || 1),
        base_price_money: {
          amount: Math.round(unitPrice * 100),
          currency: 'AUD'
        },
        note: it.notes || (it.selectedExtras?.length ? it.selectedExtras.map(e => `+ ${e.name}`).join(', ') : undefined)
      };
    });

    const ticketName = order.orderType === 'takeaway'
      ? `Takeaway #${order.orderNumber} - ${order.customerName || 'Guest'}`
      : `Table #${order.tableNumber} - ${order.customerName || 'Guest'}`;

    const payload = {
      idempotency_key: `sm-${order.id}-${Date.now()}`,
      order: {
        location_id: locId,
        reference_id: `SM-${order.orderNumber}`,
        ticket_name: ticketName,
        source: {
          name: 'SmartMenu AU'
        },
        line_items: lineItems,
        taxes: [
          {
            name: 'GST (10% AU Included)',
            percentage: '10.0',
            type: 'INCLUSIVE'
          }
        ],
        fulfillments: [
          {
            type: order.orderType === 'takeaway' ? 'PICKUP' : 'DINE_IN',
            state: 'PROPOSED'
          }
        ]
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
      const errMsg = errData.errors?.[0]?.detail || `Square API error (${res.status})`;
      return new Response(JSON.stringify({ success: false, message: errMsg }), { status: res.status, headers: corsHeaders });
    }

    const resData = await res.json();
    const createdSquareOrder = resData.order || {};

    return new Response(JSON.stringify({
      success: true,
      squareOrderId: createdSquareOrder.id,
      squareReference: createdSquareOrder.reference_id || `SM-${order.orderNumber}`
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
