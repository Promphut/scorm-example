/* eslint-disable @typescript-eslint/no-explicit-any */
// SCORM Content Parser

import JSZip from "jszip";
import { parseString } from "xml2js";
import {
  SCORMPackage,
  SCORMManifest,
  SCORMOrganization,
  SCORMItem,
  SCORMResource,
  SCORMFile,
} from "@/types/scorm";

export class SCORMParser {
  private zip: JSZip | null = null;

  /**
   * Static method to quickly load a SCORM package from a URL
   * @param url - The URL of the SCORM package (.zip file)
   * @param onProgress - Optional progress callback
   * @returns Promise<SCORMPackage>
   */
  static async openFromUrl(
    url: string,
    onProgress?: (progress: number) => void
  ): Promise<SCORMPackage> {
    const parser = new SCORMParser();
    return await parser.loadFromUrl(url, onProgress);
  }

  async loadFromUrl(
    url: string,
    onProgress?: (progress: number) => void
  ): Promise<SCORMPackage> {
    try {
      console.log(`[SCORMParser] Attempting to load from URL: ${url}`);

      // Validate URL format
      if (!this.isValidUrl(url)) {
        console.error(`[SCORMParser] Invalid URL format: ${url}`);
        throw new Error("Invalid URL format");
      }

      onProgress?.(10);

      // Try to determine the content type with a HEAD request
      const isZip = await this.detectZipFromUrl(url);
      
      if (isZip) {
        // Handle zip file loading (with fallback to hosted content)
        return await this.loadFromZipUrl(url, onProgress);
      } else {
        // Handle hosted content loading
        return await this.loadFromHostedUrl(url, onProgress);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load SCORM package from URL: ${errorMessage}`);
    }
  }

  private async loadFromZipUrl(
    url: string,
    onProgress?: (progress: number) => void
  ): Promise<SCORMPackage> {
    console.log(`[SCORMParser] Loading from zip file: ${url}`);

    try {
      // Fetch the file with progress tracking
      const response = await fetch(url);
      if (!response.ok) {
        // If zip fetch fails, try as hosted content instead
        console.log(`[SCORMParser] Zip fetch failed (${response.status}), trying as hosted content`);
        return await this.loadFromHostedUrl(url, onProgress);
      }

      // Check content type to verify it's actually a zip
      const contentType = response.headers.get("content-type");
      const isZipContent = contentType && (
        contentType.includes("application/zip") ||
        contentType.includes("application/x-zip-compressed") ||
        contentType.includes("application/octet-stream")
      );

      if (!isZipContent && contentType) {
        console.log(`[SCORMParser] Content-Type indicates non-zip content (${contentType}), trying as hosted content`);
        return await this.loadFromHostedUrl(url, onProgress);
      }

      onProgress?.(30);

      // Get content length for progress tracking
      const contentLength = response.headers.get("content-length");
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      // Read the response with progress tracking
      const arrayBuffer = await this.readResponseWithProgress(
        response,
        total,
        onProgress
      );

      onProgress?.(70);

      // Parse the SCORM package
      const packageData = await this.loadFromArrayBuffer(arrayBuffer, url);

      onProgress?.(100);

      return packageData;
    } catch (error) {
      // If zip parsing fails, try as hosted content
      console.log(`[SCORMParser] Zip loading failed, trying as hosted content:`, error);
      return await this.loadFromHostedUrl(url, onProgress);
    }
  }

  private async loadFromHostedUrl(
    url: string,
    onProgress?: (progress: number) => void
  ): Promise<SCORMPackage> {
    console.log(`[SCORMParser] Loading from hosted content: ${url}`);

    onProgress?.(20);

    let manifestContent = "";
    let baseUrl = "";

    // Check if URL points directly to a manifest file
    if (this.isManifestUrl(url)) {
      console.log(`[SCORMParser] Direct manifest URL detected: ${url}`);
      try {
        const response = await fetch(url);
        if (response.ok) {
          manifestContent = await response.text();
          // Extract base URL from manifest URL
          const urlObj = new URL(url);
          const pathParts = urlObj.pathname.split("/");
          pathParts.pop(); // Remove the manifest filename
          baseUrl = `${urlObj.protocol}//${urlObj.host}${pathParts.join("/")}/`;
        } else {
          throw new Error(
            `Failed to fetch manifest: ${response.status} ${response.statusText}`
          );
        }
      } catch (error) {
        throw new Error(`Failed to load manifest from direct URL: ${error}`);
      }
    } else {
      // Handle directory URL - ensure URL ends with / for directory
      baseUrl = url.endsWith("/") ? url : url + "/";

      // Try to load manifest from common locations
      const manifestUrls = [
        `${baseUrl}imsmanifest.xml`,
        `${baseUrl}manifest.xml`,
        `${baseUrl}MANIFEST.xml`,
      ];

      for (const manifestUrlToTry of manifestUrls) {
        try {
          console.log(`[SCORMParser] Trying manifest URL: ${manifestUrlToTry}`);
          const response = await fetch(manifestUrlToTry);
          if (response.ok) {
            manifestContent = await response.text();
            break;
          }
        } catch (error) {
          console.log(
            `[SCORMParser] Failed to load manifest from ${manifestUrlToTry}:`,
            error
          );
        }
      }

      if (!manifestContent) {
        throw new Error("Could not find imsmanifest.xml in hosted content");
      }
    }

    onProgress?.(40);

    // Parse the manifest
    const manifest = await this.parseManifest(manifestContent);

    onProgress?.(60);

    // For hosted content, we don't need to load files locally
    // We'll use direct server URLs instead
    const files = new Map<string, string>();

    // Only load files that are absolutely necessary for parsing
    // Most content will be loaded directly from server URLs
    console.log(`[SCORMParser] Using hosted content from: ${baseUrl}`);
    console.log(`[SCORMParser] Found ${manifest.resources.length} resources`);

    onProgress?.(100);

    return {
      manifest,
      files,
      baseUrl,
    };
  }

  async loadFromArrayBuffer(
    arrayBuffer: ArrayBuffer,
    baseUrl: string = ""
  ): Promise<SCORMPackage> {
    try {
      this.zip = await JSZip.loadAsync(arrayBuffer);

      // Find and parse manifest
      const manifestFile = this.zip.file("imsmanifest.xml");
      if (!manifestFile) {
        throw new Error("imsmanifest.xml not found in SCORM package");
      }

      const manifestContent = await manifestFile.async("text");
      const manifest = await this.parseManifest(manifestContent);

      // Extract all files
      const files = new Map<string, string>();
      for (const [relativePath, zipObject] of Object.entries(this.zip.files)) {
        if (!zipObject.dir) {
          const content = await zipObject.async("text");
          files.set(relativePath, content);
        }
      }

      return {
        manifest,
        files,
        baseUrl,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Check if it's a zip parsing error
      if (
        errorMessage.includes("Invalid or unsupported zip format") ||
        errorMessage.includes("End of central directory not found") ||
        errorMessage.includes("Invalid zip file")
      ) {
        throw new Error(
          `The file at the provided URL is not a valid zip file. Please ensure the URL points to a SCORM package (.zip file). Original error: ${errorMessage}`
        );
      }

      throw new Error(`Failed to parse SCORM package: ${errorMessage}`);
    }
  }

  private async parseManifest(manifestContent: string): Promise<SCORMManifest> {
    return new Promise((resolve, reject) => {
      parseString(
        manifestContent,
        {
          explicitArray: false,
          mergeAttrs: true,
          explicitRoot: false,
          ignoreAttrs: false,
          tagNameProcessors: [(name) => name.toLowerCase()],
          attrNameProcessors: [(name) => name.toLowerCase()],
        },
        (err, result) => {
          if (err) {
            reject(new Error(`Failed to parse manifest XML: ${err}`));
            return;
          }

          try {
            console.log(
              "Raw XML parsing result:",
              JSON.stringify(result, null, 2)
            );
            const manifest = this.extractManifestFromXML(result);
            resolve(manifest);
          } catch (error) {
            console.error("Error extracting manifest:", error);
            reject(new Error(`Failed to extract manifest: ${error}`));
          }
        }
      );
    });
  }

  private extractManifestFromXML(xml: any): SCORMManifest {
    // With explicitArray: false, the structure might be different
    let manifest;

    if (xml.manifest) {
      manifest = xml.manifest;
    } else if (xml["ims:manifest"]) {
      manifest = xml["ims:manifest"];
    } else if (xml.identifier) {
      // The root element might be the manifest itself
      manifest = xml;
    } else {
      console.error("Available XML keys:", Object.keys(xml));
      throw new Error(
        "Invalid manifest structure - manifest element not found"
      );
    }

    // Handle both array and object formats
    if (Array.isArray(manifest)) {
      manifest = manifest[0];
    }

    // With mergeAttrs: true, attributes are merged into the element
    const identifier = manifest.identifier || manifest.$?.identifier || "";
    const version = manifest.version || manifest.$?.version || "1.0";

    // Extract organizations
    const organizations: SCORMOrganization[] = [];
    let orgsElement =
      manifest.organizations?.organization || manifest.organizations;
    if (!orgsElement && manifest["ims:organizations"]) {
      orgsElement =
        manifest["ims:organizations"]["ims:organization"] ||
        manifest["ims:organizations"];
    }

    if (orgsElement) {
      const orgArray = Array.isArray(orgsElement) ? orgsElement : [orgsElement];
      for (const org of orgArray) {
        organizations.push(this.extractOrganization(org));
      }
    }

    // Extract resources
    const resources: SCORMResource[] = [];
    let resourcesElement = manifest.resources?.resource || manifest.resources;
    if (!resourcesElement && manifest["ims:resources"]) {
      resourcesElement =
        manifest["ims:resources"]["ims:resource"] || manifest["ims:resources"];
    }

    if (resourcesElement) {
      const resourceArray = Array.isArray(resourcesElement)
        ? resourcesElement
        : [resourcesElement];
      for (const resource of resourceArray) {
        resources.push(this.extractResource(resource));
      }
    }

    // Extract metadata
    const metadata =
      manifest.metadata?.[0] ||
      manifest["ims:metadata"]?.[0] ||
      manifest.metadata;

    let title = this.extractTitle(manifest);
    console.log("Extracted manifest title:", title);
    console.log("Manifest object keys:", Object.keys(manifest));

    // If title not found in manifest root, try extracting from metadata
    if (!title || title.trim() === "") {
      title = this.extractTitleFromMetadata(metadata);
      console.log("Extracted title from metadata:", title);
    }

    // Fallback title if none found
    if (!title || title.trim() === "") {
      title = identifier || "Untitled SCORM Package";
      console.log("Using fallback title:", title);
    }

    return {
      identifier,
      version,
      title,
      description: this.extractDescription(manifest),
      organizations,
      resources,
      metadata,
    };
  }

  private extractOrganization(orgElement: any): SCORMOrganization {
    // With mergeAttrs: true, attributes are merged into the element
    const identifier = orgElement.identifier || orgElement.$?.identifier || "";
    const items: SCORMItem[] = [];

    let itemsElement = orgElement.item;
    if (!itemsElement && orgElement["ims:item"]) {
      itemsElement = orgElement["ims:item"];
    }

    if (itemsElement) {
      const itemArray = Array.isArray(itemsElement)
        ? itemsElement
        : [itemsElement];
      for (const item of itemArray) {
        items.push(this.extractItem(item));
      }
    }

    return {
      identifier,
      title: this.extractTitle(orgElement),
      items,
    };
  }

  private extractItem(itemElement: any): SCORMItem {
    // With mergeAttrs: true, attributes are merged into the element
    const identifier =
      itemElement.identifier || itemElement.$?.identifier || "";
    const identifierref =
      itemElement.identifierref || itemElement.$?.identifierref;
    const isvisible = itemElement.isvisible !== "false"; // Default to true
    const parameters = itemElement.parameters || itemElement.$?.parameters;
    const items: SCORMItem[] = [];

    let subItemsElement = itemElement.item;
    if (!subItemsElement && itemElement["ims:item"]) {
      subItemsElement = itemElement["ims:item"];
    }

    if (subItemsElement) {
      const itemArray = Array.isArray(subItemsElement)
        ? subItemsElement
        : [subItemsElement];
      for (const item of itemArray) {
        items.push(this.extractItem(item));
      }
    }

    // Extract sequencing information (SCORM 2004)
    const sequencing = this.extractSequencing(itemElement.sequencing || itemElement["imsss:sequencing"]);
    
    // Extract presentation information
    const presentation = this.extractPresentation(itemElement.presentation);

    // Extract mastery score and time limits
    const mastery_score = itemElement.mastery_score ? parseFloat(itemElement.mastery_score) : undefined;
    const max_time_allowed = itemElement.max_time_allowed || itemElement.maxtimeallowed;
    const time_limit_action = itemElement.time_limit_action || itemElement.timelimitaction;

    return {
      identifier,
      title: this.extractTitle(itemElement),
      identifierref,
      isvisible,
      parameters,
      item: items.length > 0 ? items : undefined,
      sequencing,
      presentation,
      mastery_score,
      max_time_allowed,
      time_limit_action,
    };
  }

  private extractResource(resourceElement: any): SCORMResource {
    // With mergeAttrs: true, attributes are merged into the element
    const identifier =
      resourceElement.identifier || resourceElement.$?.identifier || "";
    const type = resourceElement.type || resourceElement.$?.type || "";
    const href = resourceElement.href || resourceElement.$?.href || "";
    const base = resourceElement.base || resourceElement.$?.base;
    const scormType = resourceElement.scormtype || resourceElement["adlcp:scormtype"];
    const xmlBase = resourceElement.xmlbase || resourceElement["xml:base"];
    const files: SCORMFile[] = [];
    const dependencies: any[] = [];

    let filesElement = resourceElement.file;
    if (!filesElement && resourceElement["ims:file"]) {
      filesElement = resourceElement["ims:file"];
    }

    if (filesElement) {
      const fileArray = Array.isArray(filesElement)
        ? filesElement
        : [filesElement];
      for (const file of fileArray) {
        const fileHref = file.href || file.$?.href || "";
        const metadata = file.metadata;
        files.push({
          href: fileHref,
          metadata: metadata ? this.extractMetadata(metadata) : undefined,
        });
      }
    }

    // Extract dependencies
    let dependencyElement = resourceElement.dependency;
    if (!dependencyElement && resourceElement["ims:dependency"]) {
      dependencyElement = resourceElement["ims:dependency"];
    }

    if (dependencyElement) {
      const depArray = Array.isArray(dependencyElement)
        ? dependencyElement
        : [dependencyElement];
      for (const dep of depArray) {
        const identifierref = dep.identifierref || dep.$?.identifierref;
        if (identifierref) {
          dependencies.push({ identifierref });
        }
      }
    }

    return {
      identifier,
      type,
      href,
      base,
      scormType: scormType as "sco" | "asset" | undefined,
      xmlBase,
      files,
      dependencies: dependencies.length > 0 ? dependencies : undefined,
    };
  }

  private extractTitle(element: any): string {
    console.log("Extracting title from element:", element);

    let titleElement = element.title;
    if (!titleElement && element["ims:title"]) {
      titleElement = element["ims:title"];
    }

    // Also check for title in metadata
    if (!titleElement && element.metadata) {
      const metadata = element.metadata;
      if (metadata.title) {
        titleElement = metadata.title;
      } else if (metadata["ims:title"]) {
        titleElement = metadata["ims:title"];
      } else if (
        metadata.lom &&
        metadata.lom.general &&
        metadata.lom.general.title
      ) {
        titleElement = metadata.lom.general.title;
      }
    }

    console.log("Found title element:", titleElement);

    if (titleElement) {
      if (Array.isArray(titleElement)) {
        titleElement = titleElement[0];
      }
      if (typeof titleElement === "string") {
        return titleElement.trim();
      }
      if (titleElement._) {
        return titleElement._.trim();
      }

      // Handle langstring elements (common in SCORM with LOM metadata)
      if (titleElement.langstring) {
        const langstring = Array.isArray(titleElement.langstring)
          ? titleElement.langstring[0]
          : titleElement.langstring;

        if (typeof langstring === "string") {
          return langstring.trim();
        }
        if (langstring && langstring._) {
          return langstring._.trim();
        }
        if (
          langstring &&
          typeof langstring === "object" &&
          langstring.toString
        ) {
          const str = langstring.toString();
          if (str !== "[object Object]") {
            return str.trim();
          }
        }
      }

      // Handle case where title is an object with text content
      if (titleElement && typeof titleElement === "object") {
        // Try to extract text from various possible structures
        if (titleElement.string) {
          return titleElement.string.trim();
        }
        if (titleElement.text) {
          return titleElement.text.trim();
        }
        if (titleElement.value) {
          return titleElement.value.trim();
        }

        // Handle direct text content in object
        const objStr = titleElement.toString();
        if (objStr && objStr !== "[object Object]") {
          return objStr.trim();
        }
      }
    }

    console.log("No title found, returning empty string");
    return "";
  }

  private extractTitleFromMetadata(metadata: any): string {
    if (!metadata) return "";

    console.log("Extracting title from metadata:", metadata);

    // Handle LOM (Learning Object Metadata) structure
    if (metadata.lom) {
      const lom = metadata.lom;
      if (lom.general && lom.general.title) {
        return this.extractTitle(lom.general);
      }
    }

    // Handle direct title in metadata
    if (metadata.title) {
      return this.extractTitle(metadata);
    }

    return "";
  }

  private extractDescription(element: any): string {
    let descriptionElement = element.description;
    if (!descriptionElement && element["ims:description"]) {
      descriptionElement = element["ims:description"];
    }

    if (descriptionElement) {
      if (Array.isArray(descriptionElement)) {
        descriptionElement = descriptionElement[0];
      }
      if (typeof descriptionElement === "string") {
        return descriptionElement;
      }
      if (descriptionElement._) {
        return descriptionElement._;
      }
    }
    return "";
  }

  // Utility methods
  public getEntryPoint(packageData: SCORMPackage): string | null {
    console.log(
      "Looking for entry point in package:",
      packageData.manifest.title
    );
    console.log("Available files:", Array.from(packageData.files.keys()));

    // Find the first organization's first item with an identifierref
    for (const org of packageData.manifest.organizations) {
      console.log("Checking organization:", org.title);
      const entryPoint = this.findEntryPointInItems(org.items, packageData);
      if (entryPoint) {
        console.log("Found entry point:", entryPoint);
        return entryPoint;
      }
    }
    console.log("No entry point found");
    return null;
  }

  private findEntryPointInItems(
    items: SCORMItem[],
    packageData: SCORMPackage
  ): string | null {
    for (const item of items) {
      console.log(
        "Checking item:",
        item.title,
        "identifierref:",
        item.identifierref
      );

      if (item.identifierref) {
        // Find the resource for this identifierref
        const resource = this.findResourceByIdentifier(
          item.identifierref,
          packageData
        );
        if (resource) {
          console.log(
            "Found resource:",
            resource.identifier,
            "href:",
            resource.href
          );
          console.log("Resource files:", resource.files);

          if (resource.files.length > 0) {
            const entryPoint = resource.files[0].href;
            console.log("Checking if entry point exists:", entryPoint);

            // Check if the file exists in the package
            if (packageData.files.has(entryPoint)) {
              console.log("Entry point file found in package");
              return entryPoint;
            } else {
              console.log(
                "Entry point file not found, trying to find similar file"
              );
              // Try to find a file with similar name
              const similarFile = this.findSimilarFile(entryPoint, packageData);
              if (similarFile) {
                console.log("Found similar file:", similarFile);
                return similarFile;
              }
            }
          }
        }
      }

      if (item.item) {
        const entryPoint = this.findEntryPointInItems(item.item, packageData);
        if (entryPoint) {
          return entryPoint;
        }
      }
    }
    return null;
  }

  public findResourceByIdentifier(
    identifier: string,
    packageData: SCORMPackage
  ): SCORMResource | null {
    for (const resource of packageData.manifest.resources) {
      if (resource.identifier === identifier) {
        return resource;
      }
    }
    return null;
  }

  private findSimilarFile(
    targetFile: string,
    packageData: SCORMPackage
  ): string | null {
    console.log("Looking for similar file to:", targetFile);
    const targetBase = targetFile.toLowerCase();

    // Look for HTML files first (most common entry points)
    const htmlFiles: string[] = [];
    for (const fileName of packageData.files.keys()) {
      const fileNameLower = fileName.toLowerCase();
      const fileExt = fileNameLower.split(".").pop();

      // Check for HTML files
      if (fileExt === "html" || fileExt === "htm") {
        htmlFiles.push(fileName);
      }
    }

    if (htmlFiles.length > 0) {
      console.log("Found HTML files:", htmlFiles);
      // Prefer index.html, default.html, or main.html
      const preferredNames = [
        "index.html",
        "default.html",
        "main.html",
        "start.html",
      ];
      for (const preferred of preferredNames) {
        const found = htmlFiles.find((f) =>
          f.toLowerCase().includes(preferred)
        );
        if (found) {
          console.log("Using preferred HTML file:", found);
          return found;
        }
      }
      // Return the first HTML file
      console.log("Using first HTML file:", htmlFiles[0]);
      return htmlFiles[0];
    }

    // If no HTML files found, look for any file with similar name
    for (const fileName of packageData.files.keys()) {
      const fileNameLower = fileName.toLowerCase();
      if (
        fileNameLower.includes(targetBase.split(".")[0]) ||
        targetBase.includes(fileNameLower.split(".")[0])
      ) {
        console.log("Found similar file:", fileName);
        return fileName;
      }
    }

    // Last resort: return the first file
    const firstFile = packageData.files.keys().next().value;
    console.log("Using first available file:", firstFile);
    return firstFile || null;
  }

  public getResourceContent(
    packageData: SCORMPackage,
    resourcePath: string
  ): string | null {
    // For hosted content, we don't have local file content
    // Return null to indicate content should be loaded from server
    if (packageData.files.size === 0) {
      return null;
    }
    return packageData.files.get(resourcePath) || null;
  }

  public getResourceUrl(
    packageData: SCORMPackage,
    resourcePath: string
  ): string {
    if (!resourcePath || resourcePath.trim() === "") {
      console.warn("[SCORMParser] Empty resource path provided");
      return "";
    }

    // Normalize the resource path
    const normalizedPath = resourcePath.replace(/\\/g, '/').trim();
    
    if (packageData.baseUrl) {
      // For hosted content, construct the full URL
      const baseUrl = packageData.baseUrl.endsWith("/")
        ? packageData.baseUrl
        : packageData.baseUrl + "/";

      // Handle relative paths properly - remove leading slash and dot-slash
      let cleanPath = normalizedPath;
      if (cleanPath.startsWith("/")) {
        cleanPath = cleanPath.substring(1);
      }
      if (cleanPath.startsWith("./")) {
        cleanPath = cleanPath.substring(2);
      }
      
      const fullUrl = `${baseUrl}${cleanPath}`;

      console.log(
        `[SCORMParser] Generated URL: ${fullUrl} from base: ${baseUrl} and path: ${resourcePath}`
      );
      
      // Validate the generated URL
      try {
        new URL(fullUrl);
        return fullUrl;
      } catch (error) {
        console.error(`[SCORMParser] Invalid URL generated: ${fullUrl}`, error);
        return "";
      }
    }

    // For local content, return normalized path
    return normalizedPath;
  }

  // Helper methods for URL validation and progress tracking
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private async detectZipFromUrl(url: string): Promise<boolean> {
    // First check URL patterns
    if (this.isZipFile(url)) {
      return true;
    }

    // Try a HEAD request to check content type
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType) {
          return contentType.includes('application/zip') || 
                 contentType.includes('application/x-zip-compressed') ||
                 contentType.includes('application/octet-stream');
        }
      }
    } catch (error) {
      console.log(`[SCORMParser] HEAD request failed for ${url}:`, error);
    }

    // Default to hosted content approach
    return false;
  }

  private isManifestUrl(url: string): boolean {
    const urlLower = url.toLowerCase();
    return (
      urlLower.endsWith("imsmanifest.xml") ||
      urlLower.endsWith("manifest.xml") ||
      urlLower.endsWith("manifest.xml/") ||
      urlLower.includes("/imsmanifest.xml") ||
      urlLower.includes("/manifest.xml")
    );
  }

  private isZipFile(url: string): boolean {
    const urlLower = url.toLowerCase();

    // Check for explicit .zip extension
    if (
      urlLower.endsWith(".zip") ||
      urlLower.includes(".zip?") ||
      urlLower.includes(".zip#")
    ) {
      return true;
    }

    // If URL ends with manifest file names, it's definitely not a zip
    if (this.isManifestUrl(url)) {
      return false;
    }

    // If URL ends with a slash, it's likely a directory
    if (urlLower.endsWith("/")) {
      return false;
    }

    // Check for obvious non-zip extensions
    const nonZipExtensions = [
      ".pdf",
      ".doc",
      ".docx",
      ".txt",
      ".html",
      ".htm",
      ".css",
      ".js",
      ".json",
      ".xml",
    ];
    for (const ext of nonZipExtensions) {
      if (urlLower.endsWith(ext) || urlLower.includes(ext + "?")) {
        return false;
      }
    }

    // For ambiguous URLs, try to determine based on response headers
    // For now, default to false to prefer hosted content approach
    return false;
  }

  private async readResponseWithProgress(
    response: Response,
    total: number,
    onProgress?: (progress: number) => void
  ): Promise<ArrayBuffer> {
    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        received += value.length;

        // Update progress if we know the total size
        if (total > 0 && onProgress) {
          const progress = Math.min(30 + (received / total) * 40, 70); // Progress from 30% to 70%
          onProgress(progress);
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Combine all chunks into a single ArrayBuffer
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result.buffer;
  }

  // Sequencing extraction methods for SCORM 2004
  private extractSequencing(sequencingElement: any): any {
    if (!sequencingElement) {
      return undefined;
    }

    return {
      id: sequencingElement.id || sequencingElement.$?.id,
      controlMode: this.extractControlMode(sequencingElement.controlmode || sequencingElement.controlMode),
      sequencingRules: this.extractSequencingRules(sequencingElement.sequencingrules || sequencingElement.sequencingRules),
      limitConditions: this.extractLimitConditions(sequencingElement.limitconditions || sequencingElement.limitConditions),
      auxiliaryResources: this.extractAuxiliaryResources(sequencingElement.auxiliaryresources || sequencingElement.auxiliaryResources),
      rollupRules: this.extractRollupRules(sequencingElement.rolluprules || sequencingElement.rollupRules),
      objectives: this.extractObjectives(sequencingElement.objectives),
      randomizationControls: this.extractRandomizationControls(sequencingElement.randomizationcontrols || sequencingElement.randomizationControls),
      deliveryControls: this.extractDeliveryControls(sequencingElement.deliverycontrols || sequencingElement.deliveryControls),
      constrainedChoiceConsiderations: this.extractConstrainedChoiceConsiderations(sequencingElement.constrainedchoiceconsiderations),
      rollupConsiderations: this.extractRollupConsiderations(sequencingElement.rollupconsiderations),
    };
  }

  private extractControlMode(controlModeElement: any): any {
    if (!controlModeElement) {
      return undefined;
    }

    return {
      choice: this.parseBoolean(controlModeElement.choice),
      choiceExit: this.parseBoolean(controlModeElement.choiceexit || controlModeElement.choiceExit),
      flow: this.parseBoolean(controlModeElement.flow),
      forwardOnly: this.parseBoolean(controlModeElement.forwardonly || controlModeElement.forwardOnly),
      useCurrentAttemptObjectiveInfo: this.parseBoolean(controlModeElement.usecurrentattemptobjectiveinfo),
      useCurrentAttemptProgressInfo: this.parseBoolean(controlModeElement.usecurrentattemptprogressinfo),
    };
  }

  private extractSequencingRules(rulesElement: any): any {
    if (!rulesElement) {
      return undefined;
    }

    return {
      preConditionRule: this.extractRules(rulesElement.preconditionrule || rulesElement.preConditionRule),
      exitConditionRule: this.extractRules(rulesElement.exitconditionrule || rulesElement.exitConditionRule),
      postConditionRule: this.extractRules(rulesElement.postconditionrule || rulesElement.postConditionRule),
    };
  }

  private extractRules(rulesElement: any): any[] {
    if (!rulesElement) {
      return [];
    }

    const rulesArray = Array.isArray(rulesElement) ? rulesElement : [rulesElement];
    return rulesArray.map(rule => ({
      conditionCombination: rule.conditioncombination || rule.conditionCombination || "all",
      action: rule.action,
      ruleConditions: this.extractRuleConditions(rule.ruleconditions || rule.ruleConditions),
    }));
  }

  private extractRuleConditions(conditionsElement: any): any[] {
    if (!conditionsElement) {
      return [];
    }

    const conditionArray = Array.isArray(conditionsElement) ? conditionsElement : [conditionsElement];
    return conditionArray.map(condition => ({
      condition: condition.condition,
      operator: condition.operator,
      measureThreshold: condition.measurethreshold ? parseFloat(condition.measurethreshold) : undefined,
      referenceObjective: condition.referenceobjective || condition.referenceObjective,
    }));
  }

  private extractLimitConditions(limitElement: any): any {
    if (!limitElement) {
      return undefined;
    }

    return {
      attemptLimit: limitElement.attemptlimit ? parseInt(limitElement.attemptlimit) : undefined,
      attemptAbsoluteDurationLimit: limitElement.attemptabsolutedurationlimit,
      attemptExperiencedDurationLimit: limitElement.attemptexperienceddurationlimit,
      activityAbsoluteDurationLimit: limitElement.activityabsolutedurationlimit,
      activityExperiencedDurationLimit: limitElement.activityexperienceddurationlimit,
      beginTimeLimit: limitElement.begintimelimit,
      endTimeLimit: limitElement.endtimelimit,
    };
  }

  private extractAuxiliaryResources(auxElement: any): any[] {
    if (!auxElement) {
      return [];
    }

    const auxArray = Array.isArray(auxElement) ? auxElement : [auxElement];
    return auxArray.map(aux => ({
      id: aux.id,
      purpose: aux.purpose,
      resourceIdentifier: aux.resourceidentifier || aux.resourceIdentifier,
    }));
  }

  private extractRollupRules(rollupElement: any): any {
    if (!rollupElement) {
      return undefined;
    }

    return {
      rollupRule: this.extractRollupRuleArray(rollupElement.rolluprule || rollupElement.rollupRule),
    };
  }

  private extractRollupRuleArray(rulesElement: any): any[] {
    if (!rulesElement) {
      return [];
    }

    const rulesArray = Array.isArray(rulesElement) ? rulesElement : [rulesElement];
    return rulesArray.map(rule => ({
      objectiveRollup: this.parseBoolean(rule.objectiverollup || rule.objectiveRollup),
      measureRollup: this.parseBoolean(rule.measurerollup || rule.measureRollup),
      action: rule.action,
      conditionCombination: rule.conditioncombination || rule.conditionCombination || "all",
      conditions: this.extractRuleConditions(rule.conditions),
    }));
  }

  private extractObjectives(objectivesElement: any): any {
    if (!objectivesElement) {
      return undefined;
    }

    return {
      primaryObjective: this.extractObjective(objectivesElement.primaryobjective || objectivesElement.primaryObjective),
      objective: this.extractObjectiveArray(objectivesElement.objective),
    };
  }

  private extractObjective(objElement: any): any {
    if (!objElement) {
      return undefined;
    }

    return {
      objectiveID: objElement.objectiveid || objElement.objectiveID,
      satisfiedByMeasure: this.parseBoolean(objElement.satisfiedbymeasure || objElement.satisfiedByMeasure),
      minNormalizedMeasure: objElement.minneasure ? parseFloat(objElement.minneasure) : undefined,
      mapInfo: this.extractMapInfo(objElement.mapinfo || objElement.mapInfo),
    };
  }

  private extractObjectiveArray(objElement: any): any[] {
    if (!objElement) {
      return [];
    }

    const objArray = Array.isArray(objElement) ? objElement : [objElement];
    return objArray.map(obj => this.extractObjective(obj));
  }

  private extractMapInfo(mapElement: any): any[] {
    if (!mapElement) {
      return [];
    }

    const mapArray = Array.isArray(mapElement) ? mapElement : [mapElement];
    return mapArray.map(map => ({
      targetObjectiveID: map.targetobjectiveid || map.targetObjectiveID,
      readSatisfiedStatus: this.parseBoolean(map.readsatisfiedstatus || map.readSatisfiedStatus),
      readNormalizedMeasure: this.parseBoolean(map.readnormalizedmeasure || map.readNormalizedMeasure),
      writeSatisfiedStatus: this.parseBoolean(map.writesatisfiedstatus || map.writeSatisfiedStatus),
      writeNormalizedMeasure: this.parseBoolean(map.writenormalizedmeasure || map.writeNormalizedMeasure),
    }));
  }

  private extractRandomizationControls(randomElement: any): any {
    if (!randomElement) {
      return undefined;
    }

    return {
      randomizationTiming: randomElement.randomizationtiming || randomElement.randomizationTiming,
      selectCount: randomElement.selectcount ? parseInt(randomElement.selectcount) : undefined,
      reorderChildren: this.parseBoolean(randomElement.reorderchildren || randomElement.reorderChildren),
      selectionTiming: randomElement.selectiontiming || randomElement.selectionTiming,
    };
  }

  private extractDeliveryControls(deliveryElement: any): any {
    if (!deliveryElement) {
      return undefined;
    }

    return {
      tracked: this.parseBoolean(deliveryElement.tracked),
      completionSetByContent: this.parseBoolean(deliveryElement.completionsetbycontent || deliveryElement.completionSetByContent),
      objectiveSetByContent: this.parseBoolean(deliveryElement.objectivesetbycontent || deliveryElement.objectiveSetByContent),
    };
  }

  private extractConstrainedChoiceConsiderations(constrainedElement: any): any {
    if (!constrainedElement) {
      return undefined;
    }

    return {
      preventActivation: this.parseBoolean(constrainedElement.preventactivation || constrainedElement.preventActivation),
      constrainChoice: this.parseBoolean(constrainedElement.constrainchoice || constrainedElement.constrainChoice),
    };
  }

  private extractRollupConsiderations(rollupElement: any): any {
    if (!rollupElement) {
      return undefined;
    }

    return {
      requiredForSatisfied: rollupElement.requiredforsatisfied || rollupElement.requiredForSatisfied,
      requiredForNotSatisfied: rollupElement.requiredfornotsatisfied || rollupElement.requiredForNotSatisfied,
      requiredForCompleted: rollupElement.requiredforcompleted || rollupElement.requiredForCompleted,
      requiredForIncomplete: rollupElement.requiredforincomplete || rollupElement.requiredForIncomplete,
      measureSatisfactionIfActive: this.parseBoolean(rollupElement.measuresatisfactionifactive),
    };
  }

  private extractPresentation(presentationElement: any): any {
    if (!presentationElement) {
      return undefined;
    }

    return {
      navigationInterface: this.extractNavigationInterface(presentationElement.navigationinterface || presentationElement.navigationInterface),
    };
  }

  private extractNavigationInterface(navElement: any): any {
    if (!navElement) {
      return undefined;
    }

    const hideLMSUI = navElement.hidelmsui || navElement.hideLMSUI;
    return {
      hideLMSUI: hideLMSUI ? (Array.isArray(hideLMSUI) ? hideLMSUI : [hideLMSUI]) : undefined,
    };
  }

  private extractMetadata(metadataElement: any): any {
    if (!metadataElement) {
      return undefined;
    }

    return {
      schema: metadataElement.schema,
      schemaversion: metadataElement.schemaversion,
      lom: metadataElement.lom,
    };
  }

  private parseBoolean(value: any): boolean | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      return value.toLowerCase() === "true";
    }
    return undefined;
  }
}
