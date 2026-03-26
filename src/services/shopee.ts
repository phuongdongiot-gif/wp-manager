import { ShopeeConfig } from './store';

// We need to implement HMAC-SHA256 signature for Shopee Open Platform.
// Since we are in a browser environment, we can use the Web Crypto API.

const SHOPEE_API_URL = 'https://partner.shopeemobile.com';

async function generateSignature(path: string, partnerId: string, partnerKey: string, timestamp: number): Promise<string> {
  const baseString = `${partnerId}${path}${timestamp}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(partnerKey);
  const data = encoder.encode(baseString);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const shopeeApi = {
  /**
   * Helper to make an API call to Shopee Open Platform
   */
  async callApi(path: string, config: ShopeeConfig, payload: any) {
    if (!config || !config.partnerId || !config.partnerKey || !config.shopId) {
      throw new Error('Cấu hình Shopee chưa đầy đủ.');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const sign = await generateSignature(path, config.partnerId, config.partnerKey, timestamp);

    const url = new URL(`${SHOPEE_API_URL}${path}`);
    url.searchParams.append('partner_id', config.partnerId);
    url.searchParams.append('timestamp', timestamp.toString());
    url.searchParams.append('sign', sign);
    url.searchParams.append('shop_id', config.shopId);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Shopee API Error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`${data.error}: ${data.message || data.warning}`);
    }

    return data;
  },

  /**
   * Push an item to Shopee.
   * Note: This is a simplified call using v2 item.add endpoint.
   * Real implementation might require category mapping, logistics, etc.
   */
  async pushItem(config: ShopeeConfig, productData: any) {
    const defaultPayload = {
      original_price: productData.price ? parseFloat(productData.price) : 0,
      description: productData.description?.replace(/<[^>]*>?/gm, '') || 'Sản phẩm mới', // Strip HTML
      weight: 0.5,
      item_name: productData.name,
      item_status: 'NORMAL',
      dimension: {
        package_length: 10,
        package_width: 10,
        package_height: 10
      },
      normal_stock: productData.stock || 100,
      logistic_info: [
        {
          logistic_id: 80014, // Common standard delivery ID. Requires real logistic config in production.
          enabled: true
        }
      ],
      category_id: 100001, // A default category or needs mapping
      image: {
        image_id_list: []
      }
    };

    return this.callApi('/api/v2/product/add_item', config, defaultPayload);
  }
};
