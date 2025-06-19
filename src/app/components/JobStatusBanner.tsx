'use client';

import { useState } from 'react';
import { useExtractionJobs } from '@/hooks/useExtractionJobs';
import { useAuth } from '@/contexts/AuthContext';
import type { ExtractionJob } from '@/lib/supabase';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    case 'running': return 'bg-blue-50 border-blue-200 text-blue-800';
    case 'completed': return 'bg-green-50 border-green-200 text-green-800';
    case 'failed': return 'bg-red-50 border-red-200 text-red-800';
    case 'cancelled': return 'bg-gray-50 border-gray-200 text-gray-800';
    default: return 'bg-gray-50 border-gray-200 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return '⏳';
    case 'running': return '🔄';
    case 'completed': return '✅';
    case 'failed': return '❌';
    case 'cancelled': return '⏹️';
    default: return '❓';
  }
};

interface JobCardProps {
  job: ExtractionJob;
  onCancel: (jobId: string) => Promise<void>;
  isExpanded: boolean;
  onToggle: () => void;
}

function JobCard({ job, onCancel, isExpanded, onToggle }: JobCardProps) {
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    try {
      setCancelling(true);
      await onCancel(job.id);
    } catch (error) {
      console.error('Failed to cancel job:', error);
    } finally {
      setCancelling(false);
    }
  };

  const canCancel = ['pending', 'running'].includes(job.status);

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor(job.status)}`}>
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex items-center space-x-3">
          <span className="text-lg">{getStatusIcon(job.status)}</span>
          <div>
            <h3 className="font-medium">{job.series_title || 'Unknown Series'}</h3>
            <div className="text-sm opacity-75">
              {job.status === 'running' && job.current_episode && (
                <div>Currently: {job.current_episode}</div>
              )}
              <div>
                Progress: {job.completed_episodes}/{job.total_episodes} episodes
                {job.progress > 0 && ` (${job.progress}%)`}
              </div>
              <div>
                Status: {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {canCancel && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
              disabled={cancelling}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {cancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
          <span className="text-sm">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-current border-opacity-20">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Job Type:</strong> {job.job_type}
            </div>
            <div>
              <strong>Created:</strong> {new Date(job.created_at).toLocaleString()}
            </div>
            {job.completed_at && (
              <div>
                <strong>Completed:</strong> {new Date(job.completed_at).toLocaleString()}
              </div>
            )}
            {job.failed_episodes > 0 && (
              <div>
                <strong>Failed Episodes:</strong> {job.failed_episodes}
              </div>
            )}
          </div>

          {job.error_message && (
            <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-sm">
              <strong>Error:</strong> {job.error_message}
            </div>
          )}

          {job.results && (
            <div className="mt-2">
              <strong>Results Summary:</strong>
              <div className="grid grid-cols-4 gap-2 mt-1 text-sm">
                <div>✅ Success: {job.results.summary?.successful || 0}</div>
                <div>🔄 Existing: {job.results.summary?.alreadyExists || 0}</div>
                <div>⚠️ No Subtitle: {job.results.summary?.noSubtitle || 0}</div>
                <div>❌ Failed: {job.results.summary?.failed || 0}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function JobStatusBanner() {
  const { user } = useAuth();
  const { activeJobs, allJobs, loading, error, cancelJob } = useExtractionJobs();
  const [showAll, setShowAll] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  const toggleJobExpansion = (jobId: string) => {
    const newExpanded = new Set(expandedJobs);
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId);
    } else {
      newExpanded.add(jobId);
    }
    setExpandedJobs(newExpanded);
  };

  const jobsToShow = showAll ? allJobs : activeJobs;

  if (loading && activeJobs.length === 0) {
    return null;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="text-red-800">
          <strong>Error loading jobs:</strong> {error}
        </div>
      </div>
    );
  }

  if (activeJobs.length === 0 && !showAll) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          {showAll ? 'Extraction Jobs' : 'Active Extractions'}
          {activeJobs.length > 0 && !showAll && (
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {activeJobs.length} active
            </span>
          )}
        </h2>
        <button
          onClick={() => setShowAll(!showAll)}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          {showAll ? 'Show Active Only' : 'Show All Jobs'}
        </button>
      </div>

      <div className="space-y-3">
        {jobsToShow.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onCancel={cancelJob}
            isExpanded={expandedJobs.has(job.id)}
            onToggle={() => toggleJobExpansion(job.id)}
          />
        ))}
      </div>

      {showAll && allJobs.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No extraction jobs found.
        </div>
      )}
    </div>
  );
}