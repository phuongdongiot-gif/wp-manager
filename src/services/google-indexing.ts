import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { SignJWT, importPKCS8 } from 'jose';

export class GoogleIndexingService {
  /**
   * Generates an OAuth 2.0 Access Token from a Google Service Account JSON key
   * using the jose library's Web Crypto RSA-SHA256 signature generator.
   */
  async getAccessToken(serviceAccountJsonStr: string): Promise<string> {
    let creds;
    try {
       creds = JSON.parse(serviceAccountJsonStr);
    } catch (e) {
       throw new Error("Mã JSON Service Account không hợp lệ.");
    }

    if (!creds.private_key || !creds.client_email) {
      throw new Error("File JSON bị thiếu trường 'private_key' hoặc 'client_email'. Vui lòng kiểm tra lại file của Google cung cấp.");
    }

    try {
       // PKCS8 import for browser environments using jose
       const privateKey = await importPKCS8(creds.private_key, 'RS256');

       const iat = Math.floor(Date.now() / 1000);
       const exp = iat + 3600; // 1 hour token lifetime

       // Generate the signed JWT assertion
       const jwt = await new SignJWT({
         iss: creds.client_email,
         scope: 'https://www.googleapis.com/auth/indexing',
         aud: 'https://oauth2.googleapis.com/token'
       })
         .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
         .setIssuedAt(iat)
         .setExpirationTime(exp)
         .sign(privateKey);

       // Exchange the JWT for an Access Token
       const response = await tauriFetch('https://oauth2.googleapis.com/token', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/x-www-form-urlencoded'
         },
         body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
       });

       const data = await response.json();
       if (!response.ok) {
         throw new Error(data.error_description || data.error || 'Failed to authorize with Google OAuth2.');
       }

       return data.access_token;
    } catch (e: any) {
       throw new Error(`Google Auth Build Error: ${e.message}`);
    }
  }

  /**
   * Pings Google Indexing API to notify them of a URL Update.
   */
  async publishUrl(url: string, serviceAccountJsonStr: string): Promise<any> {
    try {
      const token = await this.getAccessToken(serviceAccountJsonStr);

      const response = await tauriFetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url,
          type: 'URL_UPDATED'
        })
      });

      if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || `Lỗi API (${response.status})`);
      }
      return await response.json();
    } catch (e: any) {
      throw new Error(`Google Indexing Error: ${e.message}`);
    }
  }
}

export const googleIndexingApi = new GoogleIndexingService();
