// SCORM Type Definitions

export interface SCORMDataModel {
  // SCORM 1.2 Data Model
  "cmi.core.lesson_status"?: string;
  "cmi.core.score.raw"?: string;
  "cmi.core.score.max"?: string;
  "cmi.core.score.min"?: string;
  "cmi.core.total_time"?: string;
  "cmi.core.session_time"?: string;
  "cmi.core.lesson_location"?: string;
  "cmi.core.entry"?: string;
  "cmi.core.exit"?: string;
  "cmi.core.student_id"?: string;
  "cmi.core.student_name"?: string;
  "cmi.core.credit"?: string;
  "cmi.core.lesson_mode"?: string;
  "cmi.suspend_data"?: string;
  "cmi.launch_data"?: string;
  "cmi.comments"?: string;
  "cmi.comments_from_lms"?: string;
  "cmi.objectives._count"?: string;
  "cmi.interactions._count"?: string;

  // SCORM 2004 Data Model
  "cmi.completion_status"?: string;
  "cmi.success_status"?: string;
  "cmi.score.scaled"?: string;
  "cmi.total_time"?: string;
  "cmi.location"?: string;
  "cmi.learner_id"?: string;
  "cmi.learner_name"?: string;
  "cmi.mode"?: string;
}

export interface SCORMError {
  errorCode: string;
  errorString: string;
  diagnostic: string;
}

export interface SCORMAPI {
  // SCORM 1.2 API
  LMSInitialize?(param: string): string;
  LMSFinish?(param: string): string;
  LMSGetValue?(element: string): string;
  LMSSetValue?(element: string, value: string): string;
  LMSCommit?(param: string): string;
  LMSGetLastError?(): string;
  LMSGetErrorString?(errorCode: string): string;
  LMSGetDiagnostic?(errorCode: string): string;

  // SCORM 2004 API
  Initialize?(param: string): string;
  Terminate?(param: string): string;
  GetValue?(element: string): string;
  SetValue?(element: string, value: string): string;
  Commit?(param: string): string;
  GetLastError?(): string;
  GetErrorString?(errorCode: string): string;
  GetDiagnostic?(errorCode: string): string;
}

export interface SCORMManifest {
  identifier: string;
  version: string;
  title: string;
  description?: string;
  organizations: SCORMOrganization[];
  resources: SCORMResource[];
  metadata?: any;
}

export interface SCORMOrganization {
  identifier: string;
  title: string;
  items: SCORMItem[];
}

export interface SCORMItem {
  identifier: string;
  title: string;
  identifierref?: string;
  item?: SCORMItem[];
}

export interface SCORMResource {
  identifier: string;
  type: string;
  href: string;
  base?: string;
  files: SCORMFile[];
}

export interface SCORMFile {
  href: string;
}

export interface SCORMPackage {
  manifest: SCORMManifest;
  files: Map<string, string>; // file path -> content
  baseUrl: string;
}

export type SCORMVersion = "1.2" | "2004";
