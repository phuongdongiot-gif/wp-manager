import { fetch } from '@tauri-apps/plugin-http';
import * as cheerio from 'cheerio';

export interface CrawledData {
  title: string;
  content: string;
  image?: string;
  price?: string;
  sourceUrl: string;
}

export class CrawlerService {
  /**
   * Fetches an XML sitemap and extracts all <loc> URLs via cheerio.
   */
  async fetchSitemapUrls(sitemapUrl: string): Promise<string[]> {
    try {
      const response = await fetch(sitemapUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch sitemap: ${response.status} ${response.statusText}`);
      }
      const text = await response.text();
      
      const $ = cheerio.load(text, { xmlMode: true });
      const urls: string[] = [];
      
      $('loc').each((_, el) => {
        const t = $(el).text();
        if (t) urls.push(t.trim());
      });
      
      return urls;
    } catch (error: any) {
      throw new Error(`Crawler Sitemap Error: ${error.message}`);
    }
  }

  /**
   * Fetches an HTML page and extracts metadata using Cheerio for robust parsing.
   */
  async crawlPage(url: string): Promise<CrawledData> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to crawl page: ${response.status} ${response.statusText}`);
      }
      const htmlText = await response.text();
      
      const $ = cheerio.load(htmlText);
      
      // Clean up DOM - removing non-content tags proactively
      $('script, style, nav, footer, header, aside, form, iframe, noscript, svg, button').remove();

      // Title extraction
      let title = $('title').text() || '';
      const ogTitle = $('meta[property="og:title"]').attr('content');
      if (ogTitle) title = ogTitle;

      // Image extraction
      let image = $('meta[property="og:image"]').attr('content') || '';
      if (!image) {
        const firstImg = $('article img, .post-content img, main img, img').first().attr('src');
        if (firstImg) {
          if (firstImg.startsWith('http')) {
             image = firstImg;
          } else if (firstImg.startsWith('//')) {
             image = `https:${firstImg}`;
          } else {
             const urlObj = new URL(url);
             image = `${urlObj.protocol}//${urlObj.host}${firstImg.startsWith('/') ? '' : '/'}${firstImg}`;
          }
        }
      }

      // Description/Content extraction
      let content = '';
      
      // 1. Check for primary article containers often used in WP or blogs
      const articleBody = $('article, .post-content, .entry-content, .content-inner, main').first();
      if (articleBody.length > 0) {
        // Strip out specific internal junk like social share buttons if possible, though basic clean is already done
        $('.social-share, .related-posts, .comments-area').remove();
        content = articleBody.html() || '';
      } else {
        // 2. Fallback: extract meaningful paragraph blocks
        const paragraphs: string[] = [];
        $('p').each((_, el) => {
           const pt = $(el).text().trim();
           if (pt.length > 20) {
             // Keep the inner raw HTML so bolding / links are preserved
             paragraphs.push(`<p>${$(el).html()}</p>`);
           }
        });
        
        if (paragraphs.length > 0) {
           content = paragraphs.join('\n');
        } else {
           // 3. Absolute fallback to meta descriptions
           const metaDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
           if (metaDesc) content = `<p>${metaDesc}</p>`;
        }
      }

      // Price extraction (attempting common global selectors)
      let price = '';
      const priceText = $('.price, .product-price, [data-price], [itemprop="price"], .woocommerce-Price-amount').first().text();
      if (priceText) {
        // Clean to numbers only (e.g. "1,200,000" -> "1200000")
        price = priceText.replace(/[^0-9]/g, '');
      }

      // Final sanitization of the content could happen here if dompurify is applied,
      // but cheerio removal steps (script/style) handle the heavy lifting for raw crawling.

      return {
        title: title.trim(),
        content: content.trim(),
        image,
        price,
        sourceUrl: url
      };
    } catch (error: any) {
      throw new Error(`Crawler Error on ${url}: ${error.message}`);
    }
  }
}

export const crawler = new CrawlerService();
