import { fetch } from '@tauri-apps/plugin-http';
import { WPUser } from '../types/wordpress';

export const validateCredentials = async (url: string, user: string, pass: string): Promise<{ user: WPUser, siteName: string }> => {
  let cleanUrl = url.trim().replace(/\/$/, '');
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = 'https://' + cleanUrl;
  }
  const cleanUser = user.trim();
  const cleanPass = pass.trim();
  const credentials = btoa(`${cleanUser}:${cleanPass}`);
  
  try {
    const [userResponse, rootResponse] = await Promise.all([
      fetch(`${cleanUrl}/wp-json/wp/v2/users/me`, {
        method: "GET",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Accept": "application/json"
        }
      }),
      fetch(`${cleanUrl}/wp-json/`, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      })
    ]);

    if (!userResponse.ok) {
      const errorData = await userResponse.json().catch(() => null);
      throw new Error(errorData?.message || 'Invalid credentials');
    }

    const wpUser = await userResponse.json() as WPUser;
    
    let siteName = '';
    if (rootResponse.ok) {
      const rootData = await rootResponse.json().catch(() => null);
      if (rootData && rootData.name) {
        siteName = rootData.name;
      }
    }

    return { user: wpUser, siteName };
  } catch (error: any) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Failed to connect to WordPress site. Check your URL.');
    }
    throw error;
  }
};
