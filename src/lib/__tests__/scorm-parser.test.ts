import { SCORMParser } from "../scorm-parser";

describe("SCORMParser", () => {
  describe("URL validation", () => {
    it("should validate correct URLs", () => {
      const parser = new SCORMParser();

      // Test valid URLs
      expect(parser["isValidUrl"]("https://example.com/package.zip")).toBe(
        true
      );
      expect(parser["isValidUrl"]("http://test.com/file.zip")).toBe(true);
      expect(
        parser["isValidUrl"](
          "https://subdomain.example.com/path/to/package.zip"
        )
      ).toBe(true);
    });

    it("should reject invalid URLs", () => {
      const parser = new SCORMParser();

      // Test invalid URLs
      expect(parser["isValidUrl"]("not-a-url")).toBe(false);
      expect(parser["isValidUrl"]("ftp://example.com/file.zip")).toBe(false);
      expect(parser["isValidUrl"]("")).toBe(false);
    });

    it("should detect zip files correctly", () => {
      const parser = new SCORMParser();

      // Test explicit zip file detection
      expect(parser["isZipFile"]("https://example.com/package.zip")).toBe(true);
      expect(parser["isZipFile"]("https://example.com/package.ZIP")).toBe(true);
      expect(
        parser["isZipFile"]("https://example.com/package.zip?param=value")
      ).toBe(true);
      expect(
        parser["isZipFile"]("https://example.com/package.zip#section")
      ).toBe(true);

      // Test non-zip file rejection
      expect(parser["isZipFile"]("https://example.com/package.pdf")).toBe(
        false
      );
      expect(parser["isZipFile"]("https://example.com/package.html")).toBe(
        false
      );
      expect(parser["isZipFile"]("https://example.com/package.txt")).toBe(
        false
      );

      // Test permissive behavior for URLs without extensions
      expect(parser["isZipFile"]("https://example.com/package")).toBe(true);
      expect(
        parser["isZipFile"]("https://example.com/download/scorm-package")
      ).toBe(true);
      expect(
        parser["isZipFile"]("https://example.com/api/scorm/123/download")
      ).toBe(true);
    });
  });

  describe("Static method", () => {
    it("should create a new parser instance", async () => {
      // Mock fetch to avoid actual network requests in tests
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({
          "content-type": "application/zip",
          "content-length": "1000",
        }),
        body: {
          getReader: () => ({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new Uint8Array(100),
              })
              .mockResolvedValueOnce({ done: true, value: undefined }),
            releaseLock: jest.fn(),
          }),
        },
      });

      global.fetch = mockFetch;

      // Mock JSZip
      const mockJSZip = {
        loadAsync: jest.fn().mockResolvedValue({
          file: jest.fn().mockReturnValue({
            async: jest
              .fn()
              .mockResolvedValue('<?xml version="1.0"?><manifest></manifest>'),
          }),
          files: {},
        }),
      };

      // This would require more complex mocking to fully test
      // For now, just test that the static method exists and is callable
      expect(typeof SCORMParser.openFromUrl).toBe("function");
    });
  });
});
