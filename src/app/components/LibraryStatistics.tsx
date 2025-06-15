interface LibraryStatisticsProps {
  stats: {
    totalShows: number;
    totalExtractions: number;
    totalPhrases: number;
  };
}

export const LibraryStatistics = ({ stats }: LibraryStatisticsProps) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Library Statistics
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600 mb-1">
            {stats.totalShows}
          </div>
          <div className="text-gray-600">Shows</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600 mb-1">
            {stats.totalExtractions}
          </div>
          <div className="text-gray-600">Extractions</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600 mb-1">
            {stats.totalPhrases}
          </div>
          <div className="text-gray-600">Total Phrases</div>
        </div>
      </div>
    </div>
  );
};
