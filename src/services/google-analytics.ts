import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { SignJWT, importPKCS8 } from 'jose';

export interface GAMetric {
  name: string;
}
export interface GADimension {
  name: string;
}
export interface GADateRange {
  startDate: string;
  endDate: string;
}

export class GoogleAnalyticsService {
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
      throw new Error("File JSON bị thiếu trường 'private_key' hoặc 'client_email'.");
    }

    try {
       const privateKey = await importPKCS8(creds.private_key, 'RS256');
       const iat = Math.floor(Date.now() / 1000);
       const exp = iat + 3600; // 1 hour token lifetime

       const jwt = await new SignJWT({
         iss: creds.client_email,
         scope: 'https://www.googleapis.com/auth/analytics.readonly',
         aud: 'https://oauth2.googleapis.com/token'
       })
         .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
         .setIssuedAt(iat)
         .setExpirationTime(exp)
         .sign(privateKey);

       const response = await tauriFetch('https://oauth2.googleapis.com/token', {
         method: 'POST',
         headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
         body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
       });

       const data = await response.json();
       if (!response.ok) {
         throw new Error(data.error_description || data.error || 'Lỗi lấy Token GA4.');
       }
       return data.access_token;
    } catch (e: any) {
       throw new Error(`Google GA4 Auth Error: ${e.message}`);
    }
  }

  /**
   * Fetches data from Google Analytics 4 Data API.
   * Documentation: https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport
   */
  async runReport(
    propertyId: string, 
    serviceAccountJsonStr: string,
    metrics: GAMetric[],
    dimensions: GADimension[],
    dateRanges: GADateRange[]
  ): Promise<any> {
      const token = await this.getAccessToken(serviceAccountJsonStr);
      
      const payload = {
          dimensions,
          metrics,
          dateRanges
      };

      const cleanPropId = propertyId.replace(/[^0-9]/g, '');

      const response = await tauriFetch(`https://analyticsdata.googleapis.com/v1beta/properties/${cleanPropId}:runReport`, {
          method: 'POST',
          headers: {
             'Authorization': `Bearer ${token}`,
             'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || `Lỗi API GA4 (${response.status})`);
      }
      return await response.json();
  }
}

export const googleAnalyticsApi = new GoogleAnalyticsService();
