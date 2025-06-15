import { Calendar, FileText, TrendingUp } from "lucide-react";

interface EpisodeStatisticsProps {
  totalPhrases: number;
  season: number;
  episodeNumber: number;
  showName: string;
}

export const EpisodeStatistics = ({
  totalPhrases,
  season,
  episodeNumber,
  showName,
}: EpisodeStatisticsProps) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Episode Information
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Total Phrases</p>
              <p className="text-lg font-semibold text-gray-900">
                {totalPhrases}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Episode</p>
              <p className="text-lg font-semibold text-gray-900">
                S{season?.toString().padStart(2, "0")}E
                {episodeNumber?.toString().padStart(2, "0")}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Show</p>
              <p className="text-lg font-semibold text-gray-900">{showName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
