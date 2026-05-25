import type { Document } from "../types";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";

interface DocumentRemoveDialogProps {
	document: Document | null;
	removing?: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}

export function DocumentRemoveDialog({
	document,
	removing = false,
	onCancel,
	onConfirm,
}: DocumentRemoveDialogProps) {
	return (
		<Dialog
			open={document !== null}
			onOpenChange={(open) => {
				if (!open && !removing) onCancel();
			}}
		>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Remove document?</DialogTitle>
					<DialogDescription>
						{document ? (
							<>
								<span className="font-medium text-neutral-700">
									{document.filename}
								</span>{" "}
								will be removed from this conversation. You can upload it again
								later if needed. Chat history will be kept.
							</>
						) : null}
					</DialogDescription>
				</DialogHeader>

				<div className="flex justify-end gap-2 pt-2">
					<Button variant="ghost" disabled={removing} onClick={onCancel}>
						Cancel
					</Button>
					<Button
						variant="ghost"
						className="text-red-600 hover:bg-red-50 hover:text-red-700"
						disabled={removing}
						onClick={onConfirm}
					>
						{removing ? "Removing…" : "Remove document"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
