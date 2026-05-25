import { describe, expect, it } from "vitest";
import {
	hasFilenameConflict,
	suggestRename,
	validatePdfFilename,
} from "./document-filename";

describe("hasFilenameConflict", () => {
	it("detects case-insensitive duplicates", () => {
		expect(hasFilenameConflict(["Lease.pdf"], "lease.pdf")).toBe(true);
	});

	it("returns false when the name is unique", () => {
		expect(hasFilenameConflict(["Lease.pdf"], "Title Report.pdf")).toBe(false);
	});
});

describe("suggestRename", () => {
	it("returns the original name when there is no conflict", () => {
		expect(suggestRename("New Doc.pdf", ["Lease.pdf"])).toBe("New Doc.pdf");
	});

	it("appends a numeric suffix when the name collides", () => {
		expect(suggestRename("Lease.pdf", ["Lease.pdf"])).toBe("Lease (2).pdf");
	});

	it("skips taken numeric suffixes", () => {
		const existing = ["Lease.pdf", "Lease (2).pdf"];
		expect(suggestRename("Lease.pdf", existing)).toBe("Lease (3).pdf");
	});
});

describe("validatePdfFilename", () => {
	it("rejects empty filenames", () => {
		expect(validatePdfFilename("   ")).toBe("Filename is required.");
	});

	it("requires a .pdf extension", () => {
		expect(validatePdfFilename("Lease.doc")).toBe(
			"Filename must end with .pdf",
		);
	});

	it("rejects path separators", () => {
		expect(validatePdfFilename("../Lease.pdf")).toBe(
			"Filename cannot contain path separators.",
		);
	});

	it("accepts valid filenames", () => {
		expect(validatePdfFilename("Commercial Lease.pdf")).toBeNull();
	});
});
