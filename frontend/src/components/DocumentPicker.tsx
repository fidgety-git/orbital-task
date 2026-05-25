import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	FileText,
	Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Document } from "../types";
import { Button } from "./ui/button";

interface DocumentPickerProps {
	documents: Document[];
	selectedDocument: Document | null;
	onSelectDocument: (id: string) => void;
}

function filterDocumentsByQuery(
	documents: Document[],
	query: string,
): Document[] {
	const normalized = query.trim().toLowerCase();
	if (!normalized) return documents;
	return documents.filter((doc) =>
		doc.filename.toLowerCase().includes(normalized),
	);
}

export function DocumentPicker({
	documents,
	selectedDocument,
	onSelectDocument,
}: DocumentPickerProps) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);

	const selectedIndex = useMemo(
		() =>
			selectedDocument
				? documents.findIndex((doc) => doc.id === selectedDocument.id)
				: -1,
		[documents, selectedDocument],
	);

	const filteredDocuments = useMemo(
		() => filterDocumentsByQuery(documents, query),
		[documents, query],
	);

	const goToDocument = useCallback(
		(index: number) => {
			const doc = documents[index];
			if (doc) onSelectDocument(doc.id);
		},
		[documents, onSelectDocument],
	);

	const goPrev = useCallback(() => {
		if (selectedIndex > 0) goToDocument(selectedIndex - 1);
	}, [selectedIndex, goToDocument]);

	const goNext = useCallback(() => {
		if (selectedIndex >= 0 && selectedIndex < documents.length - 1) {
			goToDocument(selectedIndex + 1);
		}
	}, [selectedIndex, documents.length, goToDocument]);

	useEffect(() => {
		if (!open) return;

		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [open]);

	useEffect(() => {
		if (open) {
			setQuery("");
			requestAnimationFrame(() => searchRef.current?.focus());
		}
	}, [open]);

	if (!selectedDocument) return null;

	const hasMultiple = documents.length > 1;
	const positionLabel = hasMultiple
		? `${selectedIndex + 1} of ${documents.length}`
		: null;

	return (
		<div
			ref={containerRef}
			className="relative border-b border-neutral-100 px-3 py-2.5"
		>
			<div className="flex items-center gap-1">
				{hasMultiple && (
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 flex-shrink-0"
						disabled={selectedIndex <= 0}
						onClick={goPrev}
						title="Previous document"
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
				)}

				<button
					type="button"
					onClick={() => setOpen((current) => !current)}
					className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-neutral-50"
				>
					<FileText className="h-4 w-4 flex-shrink-0 text-neutral-400" />
					<span className="min-w-0 flex-1">
						<span className="block truncate text-sm font-medium text-neutral-800">
							{selectedDocument.filename}
						</span>
						<span className="block text-xs text-neutral-400">
							{selectedDocument.page_count} page
							{selectedDocument.page_count !== 1 ? "s" : ""}
							{positionLabel ? ` · ${positionLabel}` : ""}
						</span>
					</span>
					<ChevronDown
						className={`h-4 w-4 flex-shrink-0 text-neutral-400 transition-transform ${
							open ? "rotate-180" : ""
						}`}
					/>
				</button>

				{hasMultiple && (
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 flex-shrink-0"
						disabled={
							selectedIndex < 0 || selectedIndex >= documents.length - 1
						}
						onClick={goNext}
						title="Next document"
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				)}
			</div>

			{open && (
				<div className="absolute left-3 right-3 top-full z-30 mt-1 rounded-lg border border-neutral-200 bg-white shadow-lg">
					{hasMultiple && (
						<div className="flex items-center gap-2 border-b border-neutral-100 px-3 py-2">
							<Search className="h-3.5 w-3.5 text-neutral-400" />
							<input
								ref={searchRef}
								type="text"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Search documents…"
								className="w-full bg-transparent text-sm text-neutral-800 placeholder-neutral-400 outline-none"
							/>
						</div>
					)}

					<ul className="max-h-56 overflow-y-auto py-1">
						{filteredDocuments.length === 0 ? (
							<li className="px-3 py-2 text-xs text-neutral-500">
								No documents match your search
							</li>
						) : (
							filteredDocuments.map((doc) => {
								const isActive = doc.id === selectedDocument.id;
								const docIndex = documents.findIndex((d) => d.id === doc.id);
								return (
									<li key={doc.id}>
										<button
											type="button"
											className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm ${
												isActive
													? "bg-neutral-100 text-neutral-900"
													: "text-neutral-700 hover:bg-neutral-50"
											}`}
											onClick={() => {
												onSelectDocument(doc.id);
												setOpen(false);
											}}
										>
											<FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-400" />
											<span className="min-w-0 flex-1">
												<span className="block truncate font-medium">
													{doc.filename}
												</span>
												<span className="block text-xs text-neutral-400">
													{doc.page_count} page
													{doc.page_count !== 1 ? "s" : ""}
													{hasMultiple
														? ` · ${docIndex + 1} of ${documents.length}`
														: ""}
												</span>
											</span>
										</button>
									</li>
								);
							})
						)}
					</ul>
				</div>
			)}
		</div>
	);
}
