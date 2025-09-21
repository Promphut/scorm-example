/**
 * SCORM API Cross-Origin Fix
 * This script provides a workaround for cross-origin SCORM API access
 * by creating a simple message-based bridge to the parent window.
 */

(function() {
    'use strict';
    
    console.log('[SCORM API Fix] Loading cross-origin SCORM API bridge');
    
    // Check if we're in a cross-origin iframe
    let isCrossOrigin = false;
    try {
        // Try to access parent window - this will throw if cross-origin
        const test = window.parent.location.href;
    } catch (e) {
        isCrossOrigin = true;
        console.log('[SCORM API Fix] Cross-origin iframe detected');
    }
    
    if (!isCrossOrigin) {
        console.log('[SCORM API Fix] Same-origin iframe, no bridge needed');
        return;
    }
    
    // Override the findAPI function used by SCORM content
    const originalFindAPI = window.findAPI;
    
    window.findAPI = function(win) {
        console.log('[SCORM API Fix] findAPI called, providing bridge API');
        
        // Return a proxy API that communicates via postMessage
        const bridgeAPI = {
            LMSInitialize: function(parameter) {
                console.log('[SCORM API Fix] LMSInitialize called');
                window.parent.postMessage({
                    type: 'SCORM_API_CALL',
                    method: 'LMSInitialize',
                    parameter: parameter
                }, '*');
                return "true";
            },
            
            LMSFinish: function(parameter) {
                console.log('[SCORM API Fix] LMSFinish called');
                window.parent.postMessage({
                    type: 'SCORM_API_CALL',
                    method: 'LMSFinish',
                    parameter: parameter
                }, '*');
                return "true";
            },
            
            LMSGetValue: function(element) {
                console.log('[SCORM API Fix] LMSGetValue called for:', element);
                window.parent.postMessage({
                    type: 'SCORM_API_CALL',
                    method: 'LMSGetValue',
                    element: element
                }, '*');
                // Return sensible defaults for common elements
                if (element === 'cmi.core.student_name') return 'Learner';
                if (element === 'cmi.core.student_id') return 'learner_001';
                if (element === 'cmi.core.lesson_status') return 'incomplete';
                if (element === 'cmi.core.score.raw') return '';
                return '';
            },
            
            LMSSetValue: function(element, value) {
                console.log('[SCORM API Fix] LMSSetValue called:', element, '=', value);
                window.parent.postMessage({
                    type: 'SCORM_API_CALL',
                    method: 'LMSSetValue',
                    element: element,
                    value: value
                }, '*');
                return "true";
            },
            
            LMSCommit: function(parameter) {
                console.log('[SCORM API Fix] LMSCommit called');
                window.parent.postMessage({
                    type: 'SCORM_API_CALL',
                    method: 'LMSCommit',
                    parameter: parameter
                }, '*');
                return "true";
            },
            
            LMSGetLastError: function() {
                return "0";
            },
            
            LMSGetErrorString: function(errorCode) {
                return "";
            },
            
            LMSGetDiagnostic: function(parameter) {
                return "";
            }
        };
        
        // Also provide SCORM 2004 methods
        bridgeAPI.Initialize = bridgeAPI.LMSInitialize;
        bridgeAPI.Terminate = bridgeAPI.LMSFinish;
        bridgeAPI.GetValue = bridgeAPI.LMSGetValue;
        bridgeAPI.SetValue = bridgeAPI.LMSSetValue;
        bridgeAPI.Commit = bridgeAPI.LMSCommit;
        bridgeAPI.GetLastError = bridgeAPI.LMSGetLastError;
        bridgeAPI.GetErrorString = bridgeAPI.LMSGetErrorString;
        bridgeAPI.GetDiagnostic = bridgeAPI.LMSGetDiagnostic;
        
        return bridgeAPI;
    };
    
    // Also make APIs available directly
    const api = window.findAPI();
    window.API = api;
    window.API_1484_11 = api;
    
    console.log('[SCORM API Fix] Cross-origin SCORM API bridge ready');
})();