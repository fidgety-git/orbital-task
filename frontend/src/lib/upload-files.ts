const PDF_MIME_TYPES = new Set(["application/pdf", "application/x-pdf"]);

export function isPdfFile(file: File): boolean {
	return (
		PDF_MIME_TYPES.has(file.type) || file.name.toLowerCase().endsWith(".pdf")
	);
}

export function normalizeUploadFiles(input: File | File[]): File[] {
	const files = Array.isArray(input) ? input : [input];
	return files.filter(isPdfFile);
}

export function pickPdfFiles(fileList: FileList | null): File[] {
	if (!fileList) return [];
	return normalizeUploadFiles(Array.from(fileList));
}

export function resetFileInput(input: HTMLInputElement | null): void {
	if (input) input.value = "";
}
