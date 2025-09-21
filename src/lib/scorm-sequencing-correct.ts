/* eslint-disable @typescript-eslint/no-explicit-any */
// SCORM 2004 Sequencing Engine - Correct Implementation
// Based on SCORM 2004 4th Edition Specification

import {
  SCORMItem,
  SCORMSequencing,
  SCORMControlMode,
  SCORMSequencingRules,
  SCORMRule,
  SCORMRuleCondition,
  SCORMLimitConditions,
  SCORMManifest,
  SCORMOrganization,
} from "@/types/scorm";

// SCORM Activity Tree Node
export interface Activity {
  identifier: string;
  item: SCORMItem;
  parent?: Activity;
  children: Activity[];
  isLeaf: boolean;
  isRoot: boolean;
  depth: number;
  // Activity State
  activityStateInformation: ActivityStateInformation;
  // Sequencing Information
  sequencingDefinition: SCORMSequencing | null;
}

// Activity State Information (as per SCORM specification)
export interface ActivityStateInformation {
  // Attempt State
  activityIsActive: boolean;
  activityIsSuspended: boolean;
  
  // Activity Progress Information
  activityProgressStatus: boolean; // true if progress is known
  activityCompletionStatus: boolean;
  activityAbsoluteDuration: number;
  activityExperiencedDuration: number;
  
  // Attempt Progress Information  
  attemptProgressStatus: boolean;
  attemptCompletionStatus: boolean;
  attemptAbsoluteDuration: number;
  attemptExperiencedDuration: number;
  attemptCompletionAmount: number;
  
  // Objective Information
  objectives: Map<string, ObjectiveState>;
  
  // Attempt State
  suspendedActivity?: Activity;
}

export interface ObjectiveState {
  objectiveProgressStatus: boolean;
  objectiveSatisfiedStatus: boolean;
  objectiveMeasureStatus: boolean;
  objectiveNormalizedMeasure: number;
}

export interface SequencingSession {
  activityTree: Activity;
  currentActivity?: Activity;
  sequencingSession: Map<string, any>;
  globalObjectives: Map<string, ObjectiveState>;
}

export class SCORMSequencingEngine {
  private manifest: SCORMManifest;
  private session: SequencingSession;
  private endSession: boolean = false;

  constructor(manifest: SCORMManifest) {
    this.manifest = manifest;
    this.session = {
      activityTree: this.buildActivityTree(),
      sequencingSession: new Map(),
      globalObjectives: new Map(),
    };
  }

  // Build Activity Tree according to SCORM specification
  private buildActivityTree(): Activity {
    if (this.manifest.organizations.length === 0) {
      throw new Error("No organizations found in manifest");
    }

    const org = this.manifest.organizations[0];
    const rootActivity = this.createActivity(org.identifier, null, true, 0);
    rootActivity.children = this.buildActivityChildren(org.items, rootActivity, 1);
    
    return rootActivity;
  }

  private buildActivityChildren(items: SCORMItem[], parent: Activity, depth: number): Activity[] {
    const children: Activity[] = [];
    
    for (const item of items) {
      const activity = this.createActivity(item.identifier, parent, !item.item || item.item.length === 0, depth);
      activity.item = item;
      activity.sequencingDefinition = item.sequencing || null;
      
      if (item.item && item.item.length > 0) {
        activity.children = this.buildActivityChildren(item.item, activity, depth + 1);
      }
      
      children.push(activity);
    }
    
    return children;
  }

  private createActivity(identifier: string, parent: Activity | null, isLeaf: boolean, depth: number): Activity {
    return {
      identifier,
      item: {} as SCORMItem, // Will be set later
      parent: parent || undefined,
      children: [],
      isLeaf,
      isRoot: parent === null,
      depth,
      activityStateInformation: this.initializeActivityState(),
      sequencingDefinition: null,
    };
  }

  private initializeActivityState(): ActivityStateInformation {
    return {
      activityIsActive: false,
      activityIsSuspended: false,
      activityProgressStatus: false,
      activityCompletionStatus: false,
      activityAbsoluteDuration: 0,
      activityExperiencedDuration: 0,
      attemptProgressStatus: false,
      attemptCompletionStatus: false,
      attemptAbsoluteDuration: 0,
      attemptExperiencedDuration: 0,
      attemptCompletionAmount: 0,
      objectives: new Map(),
    };
  }

  // Overall Sequencing Process [OP.1]
  public overallSequencingProcess(navigationRequest: string, targetActivityId?: string): Activity | null {
    console.log(`[OP.1] Overall Sequencing Process - Request: ${navigationRequest}`);
    
    this.endSession = false;
    let deliveryRequest: Activity | null = null;

    // Step 1: Process Navigation Request
    const navigationValid = this.navigationRequestProcess(navigationRequest, targetActivityId);
    
    if (!navigationValid.valid) {
      console.log(`[OP.1] Navigation request invalid: ${navigationValid.exception}`);
      return null;
    }

    // Step 2: Process Termination if needed  
    if (this.session.currentActivity) {
      this.terminationRequestProcess();
    }

    // Step 3: Process Sequencing Request
    const sequencingResult = this.sequencingRequestProcess(navigationRequest, targetActivityId);
    
    if (sequencingResult.valid && sequencingResult.activity) {
      // Step 4: Process Delivery Request
      deliveryRequest = this.deliveryRequestProcess(sequencingResult.activity);
    }

    return deliveryRequest;
  }

  // Navigation Request Process [NB.2.1]  
  private navigationRequestProcess(request: string, targetId?: string): { valid: boolean; exception?: string } {
    console.log(`[NB.2.1] Navigation Request Process - ${request}`);
    
    // Validate request type
    const validRequests = ["start", "resumeAll", "continue", "previous", "choice", "exit", "exitAll", "abandon", "abandonAll"];
    if (!validRequests.includes(request)) {
      return { valid: false, exception: "Invalid navigation request" };
    }

    // Check if session has ended
    if (this.endSession) {
      return { valid: false, exception: "Sequencing session has ended" };
    }

    // Validate specific request conditions
    switch (request) {
      case "start":
        if (this.session.currentActivity) {
          return { valid: false, exception: "Sequencing session already active" };
        }
        break;
        
      case "resumeAll":
        if (this.session.currentActivity) {
          return { valid: false, exception: "Sequencing session already active" };
        }
        break;
        
      case "continue":
      case "previous":
      case "exit":
      case "abandon":
        if (!this.session.currentActivity) {
          return { valid: false, exception: "No current activity" };
        }
        break;
        
      case "choice":
        if (!targetId) {
          return { valid: false, exception: "Choice requires target activity" };
        }
        const targetActivity = this.findActivity(targetId);
        if (!targetActivity) {
          return { valid: false, exception: "Target activity not found" };
        }
        if (!this.isChoiceValid(targetActivity)) {
          return { valid: false, exception: "Choice not valid for target activity" };
        }
        break;
    }

    return { valid: true };
  }

  // Termination Request Process [TB.2.3]
  private terminationRequestProcess(): void {
    console.log("[TB.2.3] Termination Request Process");
    
    if (!this.session.currentActivity) {
      return;
    }

    // Mark current activity as not active
    this.session.currentActivity.activityStateInformation.activityIsActive = false;
    
    // Run sequencing rules and rollup
    this.sequencingRulesCheckProcess(this.session.currentActivity, "exit");
    this.rollupProcess(this.session.currentActivity);
  }

  // Sequencing Request Process [SB.2.12]
  private sequencingRequestProcess(request: string, targetId?: string): { valid: boolean; activity?: Activity; exception?: string } {
    console.log(`[SB.2.12] Sequencing Request Process - ${request}`);
    
    let identifiedActivity: Activity | null = null;

    switch (request) {
      case "start":
        identifiedActivity = this.startSequencingRequestProcess();
        break;
        
      case "resumeAll":
        identifiedActivity = this.resumeAllSequencingRequestProcess();
        break;
        
      case "continue":
        identifiedActivity = this.continueSequencingRequestProcess();
        break;
        
      case "previous":
        identifiedActivity = this.previousSequencingRequestProcess();
        break;
        
      case "choice":
        if (targetId) {
          identifiedActivity = this.choiceSequencingRequestProcess(targetId);
        }
        break;
        
      case "exit":
        identifiedActivity = this.exitSequencingRequestProcess();
        break;
        
      case "exitAll":
        this.endSession = true;
        return { valid: true };
        
      case "abandon":
        identifiedActivity = this.continueSequencingRequestProcess();
        break;
        
      case "abandonAll":
        this.endSession = true;
        return { valid: true };
    }

    if (identifiedActivity) {
      return { valid: true, activity: identifiedActivity };
    } else {
      this.endSession = true;
      return { valid: false, exception: "No activity identified" };
    }
  }

  // Start Sequencing Request Process [SB.2.5]
  private startSequencingRequestProcess(): Activity | null {
    console.log("[SB.2.5] Start Sequencing Request Process");
    
    const rootActivity = this.session.activityTree;
    
    // Check if the root activity allows choice
    if (!this.isChoiceValid(rootActivity)) {
      return null;
    }

    // Flow into the activity tree
    return this.flowSubprocess(rootActivity, true);
  }

  // Resume All Sequencing Request Process  
  private resumeAllSequencingRequestProcess(): Activity | null {
    console.log("[SB] Resume All Sequencing Request Process");
    
    // Look for suspended activity
    const suspendedActivity = this.findSuspendedActivity(this.session.activityTree);
    if (suspendedActivity) {
      return suspendedActivity;
    }

    // If no suspended activity, treat as start
    return this.startSequencingRequestProcess();
  }

  // Continue Sequencing Request Process [SB.2.7]
  private continueSequencingRequestProcess(): Activity | null {
    console.log("[SB.2.7] Continue Sequencing Request Process");
    
    if (!this.session.currentActivity) {
      return null;
    }

    // Check if continue is allowed by control mode
    if (!this.isContinueAllowed(this.session.currentActivity)) {
      return null;
    }

    // Flow from current activity
    return this.flowSubprocess(this.session.currentActivity, false);
  }

  // Previous Sequencing Request Process
  private previousSequencingRequestProcess(): Activity | null {
    console.log("[SB] Previous Sequencing Request Process");
    
    if (!this.session.currentActivity) {
      return null;
    }

    // Check if previous is allowed by control mode
    if (!this.isPreviousAllowed(this.session.currentActivity)) {
      return null;
    }

    // Flow backwards from current activity
    return this.flowSubprocess(this.session.currentActivity, false, true);
  }

  // Choice Sequencing Request Process
  private choiceSequencingRequestProcess(targetId: string): Activity | null {
    console.log(`[SB] Choice Sequencing Request Process - Target: ${targetId}`);
    
    const targetActivity = this.findActivity(targetId);
    if (!targetActivity) {
      return null;
    }

    if (!this.isChoiceValid(targetActivity)) {
      return null;
    }

    return this.flowSubprocess(targetActivity, true);
  }

  // Exit Sequencing Request Process
  private exitSequencingRequestProcess(): Activity | null {
    console.log("[SB] Exit Sequencing Request Process");
    
    if (!this.session.currentActivity) {
      return null;
    }

    const parent = this.session.currentActivity.parent;
    if (!parent) {
      this.endSession = true;
      return null;
    }

    return this.flowSubprocess(parent, false);
  }

  // Flow Subprocess [SB.2.3]
  private flowSubprocess(activity: Activity, entry: boolean, reverse: boolean = false): Activity | null {
    console.log(`[SB.2.3] Flow Subprocess - Activity: ${activity.identifier}, Entry: ${entry}, Reverse: ${reverse}`);
    
    // If this is a leaf activity and entry is true, return it
    if (activity.isLeaf && entry) {
      if (this.isActivityDeliverable(activity)) {
        return activity;
      }
    }

    // If this is not a leaf, find appropriate child
    if (!activity.isLeaf) {
      let targetChild: Activity | null = null;
      
      if (entry) {
        // Flow into first available child
        targetChild = this.getFirstChild(activity);
      } else {
        // Flow to next/previous child
        targetChild = reverse ? 
          this.getPreviousChild(activity) : 
          this.getNextChild(activity);
      }

      if (targetChild) {
        return this.flowSubprocess(targetChild, true, reverse);
      }
    }

    // Flow out to parent
    const parent = activity.parent;
    if (parent) {
      return this.flowSubprocess(parent, false, reverse);
    }

    // End of tree
    return null;
  }

  // Flow Tree Traversal Subprocess [SB.2.1]
  private flowTreeTraversalSubprocess(activity: Activity, direction: "forward" | "backward"): Activity | null {
    console.log(`[SB.2.1] Flow Tree Traversal - Activity: ${activity.identifier}, Direction: ${direction}`);
    
    if (direction === "forward") {
      return this.getNextActivityInTree(activity);
    } else {
      return this.getPreviousActivityInTree(activity);
    }
  }

  // Delivery Request Process [DB.1.1]
  private deliveryRequestProcess(activity: Activity): Activity | null {
    console.log(`[DB.1.1] Delivery Request Process - Activity: ${activity.identifier}`);
    
    if (!this.isActivityDeliverable(activity)) {
      console.log(`[DB.1.1] Activity not deliverable: ${activity.identifier}`);
      return null;
    }

    // Set as current activity
    this.session.currentActivity = activity;
    activity.activityStateInformation.activityIsActive = true;

    // Run sequencing rules
    this.sequencingRulesCheckProcess(activity, "entry");

    console.log(`[DB.1.1] Delivering activity: ${activity.identifier}`);
    return activity;
  }

  // Helper Methods
  private findActivity(identifier: string): Activity | null {
    return this.findActivityInTree(this.session.activityTree, identifier);
  }

  private findActivityInTree(activity: Activity, identifier: string): Activity | null {
    if (activity.identifier === identifier) {
      return activity;
    }
    
    for (const child of activity.children) {
      const found = this.findActivityInTree(child, identifier);
      if (found) {
        return found;
      }
    }
    
    return null;
  }

  private findSuspendedActivity(activity: Activity): Activity | null {
    if (activity.activityStateInformation.activityIsSuspended) {
      return activity;
    }
    
    for (const child of activity.children) {
      const found = this.findSuspendedActivity(child);
      if (found) {
        return found;
      }
    }
    
    return null;
  }

  private isActivityDeliverable(activity: Activity): boolean {
    // Must be a leaf activity
    if (!activity.isLeaf) {
      return false;
    }

    // Must have identifierref (points to resource)
    if (!activity.item.identifierref) {
      return false;
    }

    // Must be visible
    if (activity.item.isvisible === false) {
      return false;
    }

    // Check pre-conditions
    return this.checkPreConditions(activity);
  }

  private checkPreConditions(activity: Activity): boolean {
    const sequencing = activity.sequencingDefinition;
    if (!sequencing?.sequencingRules?.preConditionRule) {
      return true;
    }

    for (const rule of sequencing.sequencingRules.preConditionRule) {
      if (!this.evaluateSequencingRule(rule, activity)) {
        return false;
      }
    }

    return true;
  }

  private evaluateSequencingRule(rule: SCORMRule, activity: Activity): boolean {
    console.log(`[Rule Evaluation] Rule: ${rule.action}, Combination: ${rule.conditionCombination}`);
    
    const conditionResults: boolean[] = [];
    
    for (const condition of rule.ruleConditions) {
      const result = this.evaluateRuleCondition(condition, activity);
      conditionResults.push(result);
      console.log(`[Rule Evaluation] Condition: ${condition.condition}, Result: ${result}`);
    }
    
    // Apply combination logic
    let ruleResult: boolean;
    if (rule.conditionCombination === "all") {
      ruleResult = conditionResults.every(result => result);
    } else { // "any"
      ruleResult = conditionResults.some(result => result);
    }
    
    console.log(`[Rule Evaluation] Final Rule Result: ${ruleResult}`);
    return ruleResult;
  }

  private evaluateRuleCondition(condition: SCORMRuleCondition, activity: Activity): boolean {
    const state = activity.activityStateInformation;
    let result = false;
    
    switch (condition.condition) {
      case "satisfied":
        result = this.getObjectiveSatisfiedStatus(activity, condition.referenceObjective);
        break;
        
      case "objectiveStatusKnown":
        result = this.getObjectiveProgressStatus(activity, condition.referenceObjective);
        break;
        
      case "objectiveSatisfied":
        result = this.getObjectiveSatisfiedStatus(activity, condition.referenceObjective);
        break;
        
      case "objectiveMeasureKnown":
        const measure = this.getObjectiveMeasure(activity, condition.referenceObjective);
        result = measure !== undefined;
        break;
        
      case "objectiveMeasureGreaterThan":
        const measureGT = this.getObjectiveMeasure(activity, condition.referenceObjective);
        result = measureGT !== undefined && 
                condition.measureThreshold !== undefined &&
                measureGT > condition.measureThreshold;
        break;
        
      case "objectiveMeasureLessThan":
        const measureLT = this.getObjectiveMeasure(activity, condition.referenceObjective);
        result = measureLT !== undefined && 
                condition.measureThreshold !== undefined &&
                measureLT < condition.measureThreshold;
        break;
        
      case "completed":
        result = state.activityProgressStatus && state.activityCompletionStatus;
        break;
        
      case "activityProgressKnown":
        result = state.activityProgressStatus;
        break;
        
      case "attempted":
        result = state.attemptProgressStatus;
        break;
        
      case "attemptLimitExceeded":
        result = this.isAttemptLimitExceeded(activity);
        break;
        
      case "timeLimitExceeded":
        result = this.isTimeLimitExceeded(activity);
        break;
        
      case "outsideAvailableTimeRange":
        result = this.isOutsideAvailableTimeRange(activity);
        break;
        
      default:
        console.log(`[Rule Evaluation] Unknown condition: ${condition.condition}`);
        result = false;
    }
    
    // Apply operator
    if (condition.operator === "not") {
      result = !result;
    }
    
    return result;
  }

  private sequencingRulesCheckProcess(activity: Activity, event: "entry" | "exit"): void {
    console.log(`[UP.2] Sequencing Rules Check Process - ${event} for ${activity.identifier}`);
    
    const sequencing = activity.sequencingDefinition;
    if (!sequencing?.sequencingRules) {
      return;
    }
    
    let rulesToCheck: SCORMRule[] = [];
    
    switch (event) {
      case "entry":
        rulesToCheck = sequencing.sequencingRules.preConditionRule || [];
        break;
      case "exit":
        rulesToCheck = [...(sequencing.sequencingRules.exitConditionRule || []), 
                        ...(sequencing.sequencingRules.postConditionRule || [])];
        break;
    }
    
    for (const rule of rulesToCheck) {
      const ruleResult = this.evaluateSequencingRule(rule, activity);
      
      if (ruleResult) {
        console.log(`[UP.2] Rule triggered - Action: ${rule.action}`);
        this.executeRuleAction(rule.action, activity);
      }
    }
  }

  private executeRuleAction(action: string, activity: Activity): void {
    console.log(`[Rule Action] Executing: ${action} for ${activity.identifier}`);
    
    switch (action) {
      case "skip":
        // Mark activity as skipped
        activity.activityStateInformation.activityProgressStatus = true;
        activity.activityStateInformation.activityCompletionStatus = true;
        break;
        
      case "disabled":
        // Disable the activity
        break;
        
      case "hiddenFromChoice":
        // Hide from choice navigation
        break;
        
      case "stopForwardTraversal":
        // Stop forward traversal
        break;
        
      case "exitParent":
        // Exit to parent activity
        break;
        
      case "exitAll":
        // Exit all activities
        this.endSession = true;
        break;
        
      case "retry":
        // Retry the activity
        this.resetActivityState(activity);
        break;
        
      case "retryAll":
        // Retry all activities
        this.resetAllActivityStates();
        break;
        
      default:
        console.log(`[Rule Action] Unknown action: ${action}`);
    }
  }

  private rollupProcess(activity: Activity): void {
    console.log(`[RB.1.5] Rollup Process for ${activity.identifier}`);
    
    // Start rollup from current activity and work up the tree
    let currentActivity: Activity | undefined = activity;
    
    while (currentActivity) {
      this.rollupActivityState(currentActivity);
      currentActivity = currentActivity.parent;
    }
  }

  private rollupActivityState(activity: Activity): void {
    console.log(`[Rollup] Processing activity: ${activity.identifier}`);
    
    // If this is a leaf activity, nothing to rollup
    if (activity.isLeaf) {
      return;
    }
    
    const sequencing = activity.sequencingDefinition;
    
    // Apply rollup rules if defined
    if (sequencing?.rollupRules?.rollupRule) {
      for (const rule of sequencing.rollupRules.rollupRule) {
        this.applyRollupRule(rule, activity);
      }
    } else {
      // Apply default rollup behavior
      this.applyDefaultRollup(activity);
    }
  }

  private applyRollupRule(rule: any, activity: Activity): void {
    // Evaluate rollup rule conditions against child activities
    console.log(`[Rollup Rule] Applying rule with action: ${rule.action}`);
    
    const childResults: boolean[] = [];
    
    for (const child of activity.children) {
      for (const condition of rule.conditions) {
        const result = this.evaluateRuleCondition(condition, child);
        childResults.push(result);
      }
    }
    
    // Apply combination logic
    let ruleResult: boolean;
    if (rule.conditionCombination === "all") {
      ruleResult = childResults.every(result => result);
    } else {
      ruleResult = childResults.some(result => result);
    }
    
    // Apply rollup action if rule is satisfied
    if (ruleResult) {
      this.executeRollupAction(rule.action, activity);
    }
  }

  private applyDefaultRollup(activity: Activity): void {
    console.log(`[Default Rollup] Processing ${activity.identifier}`);
    
    // Default completion rollup: activity is complete if all children are complete
    const allChildrenComplete = activity.children.every(child => 
      child.activityStateInformation.activityProgressStatus && 
      child.activityStateInformation.activityCompletionStatus
    );
    
    if (allChildrenComplete) {
      activity.activityStateInformation.activityProgressStatus = true;
      activity.activityStateInformation.activityCompletionStatus = true;
    }
    
    // Default satisfaction rollup: activity is satisfied if all children are satisfied
    const allChildrenSatisfied = activity.children.every(child => 
      this.getObjectiveSatisfiedStatus(child)
    );
    
    if (allChildrenSatisfied) {
      this.setObjectiveSatisfiedStatus(activity, true);
    }
  }

  private executeRollupAction(action: string, activity: Activity): void {
    console.log(`[Rollup Action] Executing: ${action} for ${activity.identifier}`);
    
    switch (action) {
      case "satisfied":
        this.setObjectiveSatisfiedStatus(activity, true);
        break;
        
      case "notSatisfied":
        this.setObjectiveSatisfiedStatus(activity, false);
        break;
        
      case "completed":
        activity.activityStateInformation.activityProgressStatus = true;
        activity.activityStateInformation.activityCompletionStatus = true;
        break;
        
      case "incomplete":
        activity.activityStateInformation.activityProgressStatus = true;
        activity.activityStateInformation.activityCompletionStatus = false;
        break;
        
      default:
        console.log(`[Rollup Action] Unknown action: ${action}`);
    }
  }

  // Helper methods for objective management
  private getObjectiveSatisfiedStatus(activity: Activity, objectiveId?: string): boolean {
    const objective = this.getObjective(activity, objectiveId);
    return objective?.objectiveSatisfiedStatus || false;
  }

  private getObjectiveProgressStatus(activity: Activity, objectiveId?: string): boolean {
    const objective = this.getObjective(activity, objectiveId);
    return objective?.objectiveProgressStatus || false;
  }

  private getObjectiveMeasure(activity: Activity, objectiveId?: string): number | undefined {
    const objective = this.getObjective(activity, objectiveId);
    return objective?.objectiveMeasureStatus ? objective.objectiveNormalizedMeasure : undefined;
  }

  private setObjectiveSatisfiedStatus(activity: Activity, satisfied: boolean, objectiveId?: string): void {
    const objective = this.getOrCreateObjective(activity, objectiveId);
    objective.objectiveProgressStatus = true;
    objective.objectiveSatisfiedStatus = satisfied;
  }

  private getObjective(activity: Activity, objectiveId?: string): ObjectiveState | undefined {
    const id = objectiveId || "_primary_";
    return activity.activityStateInformation.objectives.get(id);
  }

  private getOrCreateObjective(activity: Activity, objectiveId?: string): ObjectiveState {
    const id = objectiveId || "_primary_";
    let objective = activity.activityStateInformation.objectives.get(id);
    
    if (!objective) {
      objective = {
        objectiveProgressStatus: false,
        objectiveSatisfiedStatus: false,
        objectiveMeasureStatus: false,
        objectiveNormalizedMeasure: 0,
      };
      activity.activityStateInformation.objectives.set(id, objective);
    }
    
    return objective;
  }

  // Helper methods for limit checking
  private isAttemptLimitExceeded(activity: Activity): boolean {
    const sequencing = activity.sequencingDefinition;
    const attemptLimit = sequencing?.limitConditions?.attemptLimit;
    
    if (!attemptLimit) {
      return false;
    }
    
    // Count attempts for this activity
    const attemptCount = this.getAttemptCount(activity);
    return attemptCount >= attemptLimit;
  }

  private isTimeLimitExceeded(activity: Activity): boolean {
    const sequencing = activity.sequencingDefinition;
    const timeLimit = sequencing?.limitConditions?.activityAbsoluteDurationLimit;
    
    if (!timeLimit) {
      return false;
    }
    
    const duration = activity.activityStateInformation.activityAbsoluteDuration;
    return duration >= this.parseTimeLimit(timeLimit);
  }

  private isOutsideAvailableTimeRange(activity: Activity): boolean {
    const sequencing = activity.sequencingDefinition;
    const beginTime = sequencing?.limitConditions?.beginTimeLimit;
    const endTime = sequencing?.limitConditions?.endTimeLimit;
    
    if (!beginTime && !endTime) {
      return false;
    }
    
    const now = new Date();
    
    if (beginTime && now < new Date(beginTime)) {
      return true;
    }
    
    if (endTime && now > new Date(endTime)) {
      return true;
    }
    
    return false;
  }

  private getAttemptCount(activity: Activity): number {
    // This would be tracked in the activity state
    return 0; // Simplified for now
  }

  private parseTimeLimit(timeLimit: string): number {
    // Parse ISO 8601 duration format
    // Simplified implementation
    return 0;
  }

  private resetActivityState(activity: Activity): void {
    activity.activityStateInformation = this.initializeActivityState();
  }

  private resetAllActivityStates(): void {
    this.resetActivityStateRecursive(this.session.activityTree);
  }

  private resetActivityStateRecursive(activity: Activity): void {
    this.resetActivityState(activity);
    for (const child of activity.children) {
      this.resetActivityStateRecursive(child);
    }
  }

  private isChoiceValid(activity: Activity): boolean {
    const sequencing = activity.sequencingDefinition;
    return sequencing?.controlMode?.choice !== false;
  }

  private isContinueAllowed(activity: Activity): boolean {
    const sequencing = activity.sequencingDefinition;
    return sequencing?.controlMode?.flow !== false;
  }

  private isPreviousAllowed(activity: Activity): boolean {
    const sequencing = activity.sequencingDefinition;
    return !sequencing?.controlMode?.forwardOnly;
  }

  private getFirstChild(activity: Activity): Activity | null {
    if (activity.children.length === 0) {
      return null;
    }
    return activity.children[0];
  }

  private getNextChild(activity: Activity): Activity | null {
    if (!this.session.currentActivity || !this.session.currentActivity.parent) {
      return null;
    }

    const parent = this.session.currentActivity.parent;
    const siblings = parent.children;
    const currentIndex = siblings.findIndex(child => child.identifier === this.session.currentActivity!.identifier);
    
    if (currentIndex === -1 || currentIndex === siblings.length - 1) {
      return null;
    }
    
    return siblings[currentIndex + 1];
  }

  private getPreviousChild(activity: Activity): Activity | null {
    if (!this.session.currentActivity || !this.session.currentActivity.parent) {
      return null;
    }

    const parent = this.session.currentActivity.parent;
    const siblings = parent.children;
    const currentIndex = siblings.findIndex(child => child.identifier === this.session.currentActivity!.identifier);
    
    if (currentIndex <= 0) {
      return null;
    }
    
    return siblings[currentIndex - 1];
  }

  private getNextActivityInTree(activity: Activity): Activity | null {
    // SCORM 2004 Tree Traversal Algorithm - Forward Direction
    
    // Step 1: If activity has children, return first child
    if (activity.children.length > 0) {
      return activity.children[0];
    }
    
    // Step 2: If activity has next sibling, return it
    const nextSibling = this.getNextSibling(activity);
    if (nextSibling) {
      return nextSibling;
    }
    
    // Step 3: Walk up the tree looking for ancestor with next sibling
    let currentActivity = activity.parent;
    while (currentActivity) {
      const ancestorNextSibling = this.getNextSibling(currentActivity);
      if (ancestorNextSibling) {
        return ancestorNextSibling;
      }
      currentActivity = currentActivity.parent;
    }
    
    // Step 4: No next activity found
    return null;
  }

  private getPreviousActivityInTree(activity: Activity): Activity | null {
    // SCORM 2004 Tree Traversal Algorithm - Backward Direction
    
    // Step 1: If activity has previous sibling, go to last descendant of that sibling
    const prevSibling = this.getPreviousSibling(activity);
    if (prevSibling) {
      return this.getLastDescendant(prevSibling);
    }
    
    // Step 2: If no previous sibling, return parent
    if (activity.parent) {
      return activity.parent;
    }
    
    // Step 3: No previous activity found
    return null;
  }

  private getNextSibling(activity: Activity): Activity | null {
    if (!activity.parent) {
      return null;
    }
    
    const siblings = activity.parent.children;
    const currentIndex = siblings.findIndex(child => child.identifier === activity.identifier);
    
    if (currentIndex === -1 || currentIndex === siblings.length - 1) {
      return null;
    }
    
    return siblings[currentIndex + 1];
  }

  private getPreviousSibling(activity: Activity): Activity | null {
    if (!activity.parent) {
      return null;
    }
    
    const siblings = activity.parent.children;
    const currentIndex = siblings.findIndex(child => child.identifier === activity.identifier);
    
    if (currentIndex <= 0) {
      return null;
    }
    
    return siblings[currentIndex - 1];
  }

  private getLastDescendant(activity: Activity): Activity {
    // Find the last (rightmost, deepest) descendant of an activity
    if (activity.children.length === 0) {
      return activity;
    }
    
    const lastChild = activity.children[activity.children.length - 1];
    return this.getLastDescendant(lastChild);
  }

  private getFirstDeliverableDescendant(activity: Activity): Activity | null {
    // Find the first deliverable descendant in the tree
    if (this.isActivityDeliverable(activity)) {
      return activity;
    }
    
    for (const child of activity.children) {
      const deliverable = this.getFirstDeliverableDescendant(child);
      if (deliverable) {
        return deliverable;
      }
    }
    
    return null;
  }

  // Public API
  public startSequence(): string | null {
    const activity = this.overallSequencingProcess("start");
    return activity?.identifier || null;
  }

  public processNavigationRequest(request: string, targetId?: string): string | null {
    const activity = this.overallSequencingProcess(request, targetId);
    return activity?.identifier || null;
  }

  public getCurrentActivity(): string | undefined {
    return this.session.currentActivity?.identifier;
  }

  public getAvailableNavigationRequests(): string[] {
    const available: string[] = [];
    
    if (!this.session.currentActivity) {
      return available;
    }

    const activity = this.session.currentActivity;
    
    if (this.isContinueAllowed(activity)) {
      available.push("continue");
    }
    
    if (this.isPreviousAllowed(activity)) {
      available.push("previous");
    }
    
    if (this.isChoiceValid(activity)) {
      available.push("choice");
    }
    
    available.push("exit", "exitAll", "abandon", "abandonAll");
    
    return available;
  }
}