import { describe, expect, it } from "vitest";
import { isPdfFile, normalizeUploadFiles } from "./upload-files";

describe("upload-files", () => {
	it("filters non-pdf files", () => {
		const pdf = new File(["content"], "lease.pdf", { type: "application/pdf" });
		const text = new File(["content"], "notes.txt", { type: "text/plain" });

		expect(normalizeUploadFiles([pdf, text])).toEqual([pdf]);
	});

	it("accepts pdf files by extension when mime type is missing", () => {
		const file = new File(["content"], "lease.pdf", { type: "" });

		expect(isPdfFile(file)).toBe(true);
		expect(normalizeUploadFiles(file)).toEqual([file]);
	});
});
