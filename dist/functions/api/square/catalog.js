export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  try {
    const body = await context.request.json();
    const { environment = 'sandbox', accessToken } = body;
    const token = (accessToken || context.env?.SQUARE_ACCESS_TOKEN || '').trim();

    if (!token) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing Square Access Token'
      }), { status: 400, headers: corsHeaders });
    }

    const baseUrl = environment === 'production'
      ? 'https://connect.squareup.com/v2'
      : 'https://connect.squareupsandbox.com/v2';

    const res = await fetch(`${baseUrl}/catalog/list?types=ITEM,CATEGORY`, {
      method: 'GET',
      headers: {
        'Square-Version': '2024-08-21',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return new Response(JSON.stringify({
        success: false,
        message: errData.errors?.[0]?.detail || 'Failed to fetch catalog from Square'
      }), { status: res.status, headers: corsHeaders });
    }

    const data = await res.json();
    const objects = data.objects || [];
    const sqCategories = objects.filter(o => o.type === 'CATEGORY');
    const sqItems = objects.filter(o => o.type === 'ITEM');

    const mappedCategories = sqCategories.map(c => ({
      id: c.id,
      name: c.category_data?.name || 'Category'
    }));

    const mappedItems = sqItems.map(it => {
      const itemData = it.item_data || {};
      const variation = itemData.variations?.[0]?.item_variation_data;
      const priceCents = variation?.price_money?.amount || 0;
      const price = Number((priceCents / 100).toFixed(2));
      return {
        id: `sq-${it.id}`,
        squareId: it.id,
        categoryId: itemData.category_id || (mappedCategories[0]?.id || 'bites'),
        name: itemData.name || 'Square Dish',
        description: itemData.description || '',
        price: price > 0 ? price : 15.00,
        image: itemData.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
        station: 'kitchen',
        isAvailable: true,
        isVisible: true,
        isGF: false,
        isVegetarian: false,
        options: [],
        extras: []
      };
    });

    return new Response(JSON.stringify({
      success: true,
      categories: mappedCategories,
      items: mappedItems,
      count: mappedItems.length
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
