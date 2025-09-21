/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { SCORMPackage, SCORMVersion, SCORMItem } from "@/types/scorm";
import { SCORMParser } from "@/lib/scorm-parser";
import { setupSCORMAPI, SCORMAPIImplementation } from "@/lib/scorm-api";

interface SCORMPlayerProps {
  packageUrl: string;
  version?: SCORMVersion;
  onError?: (error: string) => void;
  onProgress?: (progress: number) => void;
  onPackageLoaded?: (packageData: SCORMPackage) => void;
  className?: string;
}

export default function SCORMPlayer({
  packageUrl,
  version = "1.2",
  onError,
  onProgress,
  onPackageLoaded,
  className = "",
}: SCORMPlayerProps) {
  const [packageData, setPackageData] = useState<SCORMPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Navigation state
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [navigationItems, setNavigationItems] = useState<SCORMItem[]>([]);
  const [canGoNext, setCanGoNext] = useState(false);
  const [canGoPrevious, setCanGoPrevious] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const parserRef = useRef<SCORMParser>(new SCORMParser());
  const apiRef = useRef<SCORMAPIImplementation | null>(null);

  // Use refs to store callback props to avoid dependency issues
  const onErrorRef = useRef(onError);
  const onProgressRef = useRef(onProgress);
  const onPackageLoadedRef = useRef(onPackageLoaded);

  // Update refs when props change
  useEffect(() => {
    onErrorRef.current = onError;
    onProgressRef.current = onProgress;
    onPackageLoadedRef.current = onPackageLoaded;
  }, [onError, onProgress, onPackageLoaded]);

  // Build navigation items from manifest organizations
  const buildNavigationItems = useCallback(
    (packageData: SCORMPackage): SCORMItem[] => {
      const items: SCORMItem[] = [];

      console.log(
        "[buildNavigationItems] Processing organizations:",
        packageData.manifest.organizations
      );

      for (const org of packageData.manifest.organizations) {
        console.log(
          "[buildNavigationItems] Processing organization:",
          org.title,
          "with items:",
          org.items
        );

        const flattenItems = (itemList: SCORMItem[], depth = 0): void => {
          for (const item of itemList) {
            console.log(
              `[buildNavigationItems] ${"  ".repeat(depth)}Item: "${
                item.title
              }" (identifierref: ${item.identifierref})`
            );

            if (item.identifierref) {
              // Only add items that have a resource reference
              items.push(item);
              console.log(
                `[buildNavigationItems] ${"  ".repeat(
                  depth
                )}Added to navigation: "${item.title}"`
              );
            }
            if (item.item) {
              flattenItems(item.item, depth + 1);
            }
          }
        };
        flattenItems(org.items);
      }

      console.log(
        "[buildNavigationItems] Final navigation items:",
        items.map((item) => ({
          title: item.title,
          identifierref: item.identifierref,
        }))
      );

      // If we only have one item but multiple resources, create navigation items for each resource
      if (items.length <= 1 && packageData.manifest.resources.length > 1) {
        console.log(
          "[buildNavigationItems] Single item detected, but multiple resources available. Creating navigation from resources."
        );

        const resourceItems: SCORMItem[] = packageData.manifest.resources.map(
          (resource, index) => ({
            identifier: `resource_${index}`,
            title: resource.href || `Resource ${index + 1}`,
            identifierref: resource.identifier,
            item: undefined,
          })
        );

        console.log(
          "[buildNavigationItems] Created resource-based navigation:",
          resourceItems.map((item) => ({
            title: item.title,
            identifierref: item.identifierref,
          }))
        );

        return resourceItems;
      }

      return items;
    },
    []
  );

  // Load content for a specific item
  const loadItemContent = useCallback(
    (item: SCORMItem) => {
      console.log(
        `[loadItemContent] Loading item: "${item.title}" (identifierref: ${item.identifierref})`
      );

      if (!packageData) {
        console.log("[loadItemContent] No package data available");
        return;
      }

      try {
        const parser = parserRef.current;
        const resource = parser.findResourceByIdentifier(
          item.identifierref!,
          packageData
        );

        console.log(`[loadItemContent] Found resource:`, resource);

        if (resource && resource.files.length > 0) {
          const filePath = resource.files[0].href;
          const url = parser.getResourceUrl(packageData, filePath);

          console.log(`[loadItemContent] Loading URL: ${url}`);
          console.log(`[loadItemContent] File path: ${filePath}`);
          console.log(`[loadItemContent] Base URL: ${packageData.baseUrl}`);

          // For hosted content, we use direct server URLs
          // No need to load content locally
          setCurrentUrl(url); // Use direct server URL

          console.log(`[SCORMPlayer] Loading hosted content from: ${url}`);
        } else {
          const errorMsg = `Resource not found for item: ${item.title} (identifierref: ${item.identifierref})`;
          console.error(`[loadItemContent] ${errorMsg}`);
          console.log(
            `[loadItemContent] Available resources:`,
            packageData.manifest.resources.map((r) => ({
              identifier: r.identifier,
              href: r.href,
              files: r.files.length,
            }))
          );
          throw new Error(errorMsg);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load item content";
        console.error(`[loadItemContent] Error:`, err);
        setError(errorMessage);
        onErrorRef.current?.(errorMessage);
      }
    },
    [packageData] // Remove onError from dependencies
  );

  // Navigation handlers
  const handleNext = useCallback(() => {
    console.log("[handleNext] Current state:", {
      canGoNext,
      currentItemIndex,
      totalItems: navigationItems.length,
      navigationItems: navigationItems.map((item) => item.title),
    });

    if (canGoNext && currentItemIndex < navigationItems.length - 1) {
      const nextIndex = currentItemIndex + 1;
      const nextItem = navigationItems[nextIndex];
      console.log(
        `[handleNext] Moving to item ${nextIndex + 1}: "${nextItem.title}"`
      );

      setCurrentItemIndex(nextIndex);
      loadItemContent(nextItem);
    } else {
      console.log("[handleNext] Cannot go next - at end or no items");
    }
  }, [canGoNext, currentItemIndex, navigationItems, loadItemContent]);

  const handlePrevious = useCallback(() => {
    console.log("[handlePrevious] Current state:", {
      canGoPrevious,
      currentItemIndex,
      totalItems: navigationItems.length,
      navigationItems: navigationItems.map((item) => item.title),
    });

    if (canGoPrevious && currentItemIndex > 0) {
      const prevIndex = currentItemIndex - 1;
      const prevItem = navigationItems[prevIndex];
      console.log(
        `[handlePrevious] Moving to item ${prevIndex + 1}: "${prevItem.title}"`
      );

      setCurrentItemIndex(prevIndex);
      loadItemContent(prevItem);
    } else {
      console.log("[handlePrevious] Cannot go previous - at start or no items");
    }
  }, [canGoPrevious, currentItemIndex, navigationItems, loadItemContent]);

  // Update navigation state
  useEffect(() => {
    const newCanGoNext = currentItemIndex < navigationItems.length - 1;
    const newCanGoPrevious = currentItemIndex > 0;

    console.log("[Navigation State Update]", {
      currentItemIndex,
      totalItems: navigationItems.length,
      canGoNext: newCanGoNext,
      canGoPrevious: newCanGoPrevious,
      currentItem: navigationItems[currentItemIndex]?.title,
    });

    setCanGoNext(newCanGoNext);
    setCanGoPrevious(newCanGoPrevious);
  }, [currentItemIndex, navigationItems.length, navigationItems]);

  const loadEntryPoint = useCallback(() => {
    if (!packageData) return;

    try {
      // Build navigation items from manifest
      const items = buildNavigationItems(packageData);
      setNavigationItems(items);

      if (items.length > 0) {
        // Load the first item
        setCurrentItemIndex(0);
        loadItemContent(items[0]);
      } else {
        // Fallback to original entry point logic
        const parser = parserRef.current;
        const entryPoint = parser.getEntryPoint(packageData);

        if (entryPoint) {
          const url = parser.getResourceUrl(packageData, entryPoint);
          setCurrentUrl(url);
        } else {
          throw new Error("No entry point found in SCORM package");
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load entry point";
      setError(errorMessage);
      onErrorRef.current?.(errorMessage);
    }
  }, [packageData, buildNavigationItems, loadItemContent]); // Remove onError from dependencies

  const initializeSCORM = useCallback(() => {
    try {
      // Setup SCORM API
      apiRef.current = setupSCORMAPI(version);

      // Always make SCORM API available on parent window for cross-origin content
      if (version === "1.2") {
        (window as unknown as Window & { API: SCORMAPIImplementation }).API =
          apiRef.current;
        // Also make it available on window.parent for iframe access
        ((window.parent as any) || window).API = apiRef.current;
      } else {
        (
          window as unknown as Window & { API_1484_11: SCORMAPIImplementation }
        ).API_1484_11 = apiRef.current;
        // Also make it available on window.parent for iframe access
        ((window.parent as any) || window).API_1484_11 = apiRef.current;
      }

      // Make API available in multiple common locations
      (window as any).scormAPI = apiRef.current;
      (window as any).SCORM_API = apiRef.current;

      // Add a global API finder function that SCORM content can use
      (window as any).findAPI = function (win: Window = window): any {
        let api = null;
        const apiNames =
          version === "1.2"
            ? ["API", "scormAPI", "SCORM_API"]
            : ["API_1484_11", "scormAPI", "SCORM_API"];

        // Look for API in current window
        for (const apiName of apiNames) {
          if ((win as any)[apiName]) {
            api = (win as any)[apiName];
            console.log(`[findAPI] Found SCORM API at ${apiName}`);
            break;
          }
        }

        // If not found and we have a parent, look there
        if (!api && win.parent && win.parent !== win) {
          try {
            api = (window as any).findAPI(win.parent);
          } catch (error) {
            console.log("[findAPI] Cannot access parent window:", error);
          }
        }

        return api;
      };

      // Also add the API finder to the global scope for cross-origin access
      (window as any).GetAPI = (window as any).findAPI;
      (window as any).getAPI = (window as any).findAPI;

      // Create a proxy API that can be easily accessed
      (window as any).SCORMProxy = {
        API: apiRef.current,
        version: version,
        initialized: true,
        findAPI: (window as any).findAPI,
        LMSInitialize:
          version === "1.2"
            ? apiRef.current.LMSInitialize.bind(apiRef.current)
            : undefined,
        Initialize:
          version === "2004"
            ? apiRef.current.Initialize.bind(apiRef.current)
            : undefined,
        LMSGetValue:
          version === "1.2"
            ? apiRef.current.LMSGetValue.bind(apiRef.current)
            : undefined,
        GetValue:
          version === "2004"
            ? apiRef.current.GetValue.bind(apiRef.current)
            : undefined,
        LMSSetValue:
          version === "1.2"
            ? apiRef.current.LMSSetValue.bind(apiRef.current)
            : undefined,
        SetValue:
          version === "2004"
            ? apiRef.current.SetValue.bind(apiRef.current)
            : undefined,
        LMSCommit:
          version === "1.2"
            ? apiRef.current.LMSCommit.bind(apiRef.current)
            : undefined,
        Commit:
          version === "2004"
            ? apiRef.current.Commit.bind(apiRef.current)
            : undefined,
        LMSFinish:
          version === "1.2"
            ? apiRef.current.LMSFinish.bind(apiRef.current)
            : undefined,
        Terminate:
          version === "2004"
            ? apiRef.current.Terminate.bind(apiRef.current)
            : undefined,
        LMSGetLastError:
          version === "1.2"
            ? apiRef.current.LMSGetLastError.bind(apiRef.current)
            : undefined,
        GetLastError:
          version === "2004"
            ? apiRef.current.GetLastError.bind(apiRef.current)
            : undefined,
      };

      console.log(
        "[SCORMPlayer] SCORM API made available in multiple locations:",
        {
          windowAPI: version === "1.2" ? "window.API" : "window.API_1484_11",
          parentAPI: version === "1.2" ? "parent.API" : "parent.API_1484_11",
          scormAPI: "window.scormAPI",
          SCORM_API: "window.SCORM_API",
          findAPI: "window.findAPI()",
        }
      );

      // Initialize the API
      const initResult =
        version === "1.2"
          ? apiRef.current.LMSInitialize("")
          : apiRef.current.Initialize("");

      if (initResult === "true") {
        setIsInitialized(true);
        loadEntryPoint();
        onProgressRef.current?.(100);
        console.log(
          "[SCORMPlayer] SCORM API initialized and available globally"
        );
      } else {
        throw new Error("Failed to initialize SCORM API");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to initialize SCORM";
      setError(errorMessage);
      onErrorRef.current?.(errorMessage);
    }
  }, [version, loadEntryPoint]); // Remove callback dependencies

  // Reset state and load package when packageUrl changes
  useEffect(() => {
    const loadPackage = async () => {
      // Reset state
      setPackageData(null);
      setError(null);
      setCurrentUrl("");
      setIsInitialized(false);
      setCurrentItemIndex(0);
      setNavigationItems([]);
      setCanGoNext(false);
      setCanGoPrevious(false);

      // Skip if already loading (prevent race conditions)
      // Note: We don't add 'loading' to dependencies to avoid infinite loops

      setLoading(true);
      setError(null);

      try {
        const parser = parserRef.current;
        const data = await parser.loadFromUrl(
          packageUrl,
          onProgressRef.current
        );
        setPackageData(data);
        onPackageLoadedRef.current?.(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load SCORM package";
        setError(errorMessage);
        onErrorRef.current?.(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadPackage();
  }, [packageUrl]); // Only depend on packageUrl

  useEffect(() => {
    if (packageData && !isInitialized) {
      // Initialize SCORM API before content loads
      initializeSCORM();
    }
  }, [packageData, isInitialized, initializeSCORM]);

  // Ensure API is available as soon as possible
  useEffect(() => {
    if (apiRef.current && !isInitialized) {
      // Make API available immediately for early access
      if (version === "1.2") {
        (window as any).API = apiRef.current;
        ((window.parent as any) || window).API = apiRef.current;
      } else {
        (window as any).API_1484_11 = apiRef.current;
        ((window.parent as any) || window).API_1484_11 = apiRef.current;
      }
    }
  }, [version, isInitialized]);

  // Cleanup effect for cross-origin message listeners
  useEffect(() => {
    return () => {
      // Cleanup any event listeners when component unmounts
      // This will be handled by the setupCrossOriginSCORM function if needed
    };
  }, []);

  const handleIframeLoad = () => {
    if (
      iframeRef.current &&
      iframeRef.current.contentWindow &&
      apiRef.current
    ) {
      try {
        // Check if we can access the iframe (same-origin)
        const iframeWindow = iframeRef.current.contentWindow;

        // Try to access a property to test same-origin policy
        const testAccess = iframeWindow.location.href;
        console.log("[SCORMPlayer] Same-origin access confirmed:", testAccess);

        // If we get here, it's same-origin, so we can inject the API directly
        if (version === "1.2") {
          (
            iframeWindow as unknown as Window & { API: SCORMAPIImplementation }
          ).API = apiRef.current;
        } else {
          (
            iframeWindow as unknown as Window & {
              API_1484_11: SCORMAPIImplementation;
            }
          ).API_1484_11 = apiRef.current;
        }

        console.log(
          "[SCORMPlayer] SCORM API injected successfully (same-origin)"
        );

        // Also inject API finder function for same-origin content
        (iframeWindow as any).findAPI = function (win: Window): any {
          let api = null;
          const apiNames = version === "1.2" ? ["API"] : ["API_1484_11"];

          for (const apiName of apiNames) {
            if (win[apiName as keyof Window]) {
              api = win[apiName as keyof Window];
              break;
            }
          }

          if (!api && win.parent && win.parent !== win) {
            api = (iframeWindow as any).findAPI(win.parent);
          }

          return api;
        };
      } catch (crossOriginError) {
        // Cross-origin iframe - cannot inject API directly
        console.log(
          "[SCORMPlayer] Cross-origin content detected, using postMessage API"
        );
        console.log("[SCORMPlayer] Cross-origin error:", crossOriginError);
        setupCrossOriginSCORM();

        // Also send immediate API availability notification
        setTimeout(() => {
          if (iframeRef.current?.contentWindow) {
            try {
              const immediateMessage = {
                type: "SCORM_API_READY",
                version: version,
                api: apiRef.current,
              };
              iframeRef.current.contentWindow.postMessage(
                immediateMessage,
                "*"
              );
              console.log("[SCORMPlayer] Sent immediate API ready message");
            } catch (error) {
              console.log(
                "[SCORMPlayer] Could not send immediate message:",
                error
              );
            }
          }
        }, 100); // Send quickly after iframe loads
      }
    }
  };

  const setupCrossOriginSCORM = () => {
    // For cross-origin content, the SCORM API is already available on parent window
    console.log("[SCORMPlayer] Cross-origin SCORM content detected");
    console.log(
      "[SCORMPlayer] SCORM API is available on parent window (window.API or window.API_1484_11)"
    );
    console.log(
      "[SCORMPlayer] SCORM content can use: parent.API, parent.findAPI(), or postMessage"
    );

    // Try to communicate with the iframe about API availability
    // Add a small delay to ensure iframe is fully loaded
    setTimeout(() => {
      if (iframeRef.current?.contentWindow) {
        try {
          // Send a message to the iframe about API availability
          const message = {
            type: "SCORM_API_AVAILABLE",
            version: version,
            apiLocation:
              version === "1.2" ? "parent.API" : "parent.API_1484_11",
            findAPILocation: "parent.findAPI",
          };
          iframeRef.current.contentWindow.postMessage(message, "*");
          console.log(
            "[SCORMPlayer] Sent API availability message to iframe:",
            message
          );
        } catch (error) {
          console.log("[SCORMPlayer] Could not send message to iframe:", error);
        }
      }
    }, 1000); // Wait 1 second for iframe to be ready

    // The SCORM content should look for the API on parent.window or window.parent
    // This is a common pattern for cross-origin SCORM content

    // Listen for all messages from iframe for debugging and API calls
    const handleMessage = (event: MessageEvent) => {
      console.log("[SCORMPlayer] Received message from iframe:", event.data);

      if (event.source === iframeRef.current?.contentWindow && apiRef.current) {
        // Handle SCORM API calls via postMessage if the content requests it
        if (event.data.type === "SCORM_API_CALL") {
          const { method, args, id } = event.data;
          try {
            const result = (apiRef.current as any)[method](...args);
            event.source?.postMessage(
              {
                type: "SCORM_API_RESPONSE",
                id,
                result,
              },
              event.origin
            );
            console.log(
              `[SCORMPlayer] Handled API call: ${method} -> ${result}`
            );
          } catch (error) {
            event.source?.postMessage(
              {
                type: "SCORM_API_RESPONSE",
                id,
                error: error instanceof Error ? error.message : String(error),
              },
              event.origin
            );
            console.log(`[SCORMPlayer] API call error: ${method} ->`, error);
          }
        }

        // Handle API discovery requests
        if (event.data.type === "SCORM_API_REQUEST") {
          event.source?.postMessage(
            {
              type: "SCORM_API_RESPONSE",
              api: {
                version: version,
                available: true,
                location:
                  version === "1.2" ? "parent.API" : "parent.API_1484_11",
              },
            },
            event.origin
          );
          console.log("[SCORMPlayer] Responded to API request");
        }
      }
    };

    window.addEventListener("message", handleMessage);

    // Return cleanup function
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  };

  const handleFinish = () => {
    if (apiRef.current && isInitialized) {
      const finishResult =
        version === "1.2"
          ? apiRef.current.LMSFinish("")
          : apiRef.current.Terminate("");

      if (finishResult === "true") {
        setIsInitialized(false);
        console.log("SCORM session finished successfully");
      }
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SCORM content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`p-6 bg-red-50 border border-red-200 rounded-lg ${className}`}
      >
        <div className="flex items-center">
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
              Error Loading SCORM Content
            </h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={() => {
              // Simple retry by reloading the page
              window.location.reload();
            }}
            className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!packageData) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <p className="text-gray-600">No SCORM content loaded</p>
      </div>
    );
  }

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {packageData.manifest.title}
            </h3>
            {packageData.manifest.description && (
              <p className="text-sm text-gray-600 mt-1">
                {packageData.manifest.description}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              SCORM {version}
            </span>
            {isInitialized && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Initialized
              </span>
            )}
          </div>
        </div>
      </div>

      {/* API Debug Info */}
      {isInitialized && (
        <div className="bg-blue-50 px-4 py-2 border-b border-blue-200 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-blue-700">
              SCORM API Status: Active (
              {version === "1.2" ? "window.API" : "window.API_1484_11"})
            </span>
            <button
              onClick={() => {
                console.log("=== SCORM API DEBUG INFO ===");
                console.log("API Reference:", apiRef.current);
                console.log(
                  "Window API:",
                  (window as any).API || (window as any).API_1484_11
                );
                console.log("FindAPI Function:", (window as any).findAPI);
                console.log("GetAPI Function:", (window as any).GetAPI);
                console.log("SCORMProxy:", (window as any).SCORMProxy);
                console.log(
                  "Parent API:",
                  ((window.parent as any) || {}).API ||
                    ((window.parent as any) || {}).API_1484_11
                );

                if (iframeRef.current) {
                  console.log("Iframe URL:", iframeRef.current.src);
                  console.log("Iframe Element:", iframeRef.current);
                  try {
                    console.log(
                      "Iframe Access:",
                      iframeRef.current.contentWindow?.location.href
                    );
                    console.log(
                      "Iframe Window:",
                      iframeRef.current.contentWindow
                    );
                  } catch (error) {
                    console.log(
                      "Iframe Access: Cross-origin (expected)",
                      error
                    );
                  }

                  // Try to send a test message
                  try {
                    iframeRef.current.contentWindow?.postMessage(
                      {
                        type: "DEBUG_TEST",
                        timestamp: Date.now(),
                      },
                      "*"
                    );
                    console.log("Test message sent to iframe");
                  } catch (error) {
                    console.log("Could not send test message:", error);
                  }
                }

                // Test API functionality
                if (apiRef.current) {
                  try {
                    const testResult =
                      version === "1.2"
                        ? apiRef.current.LMSInitialize("")
                        : apiRef.current.Initialize("");
                    console.log("API Test Result:", testResult);
                  } catch (error) {
                    console.log("API Test Error:", error);
                  }
                }
                console.log("=== END DEBUG INFO ===");
              }}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Debug API
            </button>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="relative">
        {currentUrl ? (
          <iframe
            ref={iframeRef}
            src={currentUrl}
            className="w-full h-[600px] border-0"
            onLoad={handleIframeLoad}
            title="SCORM Content"
            allow="autoplay; camera; microphone; geolocation; fullscreen"
          />
        ) : (
          <div className="p-8 text-center text-gray-600">
            <p>No content to display</p>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {navigationItems.length > 0 && (
              <span>
                Item {currentItemIndex + 1} of {navigationItems.length}
                {navigationItems[currentItemIndex] && (
                  <span className="ml-2 text-gray-500">
                    - {navigationItems[currentItemIndex].title}
                  </span>
                )}
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handlePrevious}
              disabled={!canGoPrevious}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={!canGoNext}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              Next
              <svg
                className="w-4 h-4 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
            <button
              onClick={handleFinish}
              disabled={!isInitialized}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Finish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
