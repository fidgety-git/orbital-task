import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as api from "../lib/api";
import { hasFilenameConflict } from "../lib/document-filename";
import {
	type DocumentNameConflict,
	isDuplicateFilenameError,
} from "../lib/upload-errors";
import { normalizeUploadFiles } from "../lib/upload-files";
import type { Document } from "../types";

export function useDocuments(conversationId: string | null) {
	const [documents, setDocuments] = useState<Document[]>([]);
	const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
		null,
	);
	const [uploading, setUploading] = useState(false);
	const [removing, setRemoving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [nameConflict, setNameConflict] = useState<DocumentNameConflict | null>(
		null,
	);
	const [documentToRemove, setDocumentToRemove] = useState<Document | null>(
		null,
	);
	const pendingUploadsRef = useRef<File[]>([]);
	const processingUploadsRef = useRef(false);

	const refresh = useCallback(async () => {
		if (!conversationId) {
			setDocuments([]);
			setSelectedDocumentId(null);
			return;
		}
		try {
			setError(null);
			const detail = await api.fetchConversation(conversationId);
			const docs = detail.documents ?? [];
			setDocuments(docs);
			setSelectedDocumentId((current) => {
				if (current && docs.some((doc) => doc.id === current)) {
					return current;
				}
				return docs[0]?.id ?? null;
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load documents");
		}
	}, [conversationId]);

	useEffect(() => {
		setNameConflict(null);
		setDocumentToRemove(null);
		pendingUploadsRef.current = [];
		refresh();
	}, [refresh]);

	const performUpload = useCallback(
		async (
			file: File,
			filename?: string,
		): Promise<Document | "conflict" | null> => {
			if (!conversationId) return null;
			setError(null);
			try {
				const doc = await api.uploadDocument(conversationId, file, filename);
				setDocuments((prev) => [...prev, doc]);
				setSelectedDocumentId(doc.id);
				return doc;
			} catch (err) {
				if (isDuplicateFilenameError(err)) {
					setNameConflict({
						file,
						conflictingFilename: err.filename,
					});
					return "conflict";
				}
				setError(
					err instanceof Error ? err.message : "Failed to upload document",
				);
				return null;
			}
		},
		[conversationId],
	);

	const processUploadQueue = useCallback(async () => {
		if (processingUploadsRef.current || !conversationId) return false;

		processingUploadsRef.current = true;
		setUploading(true);
		let uploadedAny = false;
		const knownFilenames = documents.map((doc) => doc.filename);

		try {
			while (pendingUploadsRef.current.length > 0) {
				const file = pendingUploadsRef.current[0];
				if (!file) {
					pendingUploadsRef.current.shift();
					continue;
				}
				const displayName = file.name.trim();
				const queuedNames = pendingUploadsRef.current
					.slice(1)
					.map((queued) => queued.name);

				if (
					hasFilenameConflict([...knownFilenames, ...queuedNames], displayName)
				) {
					setNameConflict({
						file,
						conflictingFilename: displayName,
					});
					break;
				}

				const result = await performUpload(file);
				if (result === "conflict") break;
				if (!result) {
					pendingUploadsRef.current.shift();
					continue;
				}

				pendingUploadsRef.current.shift();
				knownFilenames.push(result.filename);
				uploadedAny = true;
			}
		} finally {
			processingUploadsRef.current = false;
			if (pendingUploadsRef.current.length === 0) {
				setUploading(false);
			}
		}

		return uploadedAny;
	}, [conversationId, documents, performUpload]);

	const upload = useCallback(
		async (input: File | File[]) => {
			if (!conversationId) return false;

			const files = normalizeUploadFiles(input);
			if (files.length === 0) return false;

			pendingUploadsRef.current.push(...files);
			return processUploadQueue();
		},
		[conversationId, processUploadQueue],
	);

	const resolveNameConflict = useCallback(
		async (file: File, filename: string) => {
			const trimmed = filename.trim();
			const knownFilenames = [
				...documents.map((doc) => doc.filename),
				...pendingUploadsRef.current.slice(1).map((queued) => queued.name),
			];

			if (hasFilenameConflict(knownFilenames, trimmed)) {
				setNameConflict({
					file,
					conflictingFilename: trimmed,
				});
				return null;
			}

			setNameConflict(null);
			setUploading(true);
			const result = await performUpload(file, trimmed);
			if (result && result !== "conflict") {
				pendingUploadsRef.current.shift();
				await processUploadQueue();
			}
			return result && result !== "conflict" ? result : null;
		},
		[documents, performUpload, processUploadQueue],
	);

	const cancelNameConflict = useCallback(() => {
		setNameConflict(null);
		pendingUploadsRef.current.shift();
		void processUploadQueue();
	}, [processUploadQueue]);

	const requestRemove = useCallback(
		(documentId: string) => {
			const doc = documents.find((item) => item.id === documentId);
			if (doc) setDocumentToRemove(doc);
		},
		[documents],
	);

	const cancelRemove = useCallback(() => {
		if (!removing) setDocumentToRemove(null);
	}, [removing]);

	const confirmRemove = useCallback(async () => {
		if (!documentToRemove) return false;

		setRemoving(true);
		setError(null);
		const documentId = documentToRemove.id;

		try {
			await api.deleteDocument(documentId);
			setDocuments((prev) => {
				const next = prev.filter((item) => item.id !== documentId);
				setSelectedDocumentId((current) => {
					if (current !== documentId) return current;
					const deletedIndex = prev.findIndex((item) => item.id === documentId);
					const nextIndex = Math.min(deletedIndex, next.length - 1);
					return next[nextIndex]?.id ?? null;
				});
				return next;
			});
			setDocumentToRemove(null);
			return true;
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to remove document",
			);
			return false;
		} finally {
			setRemoving(false);
		}
	}, [documentToRemove]);

	const selectDocument = useCallback((id: string) => {
		setSelectedDocumentId(id);
	}, []);

	const selectedDocument = useMemo(
		() =>
			documents.find((doc) => doc.id === selectedDocumentId) ??
			documents[0] ??
			null,
		[documents, selectedDocumentId],
	);

	return {
		documents,
		selectedDocument,
		uploading,
		removing,
		error,
		nameConflict,
		documentToRemove,
		upload,
		resolveNameConflict,
		cancelNameConflict,
		requestRemove,
		cancelRemove,
		confirmRemove,
		selectDocument,
		refresh,
	};
}
