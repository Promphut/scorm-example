"use client";

import React, { useState } from "react";
import { SCORMParser } from "@/lib/scorm-parser";
import { SCORMPackage } from "@/types/scorm";

interface SCORMLoaderProps {
  onPackageLoaded?: (packageData: SCORMPackage) => void;
  onError?: (error: string) => void;
  className?: string;
}

export default function SCORMLoader({
  onPackageLoaded,
  onError,
  className = "",
}: SCORMLoaderProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleLoadPackage = async () => {
    if (!url.trim()) {
      const errorMsg = "Please enter a valid SCORM package URL";
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Use the static method for easy loading
      const packageData = await SCORMParser.openFromUrl(url, (progress) => {
        setProgress(progress);
      });

      onPackageLoaded?.(packageData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load SCORM package";
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setUrl("");
    setError(null);
    setProgress(0);
    setLoading(false);
  };

  return (
    <div className={`bg-white shadow-lg rounded-lg p-6 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Load SCORM Package from URL
      </h2>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="scormUrl"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            SCORM Package URL
          </label>
          <input
            type="url"
            id="scormUrl"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/scorm-package.zip"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
          <p className="mt-1 text-sm text-gray-500">
            Enter the URL of a SCORM package (.zip file)
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

        {loading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Loading SCORM package...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              {/* eslint-disable-next-line react/forbid-dom-props */}
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={handleLoadPackage}
            disabled={loading || !url.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {loading ? "Loading..." : "Load Package"}
          </button>

          <button
            onClick={handleReset}
            disabled={loading}
            className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Features:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Validates URL format and file type</li>
          <li>• Progress tracking during download</li>
          <li>• Automatic SCORM package parsing</li>
          <li>• Error handling and validation</li>
          <li>• Support for both SCORM 1.2 and 2004</li>
        </ul>
      </div>
    </div>
  );
}
