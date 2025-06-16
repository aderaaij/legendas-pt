import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Show Not Found</h2>
          <p className="text-gray-600 mb-6">
            The show you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link
            href="/"
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Shows</span>
          </Link>
        </div>
      </div>
    </div>
  );
}