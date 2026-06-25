import { NextRequest, NextResponse } from 'next/server';
import type { RTPSeries } from '@/types/rtp';

class RTPScraperService {
  private static readonly BASE_URL = "https://www.rtp.pt";

  private static parsePortugueseDate(dateStr: string): string | null {
    if (!dateStr) return null;

    const monthMap: Record<string, string> = {
      jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06",
      jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12",
    };

    const match = dateStr.match(/(\d{1,2})\s+(\w{3})\.?\s+(\d{4})/);
    if (!match) return null;

    const [, day, monthAbbr, year] = match;
    const month = monthMap[monthAbbr.toLowerCase()];
    if (!month) return null;

    return `${year}-${month}-${day.padStart(2, "0")}`;
  }

  static async scrapeSeries(seriesUrl: string): Promise<RTPSeries | null> {
    try {
      let html: string;
      
      try {
        console.log('Attempting to import Puppeteer...');
        const puppeteer = await import('puppeteer');
        
        console.log('Puppeteer imported, launching browser...');
        const browser = await puppeteer.default.launch({ 
          headless: true,
          args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        });
        
        console.log('Browser launched, creating new page...');
        const page = await browser.newPage();
        
        await page.setDefaultTimeout(30000);
        
        console.log('Navigating to:', seriesUrl);
        await page.goto(seriesUrl, { 
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        
        console.log('Page loaded, waiting for episodes...');
        // Wait for episodes to load
        await page.waitForFunction(
          () => {
            const articles = document.querySelectorAll('article.episode-article');
            console.log('Articles found:', articles.length);
            return articles.length >= 5; // Lower threshold for testing
          },
          { timeout: 15000 }
        );
        
        console.log('Episodes loaded, getting content...');
        html = await page.content();
        await browser.close();
        
        console.log('Successfully loaded page with Puppeteer');
      } catch (puppeteerError) {
        console.error('Puppeteer failed with error:', puppeteerError);
        console.log('Falling back to regular fetch...');
        
        const response = await fetch(seriesUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch series page: ${response.statusText}`);
        }
        html = await response.text();
        console.log('Fallback fetch completed');
      }

      const seriesUrlMatch = seriesUrl.match(/\/play\/(p\d+)\/([^\/]+)/);
      if (!seriesUrlMatch) {
        throw new Error("Invalid RTP series URL format");
      }

      const seriesId = seriesUrlMatch[1];
      const seriesSlug = seriesUrlMatch[2];

      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      const title = titleMatch
        ? titleMatch[1].replace(" - RTP Play", "").trim()
        : "Unknown Series";

      const episodes = this.extractEpisodes(html, seriesId, seriesSlug);

      return {
        id: seriesId,
        title,
        url: seriesUrl,
        episodes,
      };
    } catch (error) {
      console.error("Error scraping RTP series:", error);
      return null;
    }
  }

  private static extractEpisodes(html: string, seriesId: string, seriesSlug: string) {
    const episodes = [];
    
    const allArticleMatches = html.match(/<article[^>]*class="[^"]*episode-article[^"]*"[^>]*>/g);
    console.log(`Total episode articles found in HTML: ${allArticleMatches ? allArticleMatches.length : 0}`);

    const episodeArticleRegex = /<article[^>]*class="[^"]*episode-article[^"]*"[^>]*>([\s\S]*?)<\/article>/g;

    let articleMatch;
    let articleCount = 0;
    while ((articleMatch = episodeArticleRegex.exec(html)) !== null) {
      articleCount++;
      const articleContent = articleMatch[1];
      
      const linkMatch = articleContent.match(/<a href="\/play\/p\d+\/(e\d+)\/[^"]*"[^>]*title="([^"]*)"[^>]*class="episode-item[^"]*"[^>]*>/) ||
                       articleContent.match(/<a href="\/play\/p\d+\/(e\d+)\/[^"]*"[^>]*class="episode-item[^"]*"[^>]*title="([^"]*)"[^>]*>/) ||
                       articleContent.match(/<a href="\/play\/p\d+\/(e\d+)\/[^"]*"[^>]*>/);
      
      if (!linkMatch) continue;
      
      const episodeId = linkMatch[1];
      const linkTitle = linkMatch[2] || "";

      const episodeNumberMatch = articleContent.match(/<div class="episode">Ep\.\s*(\d+)<\/div>/);
      if (!episodeNumberMatch) continue;
      
      const episodeNumber = parseInt(episodeNumberMatch[1]);

      const metaContentMatch = articleContent.match(/<meta content="[^"]*Ep\.\s*\d+\s*([^"]+)"/);
      const airDate = metaContentMatch ? metaContentMatch[1].trim() : "";

      const expectedShowName = seriesSlug.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      const expectedGenericTitle = `Aceder a ${expectedShowName}`;
      
      const title = linkTitle && linkTitle !== expectedGenericTitle ? 
        linkTitle.replace(/^Aceder a\s+/, '').trim() : 
        `Episode ${episodeNumber}`;

      const parsedDate = this.parsePortugueseDate(airDate);

      episodes.push({
        id: episodeId,
        url: `${this.BASE_URL}/play/${seriesId}/${episodeId}/${seriesSlug}`,
        title: title,
        episodeNumber: episodeNumber,
        airDate: parsedDate || airDate,
      });
    }

    console.log(`Processed ${articleCount} articles, found ${episodes.length} valid episodes`);
    return episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
  }
}

export async function POST(request: NextRequest) {
  console.log('scrape-rtp-series API called');
  
  try {
    const body = await request.json();
    console.log('Request body:', body);
    
    const { rtpUrl } = body;

    if (!rtpUrl) {
      console.log('Missing RTP URL');
      return NextResponse.json({ error: 'RTP URL is required' }, { status: 400 });
    }

    console.log('Starting to scrape series:', rtpUrl);
    const series = await RTPScraperService.scrapeSeries(rtpUrl);
    
    if (!series) {
      console.log('Scraping returned null');
      return NextResponse.json({ error: 'Failed to scrape series data' }, { status: 500 });
    }

    console.log('Successfully scraped series:', { 
      id: series.id, 
      title: series.title, 
      episodeCount: series.episodes.length 
    });
    
    return NextResponse.json({ success: true, series });
  } catch (error) {
    console.error('Error in scrape-rtp-series API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    );
  }
}