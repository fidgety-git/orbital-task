import { FileSearch, FileText } from "lucide-react";
import type { Document } from "../types";
import { DocumentUpload } from "./DocumentUpload";

interface EmptyStateProps {
	onUpload: (files: File[]) => void;
	uploading?: boolean;
	documents?: Document[];
	onSelectDocument?: (id: string) => void;
}

export function EmptyState({
	onUpload,
	uploading,
	documents = [],
	onSelectDocument,
}: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center px-4">
			<div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-900">
				<FileSearch className="h-7 w-7 text-white" />
			</div>
			<h2 className="mb-2 text-lg font-semibold text-neutral-800">
				{documents.length > 0
					? "Add more documents or ask a question"
					: "Upload documents to get started"}
			</h2>
			<p className="mb-8 max-w-sm text-center text-sm text-neutral-500">
				Ask questions across leases, title reports, contracts, and other legal
				documents in this deal
			</p>

			{documents.length > 0 && (
				<div className="mb-6 w-full max-w-md">
					<p className="mb-2 text-xs font-medium text-neutral-500">
						Uploaded documents
					</p>
					<ul className="space-y-1.5 rounded-lg border border-neutral-200 bg-neutral-50 p-2">
						{documents.map((doc) => (
							<li key={doc.id}>
								<button
									type="button"
									onClick={() => onSelectDocument?.(doc.id)}
									className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-neutral-700 hover:bg-white"
								>
									<FileText className="h-4 w-4 flex-shrink-0 text-neutral-400" />
									<span className="truncate">{doc.filename}</span>
									<span className="ml-auto flex-shrink-0 text-xs text-neutral-400">
										{doc.page_count} pg
									</span>
								</button>
							</li>
						))}
					</ul>
				</div>
			)}

			<DocumentUpload
				onUpload={onUpload}
				uploading={uploading}
				label={
					documents.length > 0 ? "Add more documents" : "Upload PDF documents"
				}
			/>
		</div>
	);
}
