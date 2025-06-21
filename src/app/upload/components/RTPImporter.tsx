'use client';

import { useState } from 'react';
import RTPScraperService from '@/lib/rtp-scraper';
import { useAuth } from '@/contexts/AuthContext';
import { useExtractionJob } from '@/hooks/useExtractionJobs';
import JobStatusBanner from '@/app/components/JobStatusBanner';

interface ScrapingResult {
  episode: number;
  title: string;
  status: 'success' | 'error' | 'extraction_failed' | 'already_exists' | 'no_subtitle';
  extractionId?: number;
  phraseCount?: number;
  error?: string;
  message?: string;
}

interface ScrapingSummary {
  total: number;
  successful: number;
  failed: number;
  alreadyExists: number;
  noSubtitle: number;
}

export default function RTPImporter() {
  const { user, getAccessToken, isAdmin } = useAuth();
  const [rtpUrl, setRtpUrl] = useState('');
  const [isScrapingPreview, setIsScrapingPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveToDatabase, setSaveToDatabase] = useState(true);
  const [forceReExtraction, setForceReExtraction] = useState(false);
  const [seriesPreview, setSeriesPreview] = useState<any>(null);
  const [results, setResults] = useState<ScrapingResult[]>([]);
  const [summary, setSummary] = useState<ScrapingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<number>>(new Set());
  
  useExtractionJob(currentJobId);

  const toggleEpisodeSelection = (episodeNumber: number) => {
    const newSelected = new Set(selectedEpisodes);
    if (newSelected.has(episodeNumber)) {
      newSelected.delete(episodeNumber);
    } else {
      newSelected.add(episodeNumber);
    }
    setSelectedEpisodes(newSelected);
  };

  const selectAllEpisodes = () => {
    if (seriesPreview?.episodes) {
      const allEpisodes = new Set<number>(seriesPreview.episodes.map((ep: any) => ep.episodeNumber));
      setSelectedEpisodes(allEpisodes);
    }
  };

  const deselectAllEpisodes = () => {
    setSelectedEpisodes(new Set());
  };

  const handlePreview = async () => {
    if (!rtpUrl.trim()) {
      setError('Please enter an RTP series URL');
      return;
    }

    if (!user) {
      setError('Please log in to preview series');
      return;
    }

    const urlValidation = RTPScraperService.parseRTPUrl(rtpUrl);
    if (!urlValidation.isValid) {
      setError('Invalid RTP URL format. Please provide a series URL like: https://www.rtp.pt/play/p14147/o-americano');
      return;
    }

    setIsScrapingPreview(true);
    setError(null);
    setSeriesPreview(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Failed to get access token');
      }

      const response = await fetch('/api/preview-rtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          rtpUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to preview series');
      }

      const data = await response.json();
      setSeriesPreview(data.series);
      
      // Auto-select all episodes by default
      if (data.series?.episodes) {
        const allEpisodes = new Set<number>(data.series.episodes.map((ep: any) => ep.episodeNumber));
        setSelectedEpisodes(allEpisodes);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview series');
    } finally {
      setIsScrapingPreview(false);
    }
  };

  const handleProcess = async () => {
    if (!seriesPreview) {
      setError('Please preview the series first');
      return;
    }

    if (!user) {
      setError('Please log in to process episodes');
      return;
    }

    if (selectedEpisodes.size === 0) {
      setError('Please select at least one episode to process');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResults([]);
    setSummary(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Failed to get access token');
      }

      const response = await fetch('/api/scrape-rtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          rtpUrl,
          saveToDatabase,
          forceReExtraction,
          selectedEpisodes: Array.from(selectedEpisodes),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process series');
      }

      const data = await response.json();
      setResults(data.results);
      setSummary(data.summary);
      
      // Set the job ID for tracking
      if (data.jobId) {
        setCurrentJobId(data.jobId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process series');
      // If we got a job ID even on error, track it
      if (err instanceof Error && err.message.includes('jobId:')) {
        const jobIdMatch = err.message.match(/jobId: (\w+)/);
        if (jobIdMatch) {
          setCurrentJobId(jobIdMatch[1]);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'already_exists': return 'text-blue-600';
      case 'no_subtitle': return 'text-yellow-600';
      case 'error':
      case 'extraction_failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return 'Success';
      case 'already_exists': return 'Already Exists';
      case 'no_subtitle': return 'No Subtitle';
      case 'extraction_failed': return 'Extraction Failed';
      case 'error': return 'Error';
      default: return status;
    }
  };

  // Show authentication message if not logged in or not admin
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Authentication Required</h3>
          <p className="text-yellow-700">Please log in to use the RTP Series Importer.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Admin Access Required</h3>
          <p className="text-red-700">Only administrators can use the RTP Series Importer.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <JobStatusBanner />
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">RTP Series Importer</h2>
        <p className="text-gray-600 mb-6">
          Import Portuguese subtitles and extract phrases from RTP Play series.
          Provide a series URL to automatically process all episodes.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-800 mb-2">Background Processing</h3>
          <p className="text-blue-700 text-sm">
            Extraction jobs run in the background - you can safely navigate away from this page 
            while processing continues. Use the job status panel above to track progress and 
            return to check results later.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="rtp-url" className="block text-sm font-medium text-gray-700 mb-2">
              RTP Series URL
            </label>
            <input
              id="rtp-url"
              type="url"
              value={rtpUrl}
              onChange={(e) => setRtpUrl(e.target.value)}
              placeholder="https://www.rtp.pt/play/p14147/o-americano"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isScrapingPreview || isProcessing}
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={handlePreview}
              disabled={isScrapingPreview || isProcessing}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isScrapingPreview ? 'Loading Preview...' : 'Preview Series'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}
      </div>

      {seriesPreview && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Series Preview</h3>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <p><strong>Title:</strong> {seriesPreview.title}</p>
              <p><strong>Episodes Found:</strong> {seriesPreview.episodes.length}</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Episodes to Process:</h4>
              <div className="flex gap-2">
                <button
                  onClick={selectAllEpisodes}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  disabled={isProcessing}
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllEpisodes}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  disabled={isProcessing}
                >
                  Deselect All
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-2">
              {selectedEpisodes.size} of {seriesPreview.episodes.length} episodes selected
            </div>
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
              {seriesPreview.episodes.map((episode: any) => (
                <label key={episode.id} className="flex items-center p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEpisodes.has(episode.episodeNumber)}
                    onChange={() => toggleEpisodeSelection(episode.episodeNumber)}
                    className="mr-3 rounded"
                    disabled={isProcessing}
                  />
                  <div className="flex justify-between items-start flex-1">
                    <div>
                      <span className="font-medium">Ep. {episode.episodeNumber}</span>
                      <span className="ml-2 text-gray-600">{episode.title}</span>
                    </div>
                    <span className="text-sm text-gray-500">{episode.airDate}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={saveToDatabase}
                  onChange={(e) => setSaveToDatabase(e.target.checked)}
                  className="mr-2"
                  disabled={isProcessing}
                />
                Save to database
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={forceReExtraction}
                  onChange={(e) => setForceReExtraction(e.target.checked)}
                  className="mr-2"
                  disabled={isProcessing}
                />
                Force re-extraction (even if content exists)
              </label>
            </div>

            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing Episodes...' : 'Process All Episodes'}
            </button>
          </div>
        </div>
      )}

      {(results.length > 0 || summary) && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Processing Results</h3>
          
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{summary.total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.successful}</div>
                <div className="text-sm text-gray-600">Success</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.alreadyExists}</div>
                <div className="text-sm text-gray-600">Existing</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{summary.noSubtitle}</div>
                <div className="text-sm text-gray-600">No Subtitle</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {results.map((result, index) => (
              <div key={index} className="flex justify-between items-center p-3 border border-gray-200 rounded-md">
                <div>
                  <span className="font-medium">Ep. {result.episode}</span>
                  <span className="ml-2 text-gray-600">{result.title}</span>
                  {result.phraseCount && (
                    <span className="ml-2 text-sm text-green-600">({result.phraseCount} phrases)</span>
                  )}
                </div>
                <div className="text-right">
                  <span className={`font-medium ${getStatusColor(result.status)}`}>
                    {getStatusText(result.status)}
                  </span>
                  {result.error && (
                    <div className="text-sm text-red-600 mt-1">{result.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Processing episodes... This may take several minutes.</span>
          </div>
        </div>
      )}
    </div>
  );
}