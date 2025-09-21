// SCORM API Implementation

import {
  SCORMAPI,
  SCORMDataModel,
  SCORMError,
  SCORMVersion,
} from "@/types/scorm";

export class SCORMAPIImplementation implements SCORMAPI {
  private dataModel: SCORMDataModel = {};
  private initialized = false;
  private version: SCORMVersion;
  private errorCode = "0";

  constructor(version: SCORMVersion = "1.2") {
    this.version = version;
  }

  // SCORM 1.2 API Methods
  LMSInitialize(param: string): string {
    if (this.initialized) {
      this.setError("101", "Already initialized");
      return "false";
    }

    this.initialized = true;
    this.errorCode = "0";
    return "true";
  }

  LMSFinish(param: string): string {
    if (!this.initialized) {
      this.setError("102", "Not initialized");
      return "false";
    }

    this.initialized = false;
    this.errorCode = "0";
    return "true";
  }

  LMSGetValue(element: string): string {
    if (!this.initialized) {
      this.setError("102", "Not initialized");
      return "";
    }

    const value = this.dataModel[element as keyof SCORMDataModel];
    if (value === undefined) {
      this.setError("301", "Data model element not found");
      return "";
    }

    this.errorCode = "0";
    return value;
  }

  LMSSetValue(element: string, value: string): string {
    if (!this.initialized) {
      this.setError("102", "Not initialized");
      return "false";
    }

    // Validate element name
    if (!this.isValidElement(element)) {
      this.setError("351", "Invalid data model element");
      return "false";
    }

    // Validate value
    if (!this.isValidValue(element, value)) {
      this.setError("351", "Invalid value for data model element");
      return "false";
    }

    this.dataModel[element as keyof SCORMDataModel] = value;
    this.errorCode = "0";
    return "true";
  }

  LMSCommit(param: string): string {
    if (!this.initialized) {
      this.setError("102", "Not initialized");
      return "false";
    }

    // In a real implementation, this would save data to the LMS
    this.errorCode = "0";
    return "true";
  }

  LMSGetLastError(): string {
    return this.errorCode;
  }

  LMSGetErrorString(errorCode: string): string {
    const errorStrings: Record<string, string> = {
      "0": "No Error",
      "101": "General Exception",
      "102": "Invalid argument error",
      "103": "Element cannot have children",
      "104": "Element not an array - cannot have count",
      "201": "Not initialized",
      "202": "Not implemented error",
      "203": "Invalid set value, element is a keyword",
      "301": "Data model element value not initialized",
      "351": "Data model element is read only",
      "391": "Data model element is write only",
      "401": "Data model element not implemented",
    };
    return errorStrings[errorCode] || "Unknown error";
  }

  LMSGetDiagnostic(errorCode: string): string {
    return this.LMSGetErrorString(errorCode);
  }

  // SCORM 2004 API Methods
  Initialize(param: string): string {
    return this.LMSInitialize(param);
  }

  Terminate(param: string): string {
    return this.LMSFinish(param);
  }

  GetValue(element: string): string {
    return this.LMSGetValue(element);
  }

  SetValue(element: string, value: string): string {
    return this.LMSSetValue(element, value);
  }

  Commit(param: string): string {
    return this.LMSCommit(param);
  }

  GetLastError(): string {
    return this.LMSGetLastError();
  }

  GetErrorString(errorCode: string): string {
    return this.LMSGetErrorString(errorCode);
  }

  GetDiagnostic(errorCode: string): string {
    return this.LMSGetDiagnostic(errorCode);
  }

  // Helper methods
  private setError(code: string, message: string): void {
    this.errorCode = code;
    console.error(`SCORM Error ${code}: ${message}`);
  }

  private isValidElement(element: string): boolean {
    const validElements = [
      "cmi.core.lesson_status",
      "cmi.core.score.raw",
      "cmi.core.score.max",
      "cmi.core.score.min",
      "cmi.core.total_time",
      "cmi.core.session_time",
      "cmi.core.lesson_location",
      "cmi.core.entry",
      "cmi.core.exit",
      "cmi.core.student_id",
      "cmi.core.student_name",
      "cmi.core.credit",
      "cmi.core.lesson_mode",
      "cmi.suspend_data",
      "cmi.launch_data",
      "cmi.comments",
      "cmi.comments_from_lms",
      "cmi.completion_status",
      "cmi.success_status",
      "cmi.score.scaled",
      "cmi.total_time",
      "cmi.session_time",
      "cmi.location",
      "cmi.entry",
      "cmi.exit",
      "cmi.learner_id",
      "cmi.learner_name",
      "cmi.credit",
      "cmi.mode",
    ];
    return validElements.includes(element);
  }

  private isValidValue(element: string, value: string): boolean {
    // Basic validation - in a real implementation, this would be more comprehensive
    if (element.includes("score") && value !== "") {
      const num = parseFloat(value);
      return !isNaN(num) && isFinite(num);
    }
    return true;
  }

  // Public methods for external access
  public getDataModel(): SCORMDataModel {
    return { ...this.dataModel };
  }

  public setDataModel(data: Partial<SCORMDataModel>): void {
    this.dataModel = { ...this.dataModel, ...data };
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public getVersion(): SCORMVersion {
    return this.version;
  }
}

// API Discovery Function
export function findSCORMAPI(window: Window): SCORMAPI | null {
  // Look for API in current window
  if ((window as any).API) {
    return (window as any).API;
  }
  if ((window as any).API_1484_11) {
    return (window as any).API_1484_11;
  }

  // Look in parent windows
  if (window.parent && window.parent !== window) {
    const parentAPI = findSCORMAPI(window.parent);
    if (parentAPI) return parentAPI;
  }

  // Look in opener window
  if (window.opener) {
    const openerAPI = findSCORMAPI(window.opener);
    if (openerAPI) return openerAPI;
  }

  return null;
}

// Global API setup
export function setupSCORMAPI(
  version: SCORMVersion = "1.2"
): SCORMAPIImplementation {
  const api = new SCORMAPIImplementation(version);

  if (typeof window !== "undefined") {
    if (version === "1.2") {
      (window as any).API = api;
    } else {
      (window as any).API_1484_11 = api;
    }
  }

  return api;
}
