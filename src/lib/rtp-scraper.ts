interface RTPEpisode {
  id: string;
  url: string;
  title: string;
  episodeNumber: number;
  airDate: string;
  subtitleUrl?: string;
}

interface RTPSeries {
  id: string;
  title: string;
  url: string;
  episodes: RTPEpisode[];
}

interface ScrapedSubtitle {
  episode: RTPEpisode;
  content: string;
  filename: string;
}

class RTPScraperService {
  private static readonly BASE_URL = 'https://www.rtp.pt';
  
  private static parsePortugueseDate(dateStr: string): string | null {
    if (!dateStr) return null;
    
    const monthMap: Record<string, string> = {
      'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04',
      'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08',
      'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
    };
    
    // Parse format: "02 dez. 2024"
    const match = dateStr.match(/(\d{1,2})\s+(\w{3})\.?\s+(\d{4})/);
    if (!match) return null;
    
    const [, day, monthAbbr, year] = match;
    const month = monthMap[monthAbbr.toLowerCase()];
    
    if (!month) return null;
    
    // Return ISO format: YYYY-MM-DD
    return `${year}-${month}-${day.padStart(2, '0')}`;
  }
  
  static async scrapeSeries(seriesUrl: string): Promise<RTPSeries | null> {
    try {
      const response = await fetch(seriesUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch series page: ${response.statusText}`);
      }
      
      const html = await response.text();
      
      // Extract series ID from URL (e.g., p14147 from /play/p14147/o-americano)
      const seriesIdMatch = seriesUrl.match(/\/p(\d+)\//);
      if (!seriesIdMatch) {
        throw new Error('Invalid RTP series URL format');
      }
      
      const seriesId = seriesIdMatch[1];
      
      // Extract series title
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      const title = titleMatch ? titleMatch[1].replace(' - RTP Play', '').trim() : 'Unknown Series';
      
      // Extract episodes from the HTML
      console.log('HTML snippet around episodes:', html.substring(html.indexOf('Ep.'), html.indexOf('Ep.') + 500));
      const episodes = this.extractEpisodes(html, seriesId);
      
      return {
        id: seriesId,
        title,
        url: seriesUrl,
        episodes
      };
    } catch (error) {
      console.error('Error scraping RTP series:', error);
      return null;
    }
  }
  
  private static extractEpisodes(html: string, seriesId: string): RTPEpisode[] {
    const episodes: RTPEpisode[] = [];
    
    // Parse the specific HTML structure for episode items
    // Look for complete episode blocks: <a href="/play/p14147/e812786/o-americano" ... episode data ... </a>
    const episodeBlockRegex = /<a href="\/play\/p\d+\/(e\d+)\/[^"]*"[^>]*class="episode-item[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
    
    let blockMatch;
    while ((blockMatch = episodeBlockRegex.exec(html)) !== null) {
      const episodeId = blockMatch[1];
      const episodeContent = blockMatch[2];
      
      // Extract episode number from the content
      const episodeNumberMatch = episodeContent.match(/<div class="episode">Ep\.\s*(\d+)<\/div>/);
      if (!episodeNumberMatch) continue;
      const episodeNumber = parseInt(episodeNumberMatch[1]);
      
      // Extract episode date
      const episodeDateMatch = episodeContent.match(/<div class="episode-date">([^<]+)<\/div>/);
      const airDate = episodeDateMatch ? episodeDateMatch[1].trim() : '';
      
      // Extract episode title
      const episodeTitleMatch = episodeContent.match(/<p class="episode-title">\s*([^<]+)\s*<\/p>/);
      const title = episodeTitleMatch ? episodeTitleMatch[1].trim() : `Episode ${episodeNumber}`;
      
      const parsedDate = this.parsePortugueseDate(airDate);
      console.log(`Found episode ${episodeNumber}: "${title}" (${airDate} -> ${parsedDate}) [${episodeId}]`);
      
      episodes.push({
        id: episodeId,
        url: `${this.BASE_URL}/play/p${seriesId}/${episodeId}`,
        title: title,
        episodeNumber: episodeNumber,
        airDate: parsedDate || airDate,
      });
    }
    
    const sortedEpisodes = episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
    console.log('Final episodes found:', sortedEpisodes.length);
    console.log('Episodes:', sortedEpisodes.map(e => `Ep.${e.episodeNumber}: "${e.title}" (RTP ID: ${e.id})`));
    console.log('Full episode data:', JSON.stringify(sortedEpisodes, null, 2));
    
    return sortedEpisodes;
  }
  
  static async scrapeEpisodeSubtitle(episode: RTPEpisode): Promise<ScrapedSubtitle | null> {
    try {
      const response = await fetch(episode.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch episode page: ${response.statusText}`);
      }
      
      const html = await response.text();
      
      // Extract subtitle URL from the RTPPlayer configuration
      // Look for multiple possible patterns for VTT files
      console.log(`Searching for subtitles in episode ${episode.id}...`);
      
      let subtitleUrl = null;
      
      // Pattern 1: vtt: [['PT','Português adaptado','https://...]]
      const vttRegex1 = /vtt:\s*\[\s*\[\s*['"]PT['"],\s*['"][^'"]*['"],\s*['"]([^'"]+)['"]/;
      const vttMatch1 = html.match(vttRegex1);
      if (vttMatch1) {
        subtitleUrl = vttMatch1[1];
        console.log(`Found subtitle (pattern 1): ${subtitleUrl}`);
      }
      
      // Pattern 2: Look for the specific nas2.share/legendas pattern
      if (!subtitleUrl) {
        const vttUrlRegex = /(https:\/\/cdn-ondemand\.rtp\.pt\/nas2\.share\/legendas\/video\/web\/p\d+\/[^"'\s]+\.vtt)/g;
        const vttUrls = html.match(vttUrlRegex);
        if (vttUrls && vttUrls.length > 0) {
          subtitleUrl = vttUrls[0];
          console.log(`Found subtitle (pattern 2 - nas2): ${subtitleUrl}`);
        }
      }
      
      // Pattern 2b: Look for any .vtt URLs in the HTML
      if (!subtitleUrl) {
        const vttUrlRegex = /(https:\/\/cdn-ondemand\.rtp\.pt\/[^"'\s]+\.vtt)/g;
        const vttUrls = html.match(vttUrlRegex);
        if (vttUrls && vttUrls.length > 0) {
          subtitleUrl = vttUrls[0];
          console.log(`Found subtitle (pattern 2b - general): ${subtitleUrl}`);
        }
      }
      
      // Pattern 3: Look in script tags for subtitle configuration
      if (!subtitleUrl) {
        const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
        let scriptMatch;
        while ((scriptMatch = scriptRegex.exec(html)) !== null && !subtitleUrl) {
          const scriptContent = scriptMatch[1];
          
          // First look for the specific nas2.share pattern
          const vttInScript = scriptContent.match(/(https:\/\/cdn-ondemand\.rtp\.pt\/nas2\.share\/legendas\/video\/web\/p\d+\/[^"'\s]+\.vtt)/);
          if (vttInScript) {
            subtitleUrl = vttInScript[1];
            console.log(`Found subtitle (pattern 3 - nas2): ${subtitleUrl}`);
            break;
          }
          
          // Then look for any .vtt pattern
          const vttInScriptGeneral = scriptContent.match(/(https:\/\/cdn-ondemand\.rtp\.pt\/[^"'\s]+\.vtt)/);
          if (vttInScriptGeneral) {
            subtitleUrl = vttInScriptGeneral[1];
            console.log(`Found subtitle (pattern 3 - general): ${subtitleUrl}`);
            break;
          }
        }
      }
      
      // Pattern 4: Try to construct subtitle URL from episode information
      if (!subtitleUrl) {
        console.log(`Trying to construct subtitle URL for episode ${episode.id}...`);
        
        // Extract series ID from episode URL
        const seriesIdMatch = episode.url.match(/\/play\/(p\d+)\//);
        const seriesId = seriesIdMatch ? seriesIdMatch[1] : 'p14147'; // fallback for backward compatibility
        console.log(`Using series ID: ${seriesId}`);
        
        // First, try to find patterns that include the specific episode ID
        const episodeSpecificRegex = new RegExp(`${seriesId}_2_(\\d{8}\\d{6}${episode.id}t\\d{4}d)`);
        const episodeSpecificMatch = html.match(episodeSpecificRegex);
        
        if (episodeSpecificMatch) {
          const filePattern = episodeSpecificMatch[1];
          const constructedUrl = `https://cdn-ondemand.rtp.pt/nas2.share/legendas/video/web/${seriesId}/${seriesId}_2_${filePattern}.vtt`;
          console.log(`Attempting episode-specific constructed subtitle URL: ${constructedUrl}`);
          
          try {
            const testResponse = await fetch(constructedUrl, { method: 'HEAD' });
            if (testResponse.ok) {
              subtitleUrl = constructedUrl;
              console.log(`Found subtitle (pattern 4 - episode-specific): ${subtitleUrl}`);
            }
          } catch (e) {
            console.log('Episode-specific constructed URL test failed:', e);
          }
        }
        
        // Fallback: Look for any pattern but verify it's for the right episode
        if (!subtitleUrl) {
          console.log('Episode-specific pattern not found, trying all patterns...');
          const allPatternRegex = new RegExp(`${seriesId}_2_(\\d{8}\\d{6}e\\d{3}t\\d{4}d)`, 'g');
          let patternMatch;
          
          while ((patternMatch = allPatternRegex.exec(html)) !== null) {
            const filePattern = patternMatch[1];
            const constructedUrl = `https://cdn-ondemand.rtp.pt/nas2.share/legendas/video/web/${seriesId}/${seriesId}_2_${filePattern}.vtt`;
            console.log(`Attempting pattern: ${filePattern} -> ${constructedUrl}`);
            
            try {
              const testResponse = await fetch(constructedUrl, { method: 'HEAD' });
              if (testResponse.ok) {
                // Test if this subtitle content is actually for the current episode
                const testContentResponse = await fetch(constructedUrl);
                const testContent = await testContentResponse.text();
                
                // Simple heuristic: check if episode title appears in subtitle content
                if (testContent.toLowerCase().includes(episode.title.toLowerCase().substring(0, 20))) {
                  subtitleUrl = constructedUrl;
                  console.log(`Found subtitle (pattern 4 - verified): ${subtitleUrl}`);
                  break;
                } else {
                  console.log(`Pattern ${filePattern} found valid URL but content doesn't match episode`);
                }
              }
            } catch (e) {
              console.log(`Pattern ${filePattern} test failed:`, e);
            }
          }
        }
      }
      
      if (!subtitleUrl) {
        console.warn(`No subtitle found for episode ${episode.id}`);
        console.log('HTML snippet for debugging:', html.substring(0, 1000));
        console.log('Looking for image patterns in HTML...');
        const allImages = html.match(/https:\/\/cdn-images\.rtp\.pt\/[^"'\s]+/g);
        if (allImages) {
          console.log('Found image URLs:', allImages.slice(0, 3));
        }
        return null;
      }
      
      // Download the subtitle content
      const subtitleResponse = await fetch(subtitleUrl);
      if (!subtitleResponse.ok) {
        throw new Error(`Failed to download subtitle: ${subtitleResponse.statusText}`);
      }
      
      const subtitleContent = await subtitleResponse.text();
      
      // Generate filename similar to existing format
      const filename = `${episode.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-s01e${episode.episodeNumber.toString().padStart(2, '0')}.vtt`;
      
      return {
        episode,
        content: subtitleContent,
        filename
      };
    } catch (error) {
      console.error(`Error scraping subtitle for episode ${episode.id}:`, error);
      return null;
    }
  }
  
  static async scrapeAllSubtitles(seriesUrl: string): Promise<ScrapedSubtitle[]> {
    const series = await this.scrapeSeries(seriesUrl);
    if (!series) {
      throw new Error('Failed to scrape series data');
    }
    
    const subtitles: ScrapedSubtitle[] = [];
    
    // Process episodes sequentially to avoid overwhelming the server
    for (const episode of series.episodes) {
      const subtitle = await this.scrapeEpisodeSubtitle(episode);
      if (subtitle) {
        subtitles.push(subtitle);
      }
      
      // Add a small delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return subtitles;
  }
  
  static parseRTPUrl(url: string): { isValid: boolean; seriesId?: string; episodeId?: string } {
    // Series URL: https://www.rtp.pt/play/p14147/o-americano
    const seriesMatch = url.match(/\/play\/(p\d+)\/[^\/]+$/);
    if (seriesMatch) {
      return {
        isValid: true,
        seriesId: seriesMatch[1]
      };
    }
    
    // Episode URL: https://www.rtp.pt/play/p14147/e812786/o-americano
    const episodeMatch = url.match(/\/play\/(p\d+)\/(e\d+)\//);
    if (episodeMatch) {
      return {
        isValid: true,
        seriesId: episodeMatch[1],
        episodeId: episodeMatch[2]
      };
    }
    
    return { isValid: false };
  }
  
  static normalizeSeriesName(rtpTitle: string): string {
    // Clean up RTP title for TVDB matching
    return rtpTitle
      .replace(/\s*-\s*RTP\s*Play\s*/i, '')
      .replace(/\s*\|\s*RTP\s*/i, '')
      .trim();
  }
}

export default RTPScraperService;
export type { RTPSeries, RTPEpisode, ScrapedSubtitle };