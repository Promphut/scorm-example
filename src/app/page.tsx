"use client";

import React, { useState } from "react";
import Link from "next/link";
import SCORMViewer from "@/components/SCORMViewer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SCORMValidator } from "@/lib/scorm-validator";

export default function Home() {
  const [packageUrl, setPackageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  const handleLoadPackage = () => {
    if (!packageUrl.trim()) {
      setError("Please enter a valid SCORM package URL");
      return;
    }

    // Validate URL first
    const urlValidation = SCORMValidator.validateURL(packageUrl);
    if (!urlValidation.isValid) {
      setError(urlValidation.errors.join(", "));
      return;
    }

    setError(null);
    setIsLoading(true);
    setShowPlayer(true);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  };

  const handleProgress = (progress: number) => {
    console.log(`Loading progress: ${progress}%`);
  };

  const handleCompletion = (status: string, score?: number) => {
    console.log(`Course completed: ${status}`, score ? `Score: ${score}` : "");
  };

  const handleReset = () => {
    setPackageUrl("");
    setError(null);
    setShowPlayer(false);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            SCORM Content Reader
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Load and display SCORM packages from URLs or hosted content
            directories. Supports both SCORM 1.2 and SCORM 2004 standards with
            intelligent navigation.
          </p>
        </div>

        {/* URL Input Form */}
        {!showPlayer && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Load SCORM Package
              </h2>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="packageUrl"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    SCORM Package URL
                  </label>
                  <input
                    type="url"
                    id="packageUrl"
                    value={packageUrl}
                    onChange={(e) => setPackageUrl(e.target.value)}
                    placeholder="https://example.com/scorm-content/imsmanifest.xml"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Enter the URL of imsmanifest.xml file
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-red-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={handleLoadPackage}
                    disabled={isLoading || !packageUrl.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {isLoading ? "Loading..." : "Load Package"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SCORM Viewer */}
        {showPlayer && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">
                SCORM Content Viewer
              </h2>
              <button
                onClick={handleReset}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Load New Package
              </button>
            </div>

            <ErrorBoundary>
              <SCORMViewer
                packageUrl={packageUrl}
                onError={handleError}
                onProgress={handleProgress}
                onCompletion={handleCompletion}
                className="w-full"
              />
            </ErrorBoundary>
          </div>
        )}
      </div>
    </div>
  );
}
