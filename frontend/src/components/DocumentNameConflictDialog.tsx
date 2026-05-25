import { useEffect, useMemo, useState } from "react";
import {
	hasFilenameConflict,
	suggestRename,
	validatePdfFilename,
} from "../lib/document-filename";
import type { DocumentNameConflict } from "../lib/upload-errors";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";

interface DocumentNameConflictDialogProps {
	conflict: DocumentNameConflict | null;
	existingFilenames: string[];
	onCancel: () => void;
	onConfirm: (file: File, filename: string) => void;
}

export function DocumentNameConflictDialog({
	conflict,
	existingFilenames,
	onCancel,
	onConfirm,
}: DocumentNameConflictDialogProps) {
	const [filename, setFilename] = useState("");
	const [validationError, setValidationError] = useState<string | null>(null);

	const suggestedName = useMemo(() => {
		if (!conflict) return "";
		return suggestRename(conflict.conflictingFilename, existingFilenames);
	}, [conflict, existingFilenames]);

	useEffect(() => {
		if (conflict) {
			setFilename(suggestedName);
			setValidationError(null);
		}
	}, [conflict, suggestedName]);

	const handleConfirm = () => {
		if (!conflict) return;

		const formatError = validatePdfFilename(filename);
		if (formatError) {
			setValidationError(formatError);
			return;
		}

		if (hasFilenameConflict(existingFilenames, filename)) {
			setValidationError("This filename is already used in this conversation.");
			return;
		}

		const renamedFile = new File([conflict.file], filename, {
			type: conflict.file.type,
		});
		onConfirm(renamedFile, filename);
	};

	return (
		<Dialog
			open={conflict !== null}
			onOpenChange={(open) => {
				if (!open) onCancel();
			}}
		>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Document name already in use</DialogTitle>
					<DialogDescription>
						{conflict ? (
							<>
								This conversation already includes{" "}
								<span className="font-medium text-neutral-700">
									{conflict.conflictingFilename}
								</span>
								. Rename the new file to upload it, or cancel to keep your
								current documents unchanged.
							</>
						) : null}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-2">
					<label
						htmlFor="document-rename"
						className="text-sm font-medium text-neutral-700"
					>
						Upload as
					</label>
					<input
						id="document-rename"
						type="text"
						value={filename}
						onChange={(e) => {
							setFilename(e.target.value);
							setValidationError(null);
						}}
						className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
					/>
					{validationError && (
						<p className="text-xs text-red-600">{validationError}</p>
					)}
				</div>

				<div className="flex justify-end gap-2 pt-2">
					<Button variant="ghost" onClick={onCancel}>
						Cancel
					</Button>
					<Button onClick={handleConfirm}>Upload with new name</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
