import { Loader2, Upload } from "lucide-react";
import { type DragEvent, useCallback, useRef, useState } from "react";
import { pickPdfFiles, resetFileInput } from "../lib/upload-files";

interface DocumentUploadProps {
	onUpload: (files: File[]) => void;
	uploading?: boolean;
	label?: string;
}

export function DocumentUpload({
	onUpload,
	uploading = false,
	label = "Upload PDF documents",
}: DocumentUploadProps) {
	const [dragOver, setDragOver] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleDragOver = useCallback((e: DragEvent) => {
		e.preventDefault();
		setDragOver(true);
	}, []);

	const handleDragLeave = useCallback((e: DragEvent) => {
		e.preventDefault();
		setDragOver(false);
	}, []);

	const handleDrop = useCallback(
		(e: DragEvent) => {
			e.preventDefault();
			setDragOver(false);
			const files = pickPdfFiles(e.dataTransfer.files);
			if (files.length > 0) {
				onUpload(files);
			}
		},
		[onUpload],
	);

	const handleClick = useCallback(() => {
		fileInputRef.current?.click();
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

	return (
		<button
			type="button"
			className={`w-full max-w-md cursor-pointer rounded-xl border-2 border-dashed px-8 py-10 text-center transition-colors ${
				dragOver
					? "border-neutral-400 bg-neutral-100"
					: "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
			}`}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			onClick={handleClick}
		>
			<input
				ref={fileInputRef}
				type="file"
				accept=".pdf"
				multiple
				className="hidden"
				onChange={handleFileChange}
			/>

			{uploading ? (
				<div className="flex flex-col items-center">
					<Loader2 className="mb-3 h-10 w-10 animate-spin text-neutral-400" />
					<p className="text-sm font-medium text-neutral-600">
						Uploading documents...
					</p>
				</div>
			) : (
				<div className="flex flex-col items-center">
					<Upload className="mb-3 h-10 w-10 text-neutral-400" />
					<p className="text-sm font-medium text-neutral-600">{label}</p>
					<p className="mt-1 text-xs text-neutral-400">
						Click or drag and drop one or more PDFs
					</p>
				</div>
			)}
		</button>
	);
}
