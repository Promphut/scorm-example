"use client";

import React, { useState } from "react";
import Link from "next/link";
import SCORMPlayer from "@/components/SCORMPlayer";
import SCORMInfo from "@/components/SCORMInfo";
import ValidationDisplay from "@/components/ValidationDisplay";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SCORMVersion, SCORMPackage } from "@/types/scorm";
import { SCORMValidator, ValidationResult } from "@/lib/scorm-validator";

export default function Home() {
  const [packageUrl, setPackageUrl] = useState("");
  const [scormVersion, setScormVersion] = useState<SCORMVersion>("1.2");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [packageData, setPackageData] = useState<SCORMPackage | null>(null);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [showInfo, setShowInfo] = useState(false);

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
    setValidationResult(null);
    setPackageData(null);
    setShowInfo(false);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  };

  const handleProgress = (progress: number) => {
    console.log(`Loading progress: ${progress}%`);
  };

  const handlePackageLoaded = (data: SCORMPackage) => {
    setPackageData(data);
    const validation = SCORMValidator.validatePackage(data);
    setValidationResult(validation);
    setIsLoading(false);
  };

  const handleReset = () => {
    setPackageUrl("");
    setError(null);
    setShowPlayer(false);
    setIsLoading(false);
    setPackageData(null);
    setValidationResult(null);
    setShowInfo(false);
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
                    placeholder="https://example.com/scorm-package.zip or https://example.com/scorm-content/ or https://example.com/scorm-content/imsmanifest.xml"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 mb-2">
                      Test with sample packages:
                    </p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">
                          ZIP Packages:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              setPackageUrl("/simple-test-package.zip")
                            }
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
                          >
                            Simple Test Package
                          </button>
                          <button
                            onClick={() =>
                              setPackageUrl("/test-scorm-package.zip")
                            }
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
                          >
                            Test SCORM Package
                          </button>
                          <button
                            onClick={() =>
                              setPackageUrl("/multi-lesson-package.zip")
                            }
                            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
                          >
                            Multi-Lesson Package
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">
                          Hosted Content:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              setPackageUrl("/hosted-scorm-content/")
                            }
                            className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded"
                          >
                            Hosted Directory
                          </button>
                          <button
                            onClick={() =>
                              setPackageUrl(
                                "/hosted-scorm-content/imsmanifest.xml"
                              )
                            }
                            className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded"
                          >
                            Direct Manifest URL
                          </button>
                          <button
                            onClick={() =>
                              setPackageUrl(
                                "https://test-scorm.pages.dev/imsmanifest.xml"
                              )
                            }
                            className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded"
                          >
                            External Test Manifest
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Question Test Link */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-400 mb-2">
                        Test Components:
                      </p>
                      <Link
                        href="/questions"
                        className="inline-flex items-center text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-2 rounded-lg font-medium"
                      >
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Test Question UI
                      </Link>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Enter the URL of a SCORM package (.zip file), hosted SCORM
                    content directory, or direct manifest URL
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="scormVersion"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    SCORM Version
                  </label>
                  <select
                    id="scormVersion"
                    value={scormVersion}
                    onChange={(e) =>
                      setScormVersion(e.target.value as SCORMVersion)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="1.2">SCORM 1.2</option>
                    <option value="2004">SCORM 2004</option>
                  </select>
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

            {/* Features */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center mb-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="ml-3 text-lg font-medium text-gray-900">
                    SCORM Standards
                  </h3>
                </div>
                <p className="text-gray-600">
                  Full support for SCORM 1.2 and SCORM 2004 standards with
                  proper API implementation and manifest-based navigation.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center mb-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                  </div>
                  <h3 className="ml-3 text-lg font-medium text-gray-900">
                    Smart Navigation
                  </h3>
                </div>
                <p className="text-gray-600">
                  Intelligent navigation following SCORM manifest structure with
                  next/previous controls and progress tracking.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center mb-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-purple-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                  <h3 className="ml-3 text-lg font-medium text-gray-900">
                    Modern UI
                  </h3>
                </div>
                <p className="text-gray-600">
                  Clean, responsive interface built with Next.js and Tailwind
                  CSS.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SCORM Player */}
        {showPlayer && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">
                SCORM Content Player
              </h2>
              <div className="flex space-x-2">
                {packageData && (
                  <button
                    onClick={() => setShowInfo(!showInfo)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {showInfo ? "Hide Info" : "Show Info"}
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Load New Package
                </button>
              </div>
            </div>

            {/* Validation Results */}
            {validationResult && (
              <div className="mb-6">
                <ValidationDisplay result={validationResult} />
              </div>
            )}

            {/* Package Information */}
            {showInfo && packageData && (
              <div className="mb-6">
                <SCORMInfo packageData={packageData} />
              </div>
            )}

            <ErrorBoundary>
              <SCORMPlayer
                packageUrl={packageUrl}
                version={scormVersion}
                onError={handleError}
                onProgress={handleProgress}
                onPackageLoaded={handlePackageLoaded}
                className="w-full"
              />
            </ErrorBoundary>
          </div>
        )}
      </div>
    </div>
  );
}
