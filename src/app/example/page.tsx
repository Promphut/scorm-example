"use client";

import React, { useState } from "react";
import SCORMLoader from "@/components/SCORMLoader";
import SCORMInfo from "@/components/SCORMInfo";
import { SCORMPackage } from "@/types/scorm";

export default function ExamplePage() {
  const [packageData, setPackageData] = useState<SCORMPackage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePackageLoaded = (data: SCORMPackage) => {
    setPackageData(data);
    setError(null);
    console.log("SCORM package loaded successfully:", data);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setPackageData(null);
    console.error("Error loading SCORM package:", errorMessage);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            SCORM Package Loader Example
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            This example demonstrates how to load and parse SCORM packages from
            URLs. The package is automatically unzipped and parsed to extract
            the manifest and content.
          </p>
        </div>

        {/* SCORM Loader */}
        <div className="mb-8">
          <SCORMLoader
            onPackageLoaded={handlePackageLoaded}
            onError={handleError}
          />
        </div>

        {/* Package Information */}
        {packageData && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Package Information
            </h2>
            <SCORMInfo packageData={packageData} />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
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
                  <h3 className="text-sm font-medium text-red-800">
                    Error Loading Package
                  </h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Usage Examples */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Usage Examples
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Basic Usage
              </h3>
              <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto text-sm">
                <code>{`import { SCORMParser } from '@/lib/scorm-parser';

// Load SCORM package from URL
const packageData = await SCORMParser.openFromUrl(
  'https://example.com/scorm-package.zip'
);

console.log('Package title:', packageData.manifest.title);
console.log('Number of files:', packageData.files.size);`}</code>
              </pre>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                With Progress Tracking
              </h3>
              <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto text-sm">
                <code>{`import { SCORMParser } from '@/lib/scorm-parser';

// Load with progress callback
const packageData = await SCORMParser.openFromUrl(
  'https://example.com/scorm-package.zip',
  (progress) => {
    console.log(\`Loading progress: \${progress}%\`);
  }
);`}</code>
              </pre>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Instance Method
              </h3>
              <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto text-sm">
                <code>{`import { SCORMParser } from '@/lib/scorm-parser';

// Using instance method
const parser = new SCORMParser();
const packageData = await parser.loadFromUrl(
  'https://example.com/scorm-package.zip',
  (progress) => console.log(\`Progress: \${progress}%\`)
);

// Get entry point
const entryPoint = parser.getEntryPoint(packageData);
const content = parser.getResourceContent(packageData, entryPoint);`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
