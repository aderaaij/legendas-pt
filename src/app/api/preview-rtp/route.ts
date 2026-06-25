import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import RTPScraperService from "@/lib/rtp-scraper";

export async function POST(request: NextRequest) {
  try {
    const { rtpUrl } = await request.json();

    // Get the authorization header for admin check
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Create authenticated Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Verify the user is authenticated and is an admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    console.log("Profile query result:", {
      profile,
      profileError,
      userId: user.id,
    });

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return NextResponse.json(
        { error: `Profile fetch error: ${profileError.message}` },
        { status: 500 }
      );
    }

    if (!profile || profile.role !== "admin") {
      console.log("User is not admin:", { profile, role: profile?.role });
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    if (!rtpUrl) {
      return NextResponse.json(
        { error: "RTP URL is required" },
        { status: 400 }
      );
    }

    // Validate RTP URL format
    const urlValidation = RTPScraperService.parseRTPUrl(rtpUrl);
    if (!urlValidation.isValid) {
      return NextResponse.json(
        {
          error:
            "Invalid RTP URL format. Please provide a series URL like: https://www.rtp.pt/play/p14147/o-americano",
        },
        { status: 400 }
      );
    }

    // Import the server-side scraper directly
    let series;

    try {
      const puppeteer = await import("puppeteer");
      console.log("Puppeteer available, using enhanced scraping...");

      const browser = await puppeteer.default.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
        ],
      });

      const page = await browser.newPage();
      await page.setDefaultTimeout(30000);

      console.log("Navigating to RTP URL:", rtpUrl);
      await page.goto(rtpUrl, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      console.log("Waiting for episodes to load...");
      // First wait for initial episodes
      await page.waitForFunction(
        () => {
          const articles = document.querySelectorAll("article.episode-article");
          return articles.length >= 5;
        },
        { timeout: 15000 }
      );

      console.log("Initial episodes loaded, waiting for all episodes...");
      // Wait a bit more and check if more episodes load
      let previousCount = 0;
      let stableCount = 0;

      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second

        const currentCount = await page.evaluate(() => {
          return document.querySelectorAll("article.episode-article").length;
        });

        console.log(`Episode count check ${i + 1}: ${currentCount} episodes`);

        if (currentCount === previousCount) {
          stableCount++;
          if (stableCount >= 3) {
            console.log("Episode count stable, proceeding...");
            break;
          }
        } else {
          stableCount = 0;
        }

        previousCount = currentCount;
      }

      // Also wait for any potential lazy loading indicators to disappear
      try {
        await page.waitForFunction(
          () => {
            const loadingIndicators = document.querySelectorAll(
              '.loading, .spinner, [class*="load"]'
            );
            return loadingIndicators.length === 0;
          },
          { timeout: 5000 }
        );
      } catch (e) {
        console.log("No loading indicators found or timeout reached");
      }

      // Check for pagination or "Load More" functionality
      console.log("Checking for pagination or load more buttons...");
      try {
        const hasLoadMore = await page.evaluate(() => {
          const loadMoreButtons = document.querySelectorAll(
            'button, a, [onclick], .load-more, .pagination, [class*="more"], [class*="next"], [id*="more"], [id*="load"]'
          );
          const buttons = Array.from(loadMoreButtons).filter((btn) => {
            const text = btn.textContent?.toLowerCase() || "";
            const className = btn.className?.toLowerCase() || "";
            const id = btn.id?.toLowerCase() || "";
            return (
              text.includes("more") ||
              text.includes("next") ||
              text.includes("load") ||
              className.includes("more") ||
              className.includes("next") ||
              className.includes("load") ||
              id.includes("more") ||
              id.includes("next") ||
              id.includes("load")
            );
          });

          console.log(
            "Found potential load more/pagination elements:",
            buttons.length
          );
          buttons.forEach((btn, i) => {
            console.log(
              `Button ${i + 1}:`,
              btn.textContent?.trim(),
              btn.className,
              btn.id
            );
          });

          return buttons.length > 0 ? buttons : null;
        });

        if (hasLoadMore) {
          console.log(
            "Found load more functionality, attempting to trigger..."
          );

          // Try clicking the first relevant button
          await page.evaluate(() => {
            const loadMoreButtons = document.querySelectorAll(
              'button, a, [onclick], .load-more, .pagination, [class*="more"], [class*="next"], [id*="more"], [id*="load"]'
            );
            const buttons = Array.from(loadMoreButtons).filter((btn) => {
              const text = btn.textContent?.toLowerCase() || "";
              const className = btn.className?.toLowerCase() || "";
              const id = btn.id?.toLowerCase() || "";
              return (
                text.includes("more") ||
                text.includes("next") ||
                text.includes("load") ||
                className.includes("more") ||
                className.includes("next") ||
                className.includes("load") ||
                id.includes("more") ||
                id.includes("next") ||
                id.includes("load")
              );
            });

            if (buttons.length > 0) {
              (buttons[0] as HTMLElement).click();
            }
          });

          // Wait for new content to load
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // Check if more episodes appeared
          const newCount = await page.evaluate(() => {
            return document.querySelectorAll("article.episode-article").length;
          });

          console.log(`After clicking load more: ${newCount} episodes`);
        }
      } catch (loadMoreError) {
        console.log("Error checking for load more:", loadMoreError);
      }

      const html = await page.content();
      await browser.close();

      console.log("Got HTML with Puppeteer, extracting episodes...");

      // Extract series data from the HTML
      const seriesUrlMatch = rtpUrl.match(/\/play\/(p\d+)\/([^\/]+)/);
      if (!seriesUrlMatch) {
        throw new Error("Invalid RTP series URL format");
      }

      const seriesId = seriesUrlMatch[1];
      const seriesSlug = seriesUrlMatch[2];

      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      const title = titleMatch
        ? titleMatch[1].replace(" - RTP Play", "").trim()
        : "Unknown Series";

      // Extract episodes
      const episodes = [];

      // First, let's see how many episode articles are in the HTML
      const allArticleMatches = html.match(
        /<article[^>]*class="[^"]*episode-article[^"]*"[^>]*>/g
      );
      console.log(
        `Total episode articles found in HTML: ${
          allArticleMatches ? allArticleMatches.length : 0
        }`
      );

      // Also check for all episode IDs in the HTML
      const allEpisodeIds = html.match(/\/play\/p\d+\/(e\d+)\//g);
      let uniqueIds: string[] = [];
      if (allEpisodeIds) {
        uniqueIds = [
          ...new Set(allEpisodeIds.map((match) => match.match(/e\d+/)?.[0])),
        ].filter((id): id is string => Boolean(id));
        console.log(`Unique episode IDs found: ${uniqueIds.length}`, uniqueIds);
      }

      const episodeArticleRegex =
        /<article[^>]*class="[^"]*episode-article[^"]*"[^>]*>([\s\S]*?)<\/article>/g;

      let articleMatch;
      let articleCount = 0;
      while ((articleMatch = episodeArticleRegex.exec(html)) !== null) {
        articleCount++;
        const articleContent = articleMatch[1];

        console.log(`Processing article ${articleCount}:`);

        const linkMatch =
          articleContent.match(
            /<a href="\/play\/p\d+\/(e\d+)\/[^"]*"[^>]*title="([^"]*)"[^>]*class="episode-item[^"]*"[^>]*>/
          ) ||
          articleContent.match(
            /<a href="\/play\/p\d+\/(e\d+)\/[^"]*"[^>]*class="episode-item[^"]*"[^>]*title="([^"]*)"[^>]*>/
          ) ||
          articleContent.match(/<a href="\/play\/p\d+\/(e\d+)\/[^"]*"[^>]*>/);

        if (!linkMatch) {
          console.log(`No link match found in article ${articleCount}`);
          console.log(
            `Article content preview: ${articleContent.substring(0, 200)}`
          );
          continue;
        }

        const episodeId = linkMatch[1];
        const linkTitle = linkMatch[2] || "";
        console.log(`Found episode ID: ${episodeId}`);

        const episodeNumberMatch = articleContent.match(
          /<div class="episode">Ep\.\s*(\d+)<\/div>/
        );
        if (!episodeNumberMatch) {
          console.log(
            `No episode number found in article ${articleCount} for episode ${episodeId}`
          );
          console.log(`Article content: ${articleContent}`);
          continue;
        }

        const episodeNumber = parseInt(episodeNumberMatch[1]);
        console.log(`Episode ${episodeNumber} extracted successfully`);

        const metaContentMatch = articleContent.match(
          /<meta content="[^"]*Ep\.\s*\d+\s*([^"]+)"/
        );
        const airDate = metaContentMatch ? metaContentMatch[1].trim() : "";

        episodes.push({
          id: episodeId,
          url: `https://www.rtp.pt/play/${seriesId}/${episodeId}/${seriesSlug}`,
          title: `Episode ${episodeNumber}`,
          episodeNumber: episodeNumber,
          airDate: airDate,
        });
      }

      console.log(
        `Processed ${articleCount} articles, extracted ${episodes.length} episodes`
      );

      // If we found fewer episodes than expected, try to extract the missing ones
      if (allEpisodeIds && episodes.length < uniqueIds.length) {
        console.log("Attempting to extract missing episodes...");

        const foundEpisodeIds = new Set(episodes.map((ep) => ep.id));
        const missingIds = uniqueIds.filter((id) => !foundEpisodeIds.has(id));

        console.log("Missing episode IDs:", missingIds);

        for (const episodeId of missingIds) {
          // Find the context around this episode ID in the HTML
          const episodeIdIndex = html.indexOf(episodeId);
          if (episodeIdIndex !== -1) {
            const contextStart = Math.max(0, episodeIdIndex - 1000);
            const contextEnd = Math.min(html.length, episodeIdIndex + 1000);
            const context = html.substring(contextStart, contextEnd);

            // Try to find episode number in this context
            const epNumberMatch = context.match(/Ep\.\s*(\d+)/);
            if (epNumberMatch) {
              const episodeNumber = parseInt(epNumberMatch[1]);
              console.log(
                `Found missing episode ${episodeNumber} with ID ${episodeId}`
              );

              // Check if this episode number is already in our list
              const existingEpisode = episodes.find(
                (ep) => ep.episodeNumber === episodeNumber
              );
              if (!existingEpisode) {
                episodes.push({
                  id: episodeId,
                  url: `https://www.rtp.pt/play/${seriesId}/${episodeId}/${seriesSlug}`,
                  title: `Episode ${episodeNumber}`,
                  episodeNumber: episodeNumber,
                  airDate: "",
                });
                console.log(`Added missing episode ${episodeNumber}`);
              } else {
                console.log(
                  `Episode ${episodeNumber} already exists, skipping duplicate`
                );
              }
            } else {
              console.log(`Could not find episode number for ID ${episodeId}`);
              console.log(`Context: ${context.substring(0, 200)}...`);
            }
          }
        }
      }

      series = {
        id: seriesId,
        title,
        url: rtpUrl,
        episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber),
      };

      console.log(`Successfully extracted ${episodes.length} episodes`);
    } catch (puppeteerError) {
      console.error(
        "Puppeteer failed, falling back to regular scraping:",
        puppeteerError
      );

      // Fallback to original scraper
      series = await RTPScraperService.scrapeSeries(rtpUrl);
      if (!series) {
        return NextResponse.json(
          { error: "Failed to scrape series data from RTP" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      series,
    });
  } catch (error) {
    console.error("RTP preview error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
