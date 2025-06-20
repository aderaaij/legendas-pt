import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import RTPScraperService from "@/lib/rtp-scraper";
import TVDBService from "@/lib/tvdb";
import { generateContentHash } from "@/utils/extractPhrasesUitls";
import { PhraseExtractionService } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  let extractionJob: any = null;
  let supabase: any = null;
  try {
    const {
      rtpUrl,
      saveToDatabase = true,
      forceReExtraction = false,
      selectedEpisodes = null,
    } = await request.json();

    // Get the authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Create authenticated Supabase client
    supabase = createClient(
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

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return NextResponse.json(
        { error: `Profile fetch error: ${profileError.message}` },
        { status: 500 }
      );
    }

    if (!profile || profile.role !== "admin") {
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

    // Scrape series data
    const series = await RTPScraperService.scrapeSeries(rtpUrl);
    if (!series) {
      return NextResponse.json(
        { error: "Failed to scrape series data from RTP" },
        { status: 500 }
      );
    }

    // Filter episodes based on selection first to get accurate count
    const episodesToProcess = selectedEpisodes && Array.isArray(selectedEpisodes) 
      ? series.episodes.filter(ep => selectedEpisodes.includes(ep.episodeNumber))
      : series.episodes;

    // Create extraction job for tracking
    extractionJob = await PhraseExtractionService.createExtractionJob(
      user.id,
      'rtp_series',
      series.title,
      rtpUrl,
      episodesToProcess.length,
      supabase
    );

    // Update job status to running
    await PhraseExtractionService.updateExtractionJob(extractionJob.id, {
      status: 'running',
    }, supabase);

    // Try to find matching show in TVDB
    const normalizedTitle = RTPScraperService.normalizeSeriesName(series.title);
    const tvdbMatch = await TVDBService.findBestMatch(normalizedTitle);

    let showId: string | null = null;

    if (saveToDatabase) {
      // Create or get existing show using authenticated client
      const showName =
        tvdbMatch.show && tvdbMatch.confidence > 0.6
          ? tvdbMatch.show.name
          : series.title;

      // First try to find existing show
      const { data: existingShow } = await supabase
        .from("shows")
        .select("id")
        .eq("name", showName)
        .eq("source", "rtp")
        .single();

      if (existingShow) {
        showId = existingShow.id; // Keep as string UUID
      } else {
        // Create new show
        const showData = {
          name: showName,
          source: "rtp",
          ...(tvdbMatch.show &&
            tvdbMatch.confidence > 0.6 && {
              tvdb_id: tvdbMatch.show.id,
              tvdb_slug: tvdbMatch.show.slug,
              description: tvdbMatch.show.overview,
              genre: tvdbMatch.show.genres?.join(", "),
              poster_url: tvdbMatch.show.image,
            }),
        };

        const { data: newShow, error: showError } = await supabase
          .from("shows")
          .insert(showData)
          .select("id")
          .single();

        if (showError) {
          console.error("Error creating show:", showError);
          return NextResponse.json(
            { error: `Failed to create show: ${showError.message}` },
            { status: 500 }
          );
        }

        showId = newShow.id; // Keep as string UUID
      }
    }

    // Process episodes and subtitles
    const results = [];
    let completedCount = 0;
    let failedCount = 0;

    for (const episode of episodesToProcess) {
      try {
        // Update job with current episode
        await PhraseExtractionService.updateExtractionJob(extractionJob.id, {
          current_episode: `Ep. ${episode.episodeNumber}: ${episode.title}`,
          progress: Math.round((completedCount / episodesToProcess.length) * 100),
        }, supabase);

        // Check if job was cancelled
        const currentJob = await PhraseExtractionService.getExtractionJob(extractionJob.id, supabase);
        if (currentJob?.status === 'cancelled') {
          return NextResponse.json({
            error: 'Job was cancelled',
            jobId: extractionJob.id,
            results,
          });
        }
        // Scrape subtitle
        const scrapedSubtitle = await RTPScraperService.scrapeEpisodeSubtitle(
          episode
        );
        if (!scrapedSubtitle) {
          results.push({
            episode: episode.episodeNumber,
            title: episode.title,
            status: "no_subtitle",
            message: "No subtitle found",
          });
          failedCount++;
          continue;
        }

        // Check for existing extraction
        const contentHash = generateContentHash(scrapedSubtitle.content);
        let existingExtraction = null;

        if (saveToDatabase) {
          const { data } = await supabase
            .from("phrase_extractions")
            .select("id")
            .eq("content_hash", contentHash)
            .single();
          existingExtraction = data;
        }

        if (existingExtraction && !forceReExtraction) {
          results.push({
            episode: episode.episodeNumber,
            title: episode.title,
            status: "already_exists",
            extractionId: existingExtraction.id,
          });
          completedCount++;
          continue;
        }

        // Create episode in database if needed
        let episodeId: string | null = null;
        if (saveToDatabase && showId) {
          // Parse season from episode title if available, otherwise default to 1
          const seasonMatch = episode.title.match(/[Ss](?:eason|érie)?\s*(\d+)/);
          const season = seasonMatch ? parseInt(seasonMatch[1]) : 1;
          
          console.log(`Creating/finding episode: Show=${showId}, Season=${season}, Episode=${episode.episodeNumber}, Title="${episode.title}", RTP_ID=${episode.id}`);
          
          // First try to find existing episode by RTP episode ID (more precise)
          const { data: existingEpisodeByRtpId } = await supabase
            .from("episodes")
            .select("id")
            .eq("show_id", showId)
            .eq("description", `RTP Episode ID: ${episode.id}`)
            .single();

          // Fallback to season/episode number matching for backward compatibility
          const { data: existingEpisodeBySeason } = !existingEpisodeByRtpId ? await supabase
            .from("episodes")
            .select("id")
            .eq("show_id", showId)
            .eq("season", season)
            .eq("episode_number", episode.episodeNumber)
            .single() : { data: null };

          const existingEpisode = existingEpisodeByRtpId || existingEpisodeBySeason;

          if (existingEpisode) {
            episodeId = existingEpisode.id; // Keep as string UUID
            console.log(`Found existing episode with ID: ${episodeId}`);
          } else {
            // Create new episode - include RTP episode ID for uniqueness
            const episodeData = {
              show_id: showId,
              season: season,
              episode_number: episode.episodeNumber,
              title: episode.title,
              air_date: episode.airDate || null,
              // Store RTP episode ID for reference and uniqueness
              description: `RTP Episode ID: ${episode.id}`,
            };

            const { data: newEpisode, error: episodeError } = await supabase
              .from("episodes")
              .insert(episodeData)
              .select("id")
              .single();

            if (episodeError) {
              console.error("Error creating episode:", episodeError);
              results.push({
                episode: episode.episodeNumber,
                title: episode.title,
                status: "error",
                error: `Failed to create episode: ${episodeError.message}`,
              });
              failedCount++;
              continue;
            }

            episodeId = newEpisode.id; // Keep as string UUID
            console.log(`Created new episode with ID: ${episodeId}`);
          }
        }

        // Call phrase extraction API
        const extractionResponse = await fetch(
          `${request.nextUrl.origin}/api/extract-phrases`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({
              content: scrapedSubtitle.content,
              filename: scrapedSubtitle.filename,
              showTitle: series.title,
              episodeTitle: episode.title,
              seasonNumber: 1,
              episodeNumber: episode.episodeNumber,
              saveToDatabase,
              forceReExtraction,
              showId,
              episodeId,
            }),
          }
        );

        if (!extractionResponse.ok) {
          const errorData = await extractionResponse.json();
          results.push({
            episode: episode.episodeNumber,
            title: episode.title,
            status: "extraction_failed",
            error: errorData.error || "Unknown extraction error",
          });
          failedCount++;
          continue;
        }

        const extractionData = await extractionResponse.json();
        results.push({
          episode: episode.episodeNumber,
          title: episode.title,
          status: "success",
          extractionId: extractionData.extractionId,
          phraseCount: extractionData.phrases?.length || 0,
          phrases: extractionData.phrases,
        });

        completedCount++;

        // Add delay between episodes to be respectful to services
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(
          `Error processing episode ${episode.episodeNumber}:`,
          error
        );
        results.push({
          episode: episode.episodeNumber,
          title: episode.title,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        failedCount++;
      }
    }

    // Mark job as completed
    const finalStatus = failedCount === 0 ? 'completed' : (completedCount > 0 ? 'completed' : 'failed');
    await PhraseExtractionService.updateExtractionJob(extractionJob.id, {
      status: finalStatus,
      progress: 100,
      completed_episodes: completedCount,
      failed_episodes: failedCount,
      results: {
        series: {
          title: series.title,
          episodeCount: series.episodes.length,
        },
        results,
        summary: {
          total: results.length,
          successful: results.filter((r) => r.status === "success").length,
          failed: results.filter(
            (r) => r.status === "error" || r.status === "extraction_failed"
          ).length,
          alreadyExists: results.filter((r) => r.status === "already_exists").length,
          noSubtitle: results.filter((r) => r.status === "no_subtitle").length,
        },
      },
      completed_at: new Date().toISOString(),
    }, supabase);

    return NextResponse.json({
      jobId: extractionJob.id,
      series: {
        title: series.title,
        totalEpisodes: series.episodes.length,
        processedEpisodes: episodesToProcess.length,
        selectedEpisodes: selectedEpisodes || null,
        tvdbMatch:
          tvdbMatch.confidence > 0.6
            ? {
                name: tvdbMatch.show?.name,
                confidence: tvdbMatch.confidence,
              }
            : null,
      },
      results,
      summary: {
        total: results.length,
        successful: results.filter((r) => r.status === "success").length,
        failed: results.filter(
          (r) => r.status === "error" || r.status === "extraction_failed"
        ).length,
        alreadyExists: results.filter((r) => r.status === "already_exists")
          .length,
        noSubtitle: results.filter((r) => r.status === "no_subtitle").length,
      },
    });
  } catch (error) {
    console.error("RTP scraping error:", error);
    
    // Try to mark job as failed if it exists
    try {
      if (typeof extractionJob !== 'undefined') {
        await PhraseExtractionService.updateExtractionJob(extractionJob.id, {
          status: 'failed',
          error_message: error instanceof Error ? error.message : "Internal server error",
          completed_at: new Date().toISOString(),
        }, supabase);
      }
    } catch (jobError) {
      console.error("Failed to update job status:", jobError);
    }
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        jobId: typeof extractionJob !== 'undefined' ? extractionJob.id : undefined,
      },
      { status: 500 }
    );
  }
}
