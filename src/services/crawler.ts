import { fetch } from '@tauri-apps/plugin-http';
import * as cheerio from 'cheerio';

export interface CrawledData {
  title: string;
  content: string;
  image?: string;
  price?: string;
  sourceUrl: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  contentImages?: string[];
}

export class CrawlerService {
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

  async crawlPage(url: string, targetLink?: string): Promise<CrawledData> {
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
      
      // SEO Tags
      let title = $('title').text() || '';
      const ogTitle = $('meta[property="og:title"]').attr('content');
      if (ogTitle) title = ogTitle;

      const seoTitle = $('meta[name="title"]').attr('content') || title;
      const seoDescription = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
      const seoKeywords = $('meta[name="keywords"]').attr('content') || '';

      // Image extraction (Featured Image)
      let image = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || '';
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

      // Cleanup
      $('script, style, nav, footer, header, aside, form, iframe, noscript, svg, button').remove();

      // Description/Content extraction
      let content = '';
      
      const articleBody = $('article, .post-content, .entry-content, .content-inner, main').first();
      if (articleBody.length > 0) {
        $('.social-share, .related-posts, .comments-area').remove();
        content = articleBody.html() || '';
      } else {
        const paragraphs: string[] = [];
        $('p').each((_, el) => {
           const pt = $(el).text().trim();
           if (pt.length > 20) {
             paragraphs.push(`<p>${$(el).html()}</p>`);
           }
        });
        
        if (paragraphs.length > 0) {
           content = paragraphs.join('\n');
        } else {
           if (seoDescription) content = `<p>${seoDescription}</p>`;
        }
      }

      // Deep Content Image Extraction + Normalization
      const contentImages: string[] = [];
      const $content = cheerio.load(content, null, false);
      
      // Remove picture sources to force fallback to the main <img> tag that we rewrite
      $content('picture source').remove();
      
      $content('img').each((_, el) => {
         let src = $content(el).attr('data-src') || $content(el).attr('data-lazy-src') || $content(el).attr('data-original') || $content(el).attr('src');
         
         if (!src) {
           const srcset = $content(el).attr('srcset') || $content(el).attr('data-srcset');
           if (srcset) {
             const items = srcset.split(',');
             if (items.length > 0) {
               src = items[items.length - 1].trim().split(' ')[0]; // usually the last one in srcset is highest res, or first
             }
           }
         }

         if (src) {
            let fullSrc = src;
            if (src.startsWith('//')) {
              fullSrc = `https:${src}`;
            } else if (src.startsWith('/')) {
              try {
                const urlObj = new URL(url);
                fullSrc = `${urlObj.protocol}//${urlObj.host}${src}`;
              } catch(e) {}
            }
            $content(el).attr('src', fullSrc);
            
            // Clean up old attributes so WordPress doesn't get confused
            $content(el).removeAttr('data-src');
            $content(el).removeAttr('data-lazy-src');
            $content(el).removeAttr('data-original');
            $content(el).removeAttr('data-srcset');
            $content(el).removeAttr('class');
            $content(el).removeAttr('srcset');
            $content(el).removeAttr('sizes');
            $content(el).removeAttr('loading');
            
            // Only collect external URLs we need to download
            if (fullSrc.startsWith('http') && !contentImages.includes(fullSrc)) {
              contentImages.push(fullSrc);
            }
         }
      });
      
      // Link Re-routing or Stripping
      if (targetLink && targetLink.trim() !== '') {
         const trimLink = targetLink.trim();
         if (trimLink === '#') {
            // Strip links but keep inner text/html
            $content('a').each((_, el) => {
               $content(el).replaceWith($content(el).html() || $content(el).text());
            });
         } else {
            // Rewrite links
            $content('a').each((_, el) => {
               $content(el).attr('href', trimLink);
               $content(el).attr('target', '_blank');
               $content(el).attr('rel', 'noopener noreferrer');
            });
         }
      }
      
      content = $content.html();

      // Price extraction
      let price = '';
      const priceText = $('.price, .product-price, [data-price], [itemprop="price"], .woocommerce-Price-amount').first().text();
      if (priceText) {
        price = priceText.replace(/[^0-9]/g, '');
      }

      return {
        title: title.trim(),
        content: content.trim(),
        image,
        price,
        sourceUrl: url,
        seoTitle,
        seoDescription,
        seoKeywords,
        contentImages
      };
    } catch (error: any) {
      throw new Error(`Crawler Error on ${url}: ${error.message}`);
    }
  }
}

export const crawler = new CrawlerService();
