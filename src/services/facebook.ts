import { fetch } from '@tauri-apps/plugin-http';

const FB_GRAPH_URL = 'https://graph.facebook.com/v19.0';

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
}

export class FacebookService {
  /**
   * Fetches the Pages the user manages using their Account Token.
   */
  async getUserPages(userToken: string): Promise<FacebookPage[]> {
    try {
      const response = await fetch(`${FB_GRAPH_URL}/me/accounts?access_token=${userToken}`, {
        method: 'GET'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error?.message || 'Lỗi lấy thông tin Pages');
      }
      const data = await response.json();
      return data.data || [];
    } catch (e: any) {
      throw new Error(`Graph API Lỗi: ${e.message}`);
    }
  }

  /**
   * Validates a token by attempting to fetch `/me`.
   */
  async verifyToken(token: string): Promise<any> {
    try {
      const response = await fetch(`${FB_GRAPH_URL}/me?access_token=${token}`, {
        method: 'GET'
      });
      if (!response.ok) throw new Error('Token không hợp lệ hoặc đã hết hạn.');
      return await response.json();
    } catch (e: any) {
      throw new Error(`Xác thực thất bại: ${e.message}`);
    }
  }

  /**
   * Publishes content to a Facebook Page Feed.
   * Requires the Page Access Token.
   */
  async publishPost(
    pageId: string, 
    pageToken: string, 
    message: string, 
    link?: string, 
    imageUrl?: string
  ): Promise<string> {
    try {
      let endpoint = `${FB_GRAPH_URL}/${pageId}/feed`;
      let payload: any = {
        message: message,
        access_token: pageToken
      };

      // Graph API handles Links natively, but if an Image URL is provided,
      // creating a "Photo" post is vastly superior natively on FB layout.
      if (imageUrl) {
        endpoint = `${FB_GRAPH_URL}/${pageId}/photos`;
        payload = {
           caption: message,
           url: imageUrl,
           access_token: pageToken
        };
        // If there is also a link, append it to the caption if we are posting a photo.
        if (link) {
           payload.caption += `\n\nLink: ${link}`;
        }
      } else if (link) {
        payload.link = link;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData?.error?.message || 'Lỗi kết nối đến Graph API');
      }

      // Return the ID of the created object
      return responseData.id;

    } catch (error: any) {
      throw new Error(`Facebook Post Error: ${error.message}`);
    }
  }
}

export const facebookApi = new FacebookService();
