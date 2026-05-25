export interface DocumentNameConflict {
	file: File;
	conflictingFilename: string;
}

export class DuplicateFilenameError extends Error {
	readonly code = "duplicate_filename" as const;
	readonly filename: string;
	readonly existingDocumentId?: string;

	constructor(filename: string, existingDocumentId?: string, message?: string) {
		super(
			message ??
				`A document with the same name "${filename}" is already in this conversation.`,
		);
		this.name = "DuplicateFilenameError";
		this.filename = filename;
		this.existingDocumentId = existingDocumentId;
	}
}

export function isDuplicateFilenameError(
	error: unknown,
): error is DuplicateFilenameError {
	return error instanceof DuplicateFilenameError;
}
