export function filterDocumentsByQuery<T extends { filename: string }>(
	documents: T[],
	query: string,
): T[] {
	const normalized = query.trim().toLowerCase();
	if (!normalized) return documents;
	return documents.filter((doc) =>
		doc.filename.toLowerCase().includes(normalized),
	);
}

export function hasFilenameConflict(
	existingFilenames: string[],
	filename: string,
): boolean {
	const normalized = filename.trim().toLowerCase();
	return existingFilenames.some((name) => name.toLowerCase() === normalized);
}

export function suggestRename(
	filename: string,
	existingFilenames: string[],
): string {
	const existing = new Set(existingFilenames.map((name) => name.toLowerCase()));
	const trimmed = filename.trim();
	if (!hasFilenameConflict(existingFilenames, trimmed)) {
		return trimmed;
	}

	const dotIndex = trimmed.lastIndexOf(".");
	const ext = dotIndex > 0 ? trimmed.slice(dotIndex) : ".pdf";
	const base = dotIndex > 0 ? trimmed.slice(0, dotIndex) : trimmed;

	for (let i = 2; i < 100; i += 1) {
		const candidate = `${base} (${i})${ext}`;
		if (!existing.has(candidate.toLowerCase())) {
			return candidate;
		}
	}

	return `${base} (${Date.now()})${ext}`;
}

export function validatePdfFilename(filename: string): string | null {
	const trimmed = filename.trim();
	if (!trimmed) return "Filename is required.";
	if (!trimmed.toLowerCase().endsWith(".pdf")) {
		return "Filename must end with .pdf";
	}
	if (/[\\/]/.test(trimmed)) {
		return "Filename cannot contain path separators.";
	}
	return null;
}
