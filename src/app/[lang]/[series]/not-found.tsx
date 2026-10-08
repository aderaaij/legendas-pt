"use client";

import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";

import { useLanguage } from "@/hooks/useLanguage";

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.show.notFound.title}</h2>
          <p className="text-gray-600 mb-6">{t.show.notFound.body}</p>
          <Link
            href="/"
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.common.backToLibrary}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
