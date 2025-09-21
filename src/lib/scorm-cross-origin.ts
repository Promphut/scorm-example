/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SCORM Cross-Origin Communication Handler
 * This module handles SCORM API communication across origin boundaries
 */

export interface SCORMCrossOriginAPI {
  LMSInitialize: (param: string) => Promise<string>;
  LMSFinish: (param: string) => Promise<string>;
  LMSGetValue: (element: string) => Promise<string>;
  LMSSetValue: (element: string, value: string) => Promise<string>;
  LMSCommit: (param: string) => Promise<string>;
  LMSGetLastError: () => Promise<string>;
  LMSGetErrorString: (errorCode: string) => Promise<string>;
  LMSGetDiagnostic: (param: string) => Promise<string>;
}

export class SCORMCrossOriginHandler {
  private requestId = 0;
  private pendingRequests = new Map<string, (value: string) => void>();
  private messageHandler: ((event: MessageEvent) => void) | null = null;

  constructor() {
    this.setupMessageHandler();
  }

  private generateRequestId(): string {
    return `scorm_${Date.now()}_${++this.requestId}`;
  }

  private setupMessageHandler() {
    this.messageHandler = (event: MessageEvent) => {
      if (event.data.type === "SCORM_API_RESPONSE") {
        const { requestId, result } = event.data;
        const resolve = this.pendingRequests.get(requestId);
        if (resolve) {
          this.pendingRequests.delete(requestId);
          resolve(result);
        }
      }
    };

    window.addEventListener("message", this.messageHandler);
  }

  private makeAPICall(
    method: string,
    element = "",
    value = ""
  ): Promise<string> {
    return new Promise((resolve) => {
      const id = this.generateRequestId();

      this.pendingRequests.set(id, resolve);

      // Send request to parent
      window.parent.postMessage(
        {
          type: "SCORM_API_CALL",
          method: method,
          element: element,
          value: value,
          requestId: id,
        },
        "*"
      );

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          console.warn(`[SCORM Cross-Origin] API call timeout: ${method}`);
          resolve("false");
        }
      }, 5000);
    });
  }

  public createAPI(): SCORMCrossOriginAPI {
    return {
      LMSInitialize: (param: string) =>
        this.makeAPICall("LMSInitialize", param),
      LMSFinish: (param: string) => this.makeAPICall("LMSFinish", param),
      LMSGetValue: (element: string) =>
        this.makeAPICall("LMSGetValue", element),
      LMSSetValue: (element: string, value: string) =>
        this.makeAPICall("LMSSetValue", element, value),
      LMSCommit: (param: string) => this.makeAPICall("LMSCommit", param),
      LMSGetLastError: () => this.makeAPICall("LMSGetLastError"),
      LMSGetErrorString: (errorCode: string) =>
        this.makeAPICall("LMSGetErrorString", errorCode),
      LMSGetDiagnostic: (param: string) =>
        this.makeAPICall("LMSGetDiagnostic", param),
    };
  }

  public destroy() {
    if (this.messageHandler) {
      window.removeEventListener("message", this.messageHandler);
      this.messageHandler = null;
    }
    this.pendingRequests.clear();
  }
}

// Global setup function that SCORM content can call
export function setupCrossOriginSCORM() {
  if ((window as any).scormCrossOriginSetup) {
    return; // Already setup
  }

  console.log("[SCORM Cross-Origin] Setting up cross-origin SCORM API");

  const handler = new SCORMCrossOriginHandler();
  const api = handler.createAPI();

  // Make the API available globally with the standard SCORM interface
  const syncAPI = {
    LMSInitialize: (param: string) => {
      api.LMSInitialize(param).then((result) => {
        console.log(`[SCORM Cross-Origin] LMSInitialize result: ${result}`);
      });
      return "true"; // Return synchronously for compatibility
    },
    LMSFinish: (param: string) => {
      api.LMSFinish(param).then((result) => {
        console.log(`[SCORM Cross-Origin] LMSFinish result: ${result}`);
      });
      return "true";
    },
    LMSGetValue: (element: string) => {
      // For GetValue, we need to be more careful since content expects immediate response
      let result = "";
      api.LMSGetValue(element).then((value) => {
        result = value;
      });
      return result;
    },
    LMSSetValue: (element: string, value: string) => {
      api.LMSSetValue(element, value).then((result) => {
        console.log(`[SCORM Cross-Origin] LMSSetValue result: ${result}`);
      });
      return "true";
    },
    LMSCommit: (param: string) => {
      api.LMSCommit(param).then((result) => {
        console.log(`[SCORM Cross-Origin] LMSCommit result: ${result}`);
      });
      return "true";
    },
    LMSGetLastError: () => {
      let result = "0";
      api.LMSGetLastError().then((value) => {
        result = value;
      });
      return result;
    },
    LMSGetErrorString: (errorCode: string) => {
      let result = "";
      api.LMSGetErrorString(errorCode).then((value) => {
        result = value;
      });
      return result;
    },
    LMSGetDiagnostic: (param: string) => {
      let result = "";
      api.LMSGetDiagnostic(param).then((value) => {
        result = value;
      });
      return result;
    },
  };

  // Expose the API
  (window as any).API = syncAPI;
  (window as any).API_1484_11 = syncAPI; // SCORM 2004
  (window as any).scormAPI = syncAPI;
  (window as any).findAPI = () => syncAPI;

  (window as any).scormCrossOriginSetup = true;

  console.log("[SCORM Cross-Origin] Cross-origin SCORM API setup complete");

  return handler;
}
