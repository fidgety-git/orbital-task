import { Paperclip, SendHorizontal } from "lucide-react";
import {
	type CSSProperties,
	type KeyboardEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { filterDocumentsByQuery } from "../lib/document-filename";
import {
	type ComposerSegment,
	createEmptySegments,
	getActiveTextSegment,
	getMentionQuery,
	handleComposerBackspace,
	insertMentionInSegments,
	isComposerEmpty,
	removeMentionSegment,
	serializeSegments,
	updateActiveText,
} from "../lib/document-mentions";
import { pickPdfFiles, resetFileInput } from "../lib/upload-files";
import type { Document } from "../types";
import { DocumentMentionChip } from "./DocumentMentionChip";
import { DocumentMentionMenu } from "./DocumentMentionMenu";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface ChatInputProps {
	onSend: (content: string) => void;
	onUpload: (files: File[]) => void;
	disabled: boolean;
	documents: Document[];
	uploading?: boolean;
	onSelectDocument: (id: string) => void;
}

export function ChatInput({
	onSend,
	onUpload,
	disabled,
	documents,
	uploading = false,
	onSelectDocument,
}: ChatInputProps) {
	const [segments, setSegments] =
		useState<ComposerSegment[]>(createEmptySegments);
	const [mentionMenu, setMentionMenu] = useState<{
		query: string;
		start: number;
	} | null>(null);
	const [highlightIndex, setHighlightIndex] = useState(0);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const activeText = getActiveTextSegment(segments).value;
	const composerIsEmpty = isComposerEmpty(segments);

	const filteredDocuments = useMemo(() => {
		if (!mentionMenu) return [];
		return filterDocumentsByQuery(documents, mentionMenu.query);
	}, [documents, mentionMenu]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset menu selection when mention query opens or changes
	useEffect(() => {
		setHighlightIndex(0);
	}, [mentionMenu]);

	const updateMentionMenu = useCallback(
		(text: string, cursorPos: number) => {
			if (documents.length === 0) {
				setMentionMenu(null);
				return;
			}
			setMentionMenu(getMentionQuery(text, cursorPos));
		},
		[documents],
	);

	const focusTextarea = useCallback((cursorPos?: number) => {
		requestAnimationFrame(() => {
			const textarea = textareaRef.current;
			if (!textarea) return;
			textarea.focus();
			const pos = cursorPos ?? textarea.value.length;
			textarea.setSelectionRange(pos, pos);
		});
	}, []);

	const insertMention = useCallback(
		(doc: Document) => {
			if (!mentionMenu) return;

			const textarea = textareaRef.current;
			const cursorPos = textarea?.selectionStart ?? activeText.length;

			setSegments((prev) =>
				insertMentionInSegments(prev, doc, mentionMenu.start, cursorPos),
			);
			onSelectDocument(doc.id);
			setMentionMenu(null);
			focusTextarea(0);
		},
		[mentionMenu, activeText.length, onSelectDocument, focusTextarea],
	);

	const handleTextChange = useCallback(
		(text: string, cursorPos: number) => {
			setSegments((prev) => updateActiveText(prev, text));
			updateMentionMenu(text, cursorPos);
		},
		[updateMentionMenu],
	);

	const handleSend = useCallback(() => {
		const content = serializeSegments(segments);
		if (!content || disabled) return;
		onSend(content);
		setSegments(createEmptySegments());
		setMentionMenu(null);
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
		}
	}, [segments, disabled, onSend]);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (mentionMenu && filteredDocuments.length > 0) {
				if (e.key === "ArrowDown") {
					e.preventDefault();
					setHighlightIndex((i) => (i + 1) % filteredDocuments.length);
					return;
				}
				if (e.key === "ArrowUp") {
					e.preventDefault();
					setHighlightIndex(
						(i) =>
							(i - 1 + filteredDocuments.length) % filteredDocuments.length,
					);
					return;
				}
				if (e.key === "Enter" || e.key === "Tab") {
					e.preventDefault();
					const selected = filteredDocuments[highlightIndex];
					if (selected) insertMention(selected);
					return;
				}
				if (e.key === "Escape") {
					e.preventDefault();
					setMentionMenu(null);
					return;
				}
			}

			if (e.key === "Backspace") {
				const next = handleComposerBackspace(segments);
				if (next) {
					e.preventDefault();
					setSegments(next);
					setMentionMenu(null);
					focusTextarea();
					return;
				}
			}

			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSend();
			}
		},
		[
			mentionMenu,
			filteredDocuments,
			highlightIndex,
			insertMention,
			handleSend,
			segments,
			focusTextarea,
		],
	);

	const handleInput = useCallback(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;
		textarea.style.height = "auto";
		textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
	}, []);

	const handleFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const files = pickPdfFiles(e.target.files);
			if (files.length > 0) {
				onUpload(files);
			}
			resetFileInput(fileInputRef.current);
		},
		[onUpload],
	);

	const handleRemoveMention = useCallback(
		(index: number) => {
			setSegments((prev) => removeMentionSegment(prev, index));
			focusTextarea();
		},
		[focusTextarea],
	);

	return (
		<div className="p-3">
			<div className="relative flex items-end gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
				<Tooltip>
					<TooltipTrigger asChild>
						<div>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 flex-shrink-0"
								disabled={disabled || uploading}
								onClick={() => fileInputRef.current?.click()}
							>
								<Paperclip className="h-4 w-4 text-neutral-500" />
							</Button>
						</div>
					</TooltipTrigger>
					<TooltipContent>Add documents</TooltipContent>
				</Tooltip>

				<input
					ref={fileInputRef}
					type="file"
					accept=".pdf"
					multiple
					className="hidden"
					onChange={handleFileChange}
				/>

				<div className="relative min-w-0 flex-1">
					{mentionMenu && (
						<DocumentMentionMenu
							documents={filteredDocuments}
							highlightIndex={highlightIndex}
							onSelect={insertMention}
						/>
					)}

					<div
						className="relative flex min-h-[36px] w-full flex-wrap items-center gap-x-0.5 gap-y-1 py-1"
						onMouseDown={(event) => {
							if (event.target === event.currentTarget) {
								event.preventDefault();
								focusTextarea();
							}
						}}
					>
						{composerIsEmpty && (
							<span className="pointer-events-none absolute left-0 top-1.5 text-sm text-neutral-400">
								{documents.length > 0
									? "Ask a question… type @ to reference a document"
									: "Ask a question about your documents..."}
							</span>
						)}

						{segments.map((segment, index) => {
							if (segment.type === "mention") {
								return (
									<span key={`${segment.id}-${index}`} className="inline-flex">
										<DocumentMentionChip
											filename={segment.filename}
											onRemove={() => handleRemoveMention(index)}
										/>
									</span>
								);
							}

							const isActive = index === segments.length - 1;
							if (isActive) {
								return (
									<textarea
										key="text-active"
										ref={textareaRef}
										value={segment.value}
										onChange={(e) =>
											handleTextChange(e.target.value, e.target.selectionStart)
										}
										onSelect={(e) =>
											updateMentionMenu(
												e.currentTarget.value,
												e.currentTarget.selectionStart,
											)
										}
										onClick={(e) => e.stopPropagation()}
										onInput={handleInput}
										onKeyDown={handleKeyDown}
										rows={1}
										disabled={disabled}
										className="inline-block max-h-[200px] min-w-[1ch] flex-1 resize-none overflow-hidden border-none bg-transparent py-0 text-sm leading-6 text-neutral-800 outline-none"
										style={{ fieldSizing: "content" } as CSSProperties}
									/>
								);
							}

							if (!segment.value) return null;
							return (
								<span
									key={`text-${index}-${segment.value.length}`}
									className="whitespace-pre-wrap text-sm leading-6 text-neutral-800"
								>
									{segment.value}
								</span>
							);
						})}
					</div>
				</div>

				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 flex-shrink-0"
					disabled={composerIsEmpty || disabled}
					onClick={handleSend}
				>
					<SendHorizontal
						className={`h-4 w-4 ${
							!composerIsEmpty && !disabled
								? "text-neutral-900"
								: "text-neutral-300"
						}`}
					/>
				</Button>
			</div>
		</div>
	);
}
