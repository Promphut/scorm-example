/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { SCORMPackage, SCORMVersion } from "@/types/scorm";
import { SCORMParser } from "@/lib/scorm-parser";
import { setupSCORMAPI, SCORMAPIImplementation } from "@/lib/scorm-api";
import { SCORMSequencingEngine } from "@/lib/scorm-sequencing-correct";

interface SCORMViewerProps {
  packageUrl: string;
  onError?: (error: string) => void;
  onProgress?: (progress: number) => void;
  onCompletion?: (status: string, score?: number) => void;
  className?: string;
}

interface InteractionData {
  id: string;
  type: string;
  description: string;
  learnerResponse: string;
  result: string;
  timestamp: string;
}

interface LearnerData {
  name: string;
  id: string;
  score: {
    raw?: number;
    max?: number;
    min?: number;
  };
  status: string;
  location: string;
  totalTime: string;
  sessionTime: string;
  interactions: InteractionData[];
  objectives: Array<{
    id: string;
    status: string;
    score?: number;
  }>;
}

export default function SCORMViewer({
  packageUrl,
  onError,
  onProgress,
  onCompletion,
  className = "",
}: SCORMViewerProps) {
  const [packageData, setPackageData] = useState<SCORMPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [learnerData, setLearnerData] = useState<LearnerData>({
    name: "Learner",
    id: "learner_001",
    score: {},
    status: "not attempted",
    location: "",
    totalTime: "00:00:00",
    sessionTime: "00:00:00",
    interactions: [],
    objectives: [],
  });
  const [sessionStartTime] = useState(Date.now());

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const parserRef = useRef<SCORMParser>(new SCORMParser());
  const apiRef = useRef<SCORMAPIImplementation | null>(null);
  const sequencingEngineRef = useRef<SCORMSequencingEngine | null>(null);
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);

  // Enhanced SCORM API with interaction tracking
  const setupEnhancedSCORMAPI = useCallback((version: SCORMVersion = "1.2") => {
    const api = setupSCORMAPI(version);
    
    // Override SetValue to track interactions and progress
    const originalSetValue = api.LMSSetValue.bind(api);
    api.LMSSetValue = (element: string, value: string): string => {
      console.log(`[SCORM API] SetValue: ${element} = ${value}`);
      
      // Track interactions
      if (element.startsWith("cmi.interactions.")) {
        handleInteractionUpdate(element, value);
      }
      
      // Track learner progress
      if (element === "cmi.core.lesson_status") {
        setLearnerData(prev => ({ ...prev, status: value }));
        if (value === "completed" || value === "passed" || value === "failed") {
          const score = api.LMSGetValue("cmi.core.score.raw");
          onCompletion?.(value, score ? parseFloat(score) : undefined);
        }
      }
      
      if (element === "cmi.core.score.raw") {
        setLearnerData(prev => ({
          ...prev,
          score: { ...prev.score, raw: parseFloat(value) }
        }));
      }
      
      if (element === "cmi.core.lesson_location") {
        setLearnerData(prev => ({ ...prev, location: value }));
      }
      
      return originalSetValue(element, value);
    };

    // Override GetValue to provide learner data
    const originalGetValue = api.LMSGetValue.bind(api);
    api.LMSGetValue = (element: string): string => {
      console.log(`[SCORM API] GetValue: ${element}`);
      
      // Provide learner identification
      if (element === "cmi.core.student_name") {
        return learnerData.name;
      }
      if (element === "cmi.core.student_id") {
        return learnerData.id;
      }
      
      // Calculate session time
      if (element === "cmi.core.session_time") {
        const sessionDuration = Date.now() - sessionStartTime;
        return formatSCORMTime(sessionDuration);
      }
      
      return originalGetValue(element);
    };

    return api;
  }, [learnerData, sessionStartTime, onCompletion]);

  const handleInteractionUpdate = (element: string, value: string) => {
    const parts = element.split(".");
    if (parts.length >= 4) {
      const interactionIndex = parseInt(parts[2]);
      const property = parts.slice(3).join(".");
      
      setLearnerData(prev => {
        const interactions = [...prev.interactions];
        
        // Ensure interaction exists
        while (interactions.length <= interactionIndex) {
          interactions.push({
            id: `interaction_${interactions.length}`,
            type: "choice",
            description: "",
            learnerResponse: "",
            result: "",
            timestamp: new Date().toISOString(),
          });
        }
        
        // Update specific property
        const interaction = interactions[interactionIndex];
        switch (property) {
          case "id":
            interaction.id = value;
            break;
          case "type":
            interaction.type = value;
            break;
          case "student_response":
          case "learner_response":
            interaction.learnerResponse = value;
            break;
          case "result":
            interaction.result = value;
            break;
          case "timestamp":
            interaction.timestamp = value;
            break;
        }
        
        return { ...prev, interactions };
      });
    }
  };

  const formatSCORMTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const setupCrossOriginAPI = useCallback(() => {
    if (!apiRef.current) return;

    // Remove any existing message handler
    if (messageHandlerRef.current) {
      window.removeEventListener('message', messageHandlerRef.current);
    }

    // Create new message handler
    const messageHandler = (event: MessageEvent) => {
      // Accept messages from iframe origin or known SCORM domains
      const iframeSrc = iframeRef.current?.src || '';
      const isValidOrigin = iframeSrc.startsWith(event.origin) || 
                           event.origin.includes('test-scorm') ||
                           event.origin.includes('scorm.com') ||
                           event.origin === window.location.origin;
      
      if (!isValidOrigin) {
        return;
      }

      const { type, method, element, value, parameter, requestId } = event.data;

      if (type === 'SCORM_API_CALL' && apiRef.current) {
        console.log(`[SCORMViewer] Cross-origin API call: ${method}(${element}, ${value})`);
        
        let result;
        try {
          switch (method) {
            case 'Initialize':
            case 'LMSInitialize':
              result = apiRef.current.LMSInitialize(parameter || element || "");
              break;
            case 'Terminate':
            case 'LMSFinish':
              result = apiRef.current.LMSFinish(parameter || element || "");
              break;
            case 'GetValue':
            case 'LMSGetValue':
              result = apiRef.current.LMSGetValue(element || "");
              break;
            case 'SetValue':
            case 'LMSSetValue':
              result = apiRef.current.LMSSetValue(element || "", value || "");
              break;
            case 'Commit':
            case 'LMSCommit':
              result = apiRef.current.LMSCommit(parameter || element || "");
              break;
            case 'GetLastError':
            case 'LMSGetLastError':
              result = apiRef.current.LMSGetLastError();
              break;
            case 'GetErrorString':
            case 'LMSGetErrorString':
              result = apiRef.current.LMSGetErrorString(element || "");
              break;
            case 'GetDiagnostic':
            case 'LMSGetDiagnostic':
              result = apiRef.current.LMSGetDiagnostic(parameter || element || "");
              break;
            default:
              result = "false";
              console.warn(`[SCORMViewer] Unknown API method: ${method}`);
          }
        } catch (error) {
          console.error(`[SCORMViewer] API call error:`, error);
          result = "false";
        }

        // Send response back to iframe
        if (iframeRef.current?.contentWindow) {
          try {
            iframeRef.current.contentWindow.postMessage({
              type: 'SCORM_API_RESPONSE',
              requestId,
              result
            }, event.origin);
          } catch (postError) {
            console.error(`[SCORMViewer] Failed to send API response:`, postError);
          }
        }
      }
    };

    messageHandlerRef.current = messageHandler;
    window.addEventListener('message', messageHandler);

    // Notify iframe that API is ready
    if (iframeRef.current?.contentWindow) {
      const version = packageData?.manifest.schemaversion?.includes("2004") ? "2004" : "1.2";
      setTimeout(() => {
        if (iframeRef.current?.contentWindow) {
          try {
            iframeRef.current.contentWindow.postMessage({
              type: "SCORM_API_READY",
              version,
            }, "*");
            console.log("[SCORMViewer] Sent SCORM_API_READY message");
          } catch (msgError) {
            console.log("[SCORMViewer] Could not send API ready message:", msgError);
          }
        }
      }, 100);
    }
  }, [packageData]);

  const injectAPIBridge = useCallback(() => {
    if (!iframeRef.current?.contentWindow) return;

    // Create script injection message
    const bridgeScript = `
      (function() {
        // Check if already loaded
        if (window.scormBridgeLoaded) return;
        window.scormBridgeLoaded = true;
        
        // Load the SCORM API bridge script
        const script = document.createElement('script');
        script.src = '${window.location.origin}/scorm-api-bridge.js';
        script.onload = function() {
          console.log('[SCORM Viewer] API bridge script loaded');
        };
        script.onerror = function() {
          console.error('[SCORM Viewer] Failed to load API bridge script');
        };
        document.head.appendChild(script);
      })();
    `;

    // Try to inject via postMessage (for compatible content)
    if (iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage({
          type: 'INJECT_SCRIPT',
          script: bridgeScript
        }, '*');
        console.log('[SCORMViewer] Sent script injection message');
      } catch (error) {
        console.log('[SCORMViewer] Could not send script injection message:', error);
      }
    }
  }, []);

  const loadPackage = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`[SCORMViewer] Loading package from: ${packageUrl}`);
      
      const parser = parserRef.current;
      const data = await parser.loadFromUrl(packageUrl, onProgress);
      
      console.log("[SCORMViewer] Package loaded:", data);
      setPackageData(data);
      
      // Initialize sequencing engine for SCORM 2004
      if (data.manifest.schemaversion?.includes("2004")) {
        sequencingEngineRef.current = new SCORMSequencingEngine(data.manifest);
      }
      
      // Find entry point
      const entryPoint = parser.getEntryPoint(data);
      if (entryPoint) {
        const url = parser.getResourceUrl(data, entryPoint);
        console.log(`[SCORMViewer] Entry point URL: ${url}`);
        setCurrentUrl(url);
      } else {
        // For hosted content, try the first resource
        if (data.manifest.resources.length > 0) {
          const firstResource = data.manifest.resources[0];
          const url = parser.getResourceUrl(data, firstResource.href);
          console.log(`[SCORMViewer] Using first resource URL: ${url}`);
          setCurrentUrl(url);
        } else {
          throw new Error("No resources found in SCORM package");
        }
      }
      
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : "Failed to load SCORM package";
      
      // Provide more helpful error messages
      if (errorMessage.includes("Failed to fetch")) {
        errorMessage = `Unable to load SCORM package from URL. Please check:\n• The URL is correct and accessible\n• The server allows cross-origin requests (CORS)\n• The file exists at the specified location\n\nOriginal error: ${errorMessage}`;
      } else if (errorMessage.includes("not a valid zip file")) {
        errorMessage = `The URL does not point to a valid SCORM package. Please ensure:\n• The URL points to a .zip file containing a SCORM package\n• Or the URL points to a directory with an imsmanifest.xml file\n\nOriginal error: ${errorMessage}`;
      } else if (errorMessage.includes("imsmanifest.xml not found")) {
        errorMessage = `No SCORM manifest found. Please ensure:\n• For zip files: the package contains an imsmanifest.xml file\n• For hosted content: the directory contains an imsmanifest.xml file\n\nOriginal error: ${errorMessage}`;
      }
      
      console.error("[SCORMViewer] Error:", err);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [packageUrl, onProgress, onError]);

  const initializeSCORM = useCallback(() => {
    if (!packageData) return;
    
    try {
      console.log("[SCORMViewer] Initializing SCORM API");
      
      // Determine SCORM version
      const version = packageData.manifest.schemaversion?.includes("2004") ? "2004" : "1.2";
      
      // Setup enhanced API
      const api = setupEnhancedSCORMAPI(version);
      apiRef.current = api;
      
      // Make API globally available
      if (version === "1.2") {
        (window as any).API = api;
        ((window.parent as any) || window).API = api;
      } else {
        (window as any).API_1484_11 = api;
        ((window.parent as any) || window).API_1484_11 = api;
      }
      
      // Add debugging utilities
      (window as any).scormAPI = api;
      (window as any).SCORM_API = api;
      (window as any).findAPI = () => api;
      
      // For cross-origin support, also make API available for iframe traversal
      (window as any).getAPI = () => api;
      (window as any).getAPI_1484_11 = () => api;
      
      // Initialize the session
      const initResult = version === "1.2" ? 
        api.LMSInitialize("") : 
        api.Initialize("");
        
      if (initResult === "true") {
        setIsInitialized(true);
        console.log("[SCORMViewer] SCORM API initialized successfully");
        
        // Set initial learner data
        api.LMSSetValue("cmi.core.student_name", learnerData.name);
        api.LMSSetValue("cmi.core.student_id", learnerData.id);
        api.LMSSetValue("cmi.core.lesson_status", "incomplete");
        api.LMSCommit("");
      } else {
        throw new Error("Failed to initialize SCORM API");
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to initialize SCORM";
      console.error("[SCORMViewer] SCORM Init Error:", err);
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [packageData, setupEnhancedSCORMAPI, learnerData, onError]);

  const handleIframeLoad = useCallback(() => {
    console.log("[SCORMViewer] Iframe loaded");
    
    if (iframeRef.current && iframeRef.current.contentWindow && apiRef.current) {
      try {
        // Try to inject API directly (same-origin)
        const iframeWindow = iframeRef.current.contentWindow;
        const testAccess = iframeWindow.location.href;
        
        console.log("[SCORMViewer] Same-origin access confirmed");
        
        // Inject API into iframe
        const version = packageData?.manifest.schemaversion?.includes("2004") ? "2004" : "1.2";
        if (version === "1.2") {
          (iframeWindow as any).API = apiRef.current;
        } else {
          (iframeWindow as any).API_1484_11 = apiRef.current;
        }
        
        (iframeWindow as any).scormAPI = apiRef.current;
        (iframeWindow as any).findAPI = () => apiRef.current;
        
        console.log("[SCORMViewer] API injected into iframe");
        
      } catch (crossOriginError) {
        console.log("[SCORMViewer] Cross-origin content detected, setting up postMessage communication");
        
        // Setup cross-origin API bridge using postMessage
        setupCrossOriginAPI();
        
        // Inject SCORM API bridge script for cross-origin communication
        injectAPIBridge();
      }
    }
  }, [packageData]);

  const handleFinish = useCallback(() => {
    if (apiRef.current && isInitialized) {
      const version = packageData?.manifest.schemaversion?.includes("2004") ? "2004" : "1.2";
      const finishResult = version === "1.2" ? 
        apiRef.current.LMSFinish("") : 
        apiRef.current.Terminate("");
        
      if (finishResult === "true") {
        setIsInitialized(false);
        console.log("[SCORMViewer] SCORM session finished");
      }
    }
  }, [isInitialized, packageData]);

  // Load package on mount or URL change
  useEffect(() => {
    if (packageUrl) {
      loadPackage();
    }
  }, [packageUrl, loadPackage]);

  // Initialize SCORM when package is loaded
  useEffect(() => {
    if (packageData && !isInitialized) {
      initializeSCORM();
    }
  }, [packageData, isInitialized, initializeSCORM]);

  // Cleanup message listener on unmount
  useEffect(() => {
    return () => {
      if (messageHandlerRef.current) {
        window.removeEventListener('message', messageHandlerRef.current);
      }
    };
  }, []);

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
      <div className={`p-6 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">Error Loading SCORM Content</h3>
            <div className="mt-1 text-sm text-red-700 whitespace-pre-line">{error}</div>
            <div className="mt-4">
              <button
                onClick={loadPackage}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!packageData || !currentUrl) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <p className="text-gray-600">No SCORM content to display</p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
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
              SCORM {packageData.manifest.schemaversion?.includes("2004") ? "2004" : "1.2"}
            </span>
            {isInitialized && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {learnerData.status}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Learner Progress */}
      {isInitialized && (
        <div className="bg-blue-50 px-4 py-2 border-b border-blue-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-blue-700">
                Learner: {learnerData.name} ({learnerData.id})
              </span>
              {learnerData.score.raw !== undefined && (
                <span className="text-blue-700">
                  Score: {learnerData.score.raw}
                  {learnerData.score.max && `/${learnerData.score.max}`}
                </span>
              )}
              <span className="text-blue-700">
                Time: {formatSCORMTime(Date.now() - sessionStartTime)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {learnerData.interactions.length > 0 && (
                <span className="text-blue-600">
                  Interactions: {learnerData.interactions.length}
                </span>
              )}
              <button
                onClick={handleFinish}
                disabled={!isInitialized}
                className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs font-medium disabled:opacity-50"
              >
                Finish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="relative">
        <iframe
          ref={iframeRef}
          src={currentUrl}
          className="w-full h-[600px] border-0"
          onLoad={handleIframeLoad}
          onError={(e) => {
            console.error("[SCORMViewer] Iframe failed to load:", e);
            setError(`Failed to load SCORM content from: ${currentUrl}`);
          }}
          title="SCORM Content"
          allow="autoplay; camera; microphone; geolocation; fullscreen"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-downloads allow-top-navigation"
        />
      </div>

      {/* Debug Panel */}
      {process.env.NODE_ENV === "development" && learnerData.interactions.length > 0 && (
        <div className="bg-gray-50 border-t border-gray-200 p-4">
          <details className="text-xs">
            <summary className="cursor-pointer font-medium text-gray-700 mb-2">
              Debug: Recent Interactions ({learnerData.interactions.length})
            </summary>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {learnerData.interactions.slice(-5).map((interaction, index) => (
                <div key={index} className="bg-white p-2 rounded border text-xs">
                  <div><strong>ID:</strong> {interaction.id}</div>
                  <div><strong>Type:</strong> {interaction.type}</div>
                  <div><strong>Response:</strong> {interaction.learnerResponse}</div>
                  <div><strong>Result:</strong> {interaction.result}</div>
                  <div><strong>Time:</strong> {new Date(interaction.timestamp).toLocaleTimeString()}</div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}