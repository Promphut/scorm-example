/* eslint-disable @typescript-eslint/no-explicit-any */
// SCORM Type Definitions

export interface SCORMDataModel {
  // SCORM 1.2 Core Data Model
  "cmi.core.lesson_status"?:
    | "passed"
    | "completed"
    | "failed"
    | "incomplete"
    | "browsed"
    | "not attempted";
  "cmi.core.score.raw"?: string;
  "cmi.core.score.max"?: string;
  "cmi.core.score.min"?: string;
  "cmi.core.total_time"?: string;
  "cmi.core.session_time"?: string;
  "cmi.core.lesson_location"?: string;
  "cmi.core.entry"?: "ab-initio" | "resume" | "";
  "cmi.core.exit"?: "time-out" | "suspend" | "logout" | "";
  "cmi.core.student_id"?: string;
  "cmi.core.student_name"?: string;
  "cmi.core.credit"?: "credit" | "no-credit";
  "cmi.core.lesson_mode"?: "browse" | "normal" | "review";

  // SCORM 1.2 Additional Elements
  "cmi.suspend_data"?: string;
  "cmi.launch_data"?: string;
  "cmi.comments"?: string;
  "cmi.comments_from_lms"?: string;
  "cmi.objectives._count"?: string;
  "cmi.objectives._children"?: string;
  "cmi.interactions._count"?: string;
  "cmi.interactions._children"?: string;
  "cmi.student_data._children"?: string;
  "cmi.student_data.mastery_score"?: string;
  "cmi.student_data.max_time_allowed"?: string;
  "cmi.student_data.time_limit_action"?: string;
  "cmi.student_preference._children"?: string;
  "cmi.student_preference.audio"?: string;
  "cmi.student_preference.language"?: string;
  "cmi.student_preference.speed"?: string;
  "cmi.student_preference.text"?: string;

  // SCORM 2004 Data Model Elements
  "cmi.completion_status"?:
    | "completed"
    | "incomplete"
    | "not attempted"
    | "unknown";
  "cmi.success_status"?: "passed" | "failed" | "unknown";
  "cmi.score.scaled"?: string;
  "cmi.score.raw"?: string;
  "cmi.score.min"?: string;
  "cmi.score.max"?: string;
  "cmi.total_time"?: string;
  "cmi.session_time"?: string;
  "cmi.location"?: string;
  "cmi.entry"?: "ab-initio" | "resume" | "";
  "cmi.exit"?: "time-out" | "suspend" | "logout" | "normal" | "";
  "cmi.learner_id"?: string;
  "cmi.learner_name"?: string;
  "cmi.mode"?: "browse" | "normal" | "review";
  "cmi.credit"?: "credit" | "no-credit";
  "cmi.progress_measure"?: string;
  "cmi.max_time_allowed"?: string;
  "cmi.time_limit_action"?:
    | "exit,message"
    | "exit,no message"
    | "continue,message"
    | "continue,no message";
  "cmi.scaled_passing_score"?: string;
  "cmi.comments_from_learner._count"?: string;
  "cmi.comments_from_lms._count"?: string;
  "cmi.learner_preference._children"?: string;
  "cmi.learner_preference.audio_level"?: string;
  "cmi.learner_preference.language"?: string;
  "cmi.learner_preference.delivery_speed"?: string;
  "cmi.learner_preference.audio_captioning"?: string;

  // Navigation requests (SCORM 2004)
  "adl.nav.request"?:
    | "continue"
    | "previous"
    | "choice"
    | "exit"
    | "exitAll"
    | "abandon"
    | "abandonAll";
  "adl.nav.request_valid.continue"?: "true" | "false" | "unknown";
  "adl.nav.request_valid.previous"?: "true" | "false" | "unknown";
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
  schemaversion?: string;
  organizations: SCORMOrganization[];
  resources: SCORMResource[];
  metadata?: SCORMMetadata;
  sequencingCollection?: SCORMSequencingCollection;
}

export interface SCORMMetadata {
  schema?: string;
  schemaversion?: string;
  lom?: any;
}

export interface SCORMOrganization {
  identifier: string;
  title: string;
  structure?: string;
  objectivesGlobalToSystem?: boolean;
  items: SCORMItem[];
  sequencing?: SCORMSequencing;
}

export interface SCORMItem {
  identifier: string;
  title: string;
  identifierref?: string;
  isvisible?: boolean;
  parameters?: string;
  item?: SCORMItem[];
  sequencing?: SCORMSequencing;
  presentation?: SCORMPresentation;
  mastery_score?: number;
  max_time_allowed?: string;
  time_limit_action?: string;
}

export interface SCORMResource {
  identifier: string;
  type: string;
  href: string;
  base?: string;
  scormType?: "sco" | "asset";
  xmlBase?: string;
  files: SCORMFile[];
  dependencies?: SCORMDependency[];
}

export interface SCORMFile {
  href: string;
  metadata?: SCORMMetadata;
}

export interface SCORMDependency {
  identifierref: string;
}

// SCORM 2004 Sequencing Types
export interface SCORMSequencing {
  id?: string;
  controlMode?: SCORMControlMode;
  sequencingRules?: SCORMSequencingRules;
  limitConditions?: SCORMLimitConditions;
  auxiliaryResources?: SCORMAuxiliaryResource[];
  rollupRules?: SCORMRollupRules;
  objectives?: SCORMObjectives;
  randomizationControls?: SCORMRandomizationControls;
  deliveryControls?: SCORMDeliveryControls;
  constrainedChoiceConsiderations?: SCORMConstrainedChoiceConsiderations;
  rollupConsiderations?: SCORMRollupConsiderations;
}

export interface SCORMControlMode {
  choice?: boolean;
  choiceExit?: boolean;
  flow?: boolean;
  forwardOnly?: boolean;
  useCurrentAttemptObjectiveInfo?: boolean;
  useCurrentAttemptProgressInfo?: boolean;
}

export interface SCORMSequencingRules {
  preConditionRule?: SCORMRule[];
  exitConditionRule?: SCORMRule[];
  postConditionRule?: SCORMRule[];
}

export interface SCORMRule {
  conditionCombination: "all" | "any";
  action: string;
  ruleConditions: SCORMRuleCondition[];
}

export interface SCORMRuleCondition {
  condition: string;
  operator?: "not" | "noOp";
  measureThreshold?: number;
  referenceObjective?: string;
}

export interface SCORMLimitConditions {
  attemptLimit?: number;
  attemptAbsoluteDurationLimit?: string;
  attemptExperiencedDurationLimit?: string;
  activityAbsoluteDurationLimit?: string;
  activityExperiencedDurationLimit?: string;
  beginTimeLimit?: string;
  endTimeLimit?: string;
}

export interface SCORMAuxiliaryResource {
  id: string;
  purpose: "auxiliary" | "primaryAsset";
  resourceIdentifier: string;
}

export interface SCORMRollupRules {
  rollupRule?: SCORMRollupRule[];
}

export interface SCORMRollupRule {
  objectiveRollup?: boolean;
  measureRollup?: boolean;
  action: string;
  conditionCombination: "all" | "any";
  conditions: SCORMRuleCondition[];
}

export interface SCORMObjectives {
  primaryObjective?: SCORMObjective;
  objective?: SCORMObjective[];
}

export interface SCORMObjective {
  objectiveID?: string;
  satisfiedByMeasure?: boolean;
  minNormalizedMeasure?: number;
  mapInfo?: SCORMMapInfo[];
}

export interface SCORMMapInfo {
  targetObjectiveID: string;
  readSatisfiedStatus?: boolean;
  readNormalizedMeasure?: boolean;
  writeSatisfiedStatus?: boolean;
  writeNormalizedMeasure?: boolean;
}

export interface SCORMRandomizationControls {
  randomizationTiming?: "never" | "once" | "onEachNewAttempt";
  selectCount?: number;
  reorderChildren?: boolean;
  selectionTiming?: "never" | "once" | "onEachNewAttempt";
}

export interface SCORMDeliveryControls {
  tracked?: boolean;
  completionSetByContent?: boolean;
  objectiveSetByContent?: boolean;
}

export interface SCORMConstrainedChoiceConsiderations {
  preventActivation?: boolean;
  constrainChoice?: boolean;
}

export interface SCORMRollupConsiderations {
  requiredForSatisfied?:
    | "always"
    | "ifAttempted"
    | "ifNotSkipped"
    | "ifNotSuspended";
  requiredForNotSatisfied?:
    | "always"
    | "ifAttempted"
    | "ifNotSkipped"
    | "ifNotSuspended";
  requiredForCompleted?:
    | "always"
    | "ifAttempted"
    | "ifNotSkipped"
    | "ifNotSuspended";
  requiredForIncomplete?:
    | "always"
    | "ifAttempted"
    | "ifNotSkipped"
    | "ifNotSuspended";
  measureSatisfactionIfActive?: boolean;
}

export interface SCORMPresentation {
  navigationInterface?: SCORMNavigationInterface;
}

export interface SCORMNavigationInterface {
  hideLMSUI?: string[];
}

export interface SCORMSequencingCollection {
  sequencing?: SCORMSequencing[];
}

export interface SCORMPackage {
  manifest: SCORMManifest;
  files: Map<string, string>; // file path -> content
  baseUrl: string;
}

export type SCORMVersion = "1.2" | "2004";
