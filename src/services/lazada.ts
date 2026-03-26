import { LazadaConfig } from './store';

// We need to implement HMAC-SHA256 signature for Lazada Open Platform.
// Lazada signature algorithm:
// Sort all request parameters (except 'sign') by key name in alphabetical order.
// Concatenate the API path and the sorted parameters into a plain string: path + key1 + value1 + key2 + value2...
// Sign the string using HMAC-SHA256 with appSecret.

const LAZADA_API_ROOT: Record<string, string> = {
  'vn': 'https://api.lazada.vn/rest',
  'sg': 'https://api.lazada.sg/rest',
  'my': 'https://api.lazada.com.my/rest',
  'th': 'https://api.lazada.co.th/rest',
  'ph': 'https://api.lazada.com.ph/rest',
  'id': 'https://api.lazada.co.id/rest',
};

async function generateSignature(apiPath: string, params: Record<string, string>, appSecret: string): Promise<string> {
  const keys = Object.keys(params).sort();
  let baseString = apiPath;
  for (const key of keys) {
    baseString += key + params[key];
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(appSecret);
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
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export const lazadaApi = {
  /**
   * Helper to make an API call to Lazada Open Platform
   */
  async callApi(path: string, config: LazadaConfig, payload: any = {}) {
    if (!config || !config.appKey || !config.appSecret) {
      throw new Error('Cấu hình Lazada chưa đầy đủ.');
    }

    const timestamp = Date.now().toString();
    const commonParams: Record<string, string> = {
      app_key: config.appKey,
      timestamp: timestamp,
      sign_method: 'sha256',
    };

    if (config.accessToken) {
      commonParams['access_token'] = config.accessToken;
    }

    // Merge payload to params if it's a GET or simple POST (Lazada often uses flat params or specific XML/JSON structures)
    // For simplicity, we assume JSON payload but include in signature if it is part of system params
    // According to Lazada, system params + business params must all be signed.
    const allParams = { ...commonParams, ...payload };
    
    // Ensure all values are strings for signature
    const stringParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(allParams)) {
        if (typeof v === 'object') {
             stringParams[k] = JSON.stringify(v);
        } else {
             stringParams[k] = String(v);
        }
    }

    const sign = await generateSignature(path, stringParams, config.appSecret);
    stringParams['sign'] = sign;

    const regionUrl = LAZADA_API_ROOT[config.region || 'vn'] || LAZADA_API_ROOT['vn'];
    
    const url = new URL(`${regionUrl}${path}`);
    for (const [k, v] of Object.entries(stringParams)) {
      url.searchParams.append(k, v);
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Lazada API Error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.code !== '0') {
      throw new Error(`Lazada API Error [${data.code}]: ${data.message || 'Unknown error'}`);
    }

    return data;
  },

  /**
   * Push an item to Lazada.
   * Note: This is a simplified mockup using product/create endpoint.
   */
  async pushItem(config: LazadaConfig, productData: any) {
    const defaultPayload = {
      Request: {
        Product: {
          PrimaryCategory: "1", // Needs category mapping in real usage
          Attributes: {
            name: productData.name,
            description: productData.description?.replace(/<[^>]*>?/gm, '') || 'Sản phẩm mới',
            brand: "No Brand",
            model: "As shown"
          },
          Skus: {
            Sku: [
              {
                SellerSku: productData.sku || `SKU-${Date.now()}`,
                quantity: productData.stock || 100,
                price: productData.price ? parseFloat(productData.price) : 0,
                package_length: "10",
                package_height: "10",
                package_weight: "0.5",
                package_width: "10"
              }
            ]
          }
        }
      }
    };
    
    // Convert object to XML or JSON string format depending on Lazada API version requirements.
    // Modern Lazada Open Platform usually accepts payload in a specific format structure.
    const payloadStr = JSON.stringify(defaultPayload);

    return this.callApi('/product/create', config, { payload: payloadStr });
  }
};
