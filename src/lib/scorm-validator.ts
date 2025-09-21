/* eslint-disable @typescript-eslint/no-explicit-any */
// SCORM Package Validator

import { SCORMPackage, SCORMManifest } from "@/types/scorm";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class SCORMValidator {
  static validatePackage(packageData: SCORMPackage): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate manifest
    const manifestResult = this.validateManifest(packageData.manifest);
    errors.push(...manifestResult.errors);
    warnings.push(...manifestResult.warnings);

    // Validate files
    const filesResult = this.validateFiles(packageData);
    errors.push(...filesResult.errors);
    warnings.push(...filesResult.warnings);

    // Validate entry point
    const entryPointResult = this.validateEntryPoint(packageData);
    errors.push(...entryPointResult.errors);
    warnings.push(...entryPointResult.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private static validateManifest(manifest: SCORMManifest): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!manifest.identifier) {
      errors.push("Manifest identifier is required");
    }

    if (!manifest.title) {
      errors.push("Manifest title is required");
    }

    if (!manifest.version) {
      warnings.push("Manifest version is missing, using default");
    }

    // Validate organizations
    if (!manifest.organizations || manifest.organizations.length === 0) {
      errors.push("At least one organization is required");
    } else {
      manifest.organizations.forEach((org, index) => {
        if (!org.identifier) {
          errors.push(`Organization ${index} is missing identifier`);
        }
        if (!org.title) {
          warnings.push(`Organization ${index} is missing title`);
        }
      });
    }

    // Validate resources
    if (!manifest.resources || manifest.resources.length === 0) {
      warnings.push("No resources found in manifest");
    } else {
      manifest.resources.forEach((resource, index) => {
        if (!resource.identifier) {
          errors.push(`Resource ${index} is missing identifier`);
        }
        if (!resource.href) {
          errors.push(`Resource ${index} is missing href`);
        }
        if (!resource.files || resource.files.length === 0) {
          warnings.push(`Resource ${index} has no files`);
        }
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private static validateFiles(packageData: SCORMPackage): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if this is hosted content (baseUrl exists and files Map is empty/minimal)
    const isHostedContent = packageData.baseUrl && packageData.files.size === 0;

    if (isHostedContent) {
      // For hosted content, we can't validate file existence locally
      // Instead, we provide informational messages
      warnings.push(
        "Hosted content: File validation skipped - files will be loaded from server"
      );

      // Basic validation for hosted content
      if (packageData.manifest.resources.length === 0) {
        errors.push("No resources found in manifest");
      }

      return { isValid: errors.length === 0, errors, warnings };
    }

    // For local/zip packages, perform full file validation
    // Check if imsmanifest.xml exists
    if (!packageData.files.has("imsmanifest.xml")) {
      errors.push("imsmanifest.xml not found in package");
    }

    // Validate resource files exist
    packageData.manifest.resources.forEach((resource) => {
      resource.files.forEach((file) => {
        if (!packageData.files.has(file.href)) {
          errors.push(
            `File ${file.href} referenced in manifest but not found in package`
          );
        }
      });
    });

    // Check for common SCORM files
    const commonFiles = ["imsmanifest.xml"];
    commonFiles.forEach((file) => {
      if (!packageData.files.has(file)) {
        warnings.push(`Common SCORM file ${file} not found`);
      }
    });

    return { isValid: errors.length === 0, errors, warnings };
  }

  private static validateEntryPoint(
    packageData: SCORMPackage
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if this is hosted content
    const isHostedContent = packageData.baseUrl && packageData.files.size === 0;

    // Find entry point resource from organizations
    let entryPointResource: string | null = null;

    for (const org of packageData.manifest.organizations) {
      const found = this.findEntryPointInItems(org.items);
      if (found) {
        entryPointResource = found;
        break;
      }
    }

    if (!entryPointResource) {
      errors.push("No entry point found in manifest");
      return { isValid: false, errors, warnings };
    }

    // Find the actual resource and its href
    const resource = packageData.manifest.resources.find(
      (r) => r.identifier === entryPointResource
    );

    if (!resource) {
      errors.push(
        `Entry point resource ${entryPointResource} not found in resources`
      );
      return { isValid: false, errors, warnings };
    }

    const entryPointFile = resource.href;

    if (isHostedContent) {
      // For hosted content, we can't validate file existence but can validate structure
      warnings.push(
        `Hosted content: Entry point will be loaded from ${packageData.baseUrl}${entryPointFile}`
      );
    } else {
      // For local/zip packages, validate entry point file exists
      if (!packageData.files.has(entryPointFile)) {
        errors.push(`Entry point file ${entryPointFile} not found in package`);
      }
    }

    // Check if entry point is an HTML file
    if (
      !entryPointFile.toLowerCase().endsWith(".html") &&
      !entryPointFile.toLowerCase().endsWith(".htm")
    ) {
      warnings.push(`Entry point ${entryPointFile} is not an HTML file`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private static findEntryPointInItems(items: any[]): string | null {
    for (const item of items) {
      if (item.identifierref) {
        // Find the resource for this identifierref
        // This is a simplified version - in a real implementation,
        // you'd need access to the full package data
        return item.identifierref;
      }

      if (item.item) {
        const found = this.findEntryPointInItems(item.item);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  static validateURL(url: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const urlObj = new URL(url);

      // Check protocol
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        errors.push("URL must use HTTP or HTTPS protocol");
      }

      // Check if it's a manifest file
      const isManifest =
        url.toLowerCase().includes("imsmanifest.xml") ||
        url.toLowerCase().includes("manifest.xml");

      // Check if it's a zip file
      const isZip = url.toLowerCase().includes(".zip");

      // Check for common SCORM package indicators
      const scormIndicators = ["scorm", "package", "course", "content"];
      const hasIndicator = scormIndicators.some((indicator) =>
        url.toLowerCase().includes(indicator)
      );

      if (isManifest) {
        warnings.push(
          "Direct manifest URL detected - will load as hosted content"
        );
      } else if (isZip) {
        warnings.push("ZIP file detected - will extract and load package");
      } else if (!hasIndicator) {
        warnings.push(
          "URL does not contain obvious SCORM indicators - will attempt auto-detection"
        );
      }
    } catch (error) {
      errors.push("Invalid URL format");
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  static validateSCORMVersion(version: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!["1.2", "2004"].includes(version)) {
      errors.push('SCORM version must be either "1.2" or "2004"');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}
