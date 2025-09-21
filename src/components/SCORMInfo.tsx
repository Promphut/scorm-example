"use client";

import React from "react";
import { SCORMPackage } from "@/types/scorm";

interface SCORMInfoProps {
  packageData: SCORMPackage;
  className?: string;
}

export default function SCORMInfo({
  packageData,
  className = "",
}: SCORMInfoProps) {
  const { manifest } = packageData;

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}
    >
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Package Information
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Basic Information
          </h4>
          <dl className="space-y-2">
            <div>
              <dt className="text-xs text-gray-500">Identifier</dt>
              <dd className="text-sm text-gray-900 font-mono">
                {manifest.identifier}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Version</dt>
              <dd className="text-sm text-gray-900">{manifest.version}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Title</dt>
              <dd className="text-sm text-gray-900">{manifest.title}</dd>
            </div>
            {manifest.description && (
              <div>
                <dt className="text-xs text-gray-500">Description</dt>
                <dd className="text-sm text-gray-900">
                  {manifest.description}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Statistics */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Package Statistics
          </h4>
          <dl className="space-y-2">
            <div>
              <dt className="text-xs text-gray-500">Organizations</dt>
              <dd className="text-sm text-gray-900">
                {manifest.organizations.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Resources</dt>
              <dd className="text-sm text-gray-900">
                {manifest.resources.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Total Files</dt>
              <dd className="text-sm text-gray-900">
                {packageData.files.size}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Total Items</dt>
              <dd className="text-sm text-gray-900">
                {manifest.organizations.reduce(
                  (total, org) => total + countItems(org.items),
                  0
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Organizations */}
      {manifest.organizations.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Organizations
          </h4>
          <div className="space-y-3">
            {manifest.organizations.map((org, index) => (
              <div
                key={org.identifier || index}
                className="border border-gray-200 rounded p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-medium text-gray-900">
                    {org.title}
                  </h5>
                  <span className="text-xs text-gray-500 font-mono">
                    {org.identifier}
                  </span>
                </div>
                {org.items.length > 0 && (
                  <div className="ml-4">
                    <ItemsTree items={org.items} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resources */}
      {manifest.resources.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Resources</h4>
          <div className="space-y-2">
            {manifest.resources.map((resource, index) => (
              <div
                key={resource.identifier || index}
                className="border border-gray-200 rounded p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-medium text-gray-900">
                    {resource.identifier}
                  </h5>
                  <span className="text-xs text-gray-500">{resource.type}</span>
                </div>
                {resource.href && (
                  <p className="text-xs text-gray-600 mb-2">
                    Entry: {resource.href}
                  </p>
                )}
                {resource.files.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      Files ({resource.files.length}):
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {resource.files.map((file, fileIndex) => (
                        <span
                          key={fileIndex}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {file.href}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ItemsTree({ items, level = 0 }: { items: any[]; level?: number }) {
  return (
    <div className="space-y-1">
      {items.map((item, index) => (
        <div key={item.identifier || index} className="ml-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-900">{item.title}</span>
            {item.identifierref && (
              <span className="text-xs text-blue-600 font-mono">
                → {item.identifierref}
              </span>
            )}
          </div>
          {item.item && item.item.length > 0 && (
            <ItemsTree items={item.item} level={level + 1} />
          )}
        </div>
      ))}
    </div>
  );
}

function countItems(items: any[]): number {
  return items.reduce((total, item) => {
    return total + 1 + (item.item ? countItems(item.item) : 0);
  }, 0);
}
