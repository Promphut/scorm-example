/* eslint-disable @typescript-eslint/no-explicit-any */
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

    // Type assertion to allow assignment of string or undefined
    (this.dataModel as any)[element] = value;
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
    // SCORM 1.2 Elements
    const scorm12Elements = [
      "cmi.core._children",
      "cmi.core.student_id",
      "cmi.core.student_name",
      "cmi.core.lesson_location",
      "cmi.core.credit",
      "cmi.core.lesson_status",
      "cmi.core.entry",
      "cmi.core.score._children",
      "cmi.core.score.raw",
      "cmi.core.score.max",
      "cmi.core.score.min",
      "cmi.core.total_time",
      "cmi.core.lesson_mode",
      "cmi.core.exit",
      "cmi.core.session_time",
      "cmi.suspend_data",
      "cmi.launch_data",
      "cmi.comments",
      "cmi.comments_from_lms",
      "cmi.objectives._children",
      "cmi.objectives._count",
      "cmi.interactions._children",
      "cmi.interactions._count",
      "cmi.student_data._children",
      "cmi.student_data.mastery_score",
      "cmi.student_data.max_time_allowed",
      "cmi.student_data.time_limit_action",
      "cmi.student_preference._children",
      "cmi.student_preference.audio",
      "cmi.student_preference.language",
      "cmi.student_preference.speed",
      "cmi.student_preference.text",
    ];

    // SCORM 2004 Elements
    const scorm2004Elements = [
      "cmi._version",
      "cmi.completion_status",
      "cmi.completion_threshold",
      "cmi.credit",
      "cmi.entry",
      "cmi.exit",
      "cmi.launch_data",
      "cmi.learner_id",
      "cmi.learner_name",
      "cmi.learner_preference._children",
      "cmi.learner_preference.audio_level",
      "cmi.learner_preference.language",
      "cmi.learner_preference.delivery_speed",
      "cmi.learner_preference.audio_captioning",
      "cmi.location",
      "cmi.max_time_allowed",
      "cmi.mode",
      "cmi.objectives._children",
      "cmi.objectives._count",
      "cmi.progress_measure",
      "cmi.scaled_passing_score",
      "cmi.score._children",
      "cmi.score.scaled",
      "cmi.score.raw",
      "cmi.score.min",
      "cmi.score.max",
      "cmi.session_time",
      "cmi.success_status",
      "cmi.suspend_data",
      "cmi.time_limit_action",
      "cmi.total_time",
      "cmi.comments_from_learner._children",
      "cmi.comments_from_learner._count",
      "cmi.comments_from_lms._children",
      "cmi.comments_from_lms._count",
      "cmi.interactions._children",
      "cmi.interactions._count",
      "adl.nav.request",
      "adl.nav.request_valid.continue",
      "adl.nav.request_valid.previous",
      "adl.nav.request_valid.choice",
      "adl.nav.request_valid.jump",
    ];

    // Check dynamic elements (objectives and interactions with indices)
    const dynamicPatterns = [
      /^cmi\.objectives\.\d+\.(id|score\._children|score\.scaled|score\.raw|score\.min|score\.max|success_status|completion_status|progress_measure|description)$/,
      /^cmi\.interactions\.\d+\.(id|type|objectives\._count|timestamp|correct_responses\._count|weighting|learner_response|result|latency|description)$/,
      /^cmi\.interactions\.\d+\.objectives\.\d+\.id$/,
      /^cmi\.interactions\.\d+\.correct_responses\.\d+\.pattern$/,
      /^cmi\.comments_from_learner\.\d+\.(comment|location|timestamp)$/,
      /^cmi\.comments_from_lms\.\d+\.(comment|location|timestamp)$/,
    ];

    const validElements =
      this.version === "1.2" ? scorm12Elements : scorm2004Elements;

    // Check static elements
    if (validElements.includes(element)) {
      return true;
    }

    // Check dynamic patterns for SCORM 2004
    if (this.version === "2004") {
      return dynamicPatterns.some((pattern) => pattern.test(element));
    }

    return false;
  }

  private isValidValue(element: string, value: string): boolean {
    // Comprehensive SCORM data validation

    // Score validation
    if (
      element.includes("score.raw") ||
      element.includes("score.max") ||
      element.includes("score.min")
    ) {
      if (value === "") return true; // Empty values are valid for optional fields
      const num = parseFloat(value);
      return !isNaN(num) && isFinite(num);
    }

    if (element.includes("score.scaled")) {
      if (value === "") return true;
      const num = parseFloat(value);
      return !isNaN(num) && isFinite(num) && num >= -1 && num <= 1;
    }

    // Status validation
    if (element === "cmi.core.lesson_status") {
      const validStatuses = [
        "passed",
        "completed",
        "failed",
        "incomplete",
        "browsed",
        "not attempted",
      ];
      return validStatuses.includes(value);
    }

    if (element === "cmi.completion_status") {
      const validStatuses = [
        "completed",
        "incomplete",
        "not attempted",
        "unknown",
      ];
      return validStatuses.includes(value);
    }

    if (element === "cmi.success_status") {
      const validStatuses = ["passed", "failed", "unknown"];
      return validStatuses.includes(value);
    }

    // Time validation (ISO 8601 duration format)
    if (element.includes("time") && value !== "") {
      // Basic time format validation - should be more comprehensive
      const timePattern =
        /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;
      return (
        timePattern.test(value) || /^\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(value)
      );
    }

    // Credit validation
    if (element === "cmi.core.credit" || element === "cmi.credit") {
      return ["credit", "no-credit"].includes(value);
    }

    // Mode validation
    if (element === "cmi.core.lesson_mode" || element === "cmi.mode") {
      return ["browse", "normal", "review"].includes(value);
    }

    // Entry validation
    if (element === "cmi.core.entry" || element === "cmi.entry") {
      return ["ab-initio", "resume", ""].includes(value);
    }

    // Exit validation
    if (element === "cmi.core.exit" || element === "cmi.exit") {
      const validExits =
        this.version === "1.2"
          ? ["time-out", "suspend", "logout", ""]
          : ["time-out", "suspend", "logout", "normal", ""];
      return validExits.includes(value);
    }

    // Progress measure validation (SCORM 2004)
    if (element === "cmi.progress_measure") {
      if (value === "") return true;
      const num = parseFloat(value);
      return !isNaN(num) && isFinite(num) && num >= 0 && num <= 1;
    }

    // Navigation request validation (SCORM 2004)
    if (element === "adl.nav.request") {
      const validRequests = [
        "continue",
        "previous",
        "choice",
        "exit",
        "exitAll",
        "abandon",
        "abandonAll",
      ];
      return validRequests.includes(value);
    }

    // Boolean validation for navigation request valid elements
    if (element.startsWith("adl.nav.request_valid.")) {
      return ["true", "false", "unknown"].includes(value);
    }

    // Interaction type validation
    if (element.includes("interactions.") && element.endsWith(".type")) {
      const validTypes = [
        "true-false",
        "choice",
        "fill-in",
        "long-fill-in",
        "matching",
        "performance",
        "sequencing",
        "likert",
        "numeric",
        "other",
      ];
      return validTypes.includes(value);
    }

    // Interaction result validation
    if (element.includes("interactions.") && element.endsWith(".result")) {
      const validResults = ["correct", "incorrect", "unanticipated", "neutral"];
      return validResults.includes(value) || /^[\d\.]+$/.test(value); // numeric result
    }

    // Audio captioning validation (SCORM 2004)
    if (element === "cmi.learner_preference.audio_captioning") {
      return ["-1", "0", "1"].includes(value);
    }

    // Time limit action validation
    if (element === "cmi.time_limit_action") {
      const validActions = [
        "exit,message",
        "exit,no message",
        "continue,message",
        "continue,no message",
      ];
      return validActions.includes(value);
    }

    // String length validation for suspend_data
    if (element === "cmi.suspend_data") {
      // SCORM 1.2: 4096 chars, SCORM 2004: 64000 chars
      const maxLength = this.version === "1.2" ? 4096 : 64000;
      return value.length <= maxLength;
    }

    // Default: allow any string value for other elements
    return typeof value === "string";
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
