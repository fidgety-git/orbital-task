import { describe, expect, it } from "vitest";
import {
	DuplicateFilenameError,
	isDuplicateFilenameError,
} from "./upload-errors";

describe("DuplicateFilenameError", () => {
	it("stores filename metadata and a default message", () => {
		const error = new DuplicateFilenameError("Lease.pdf", "doc-1");

		expect(error.code).toBe("duplicate_filename");
		expect(error.filename).toBe("Lease.pdf");
		expect(error.existingDocumentId).toBe("doc-1");
		expect(error.message).toContain("Lease.pdf");
	});
});

describe("isDuplicateFilenameError", () => {
	it("narrows duplicate filename errors", () => {
		const error = new DuplicateFilenameError("Lease.pdf");
		expect(isDuplicateFilenameError(error)).toBe(true);
	});

	it("returns false for other errors", () => {
		expect(isDuplicateFilenameError(new Error("nope"))).toBe(false);
	});
});
