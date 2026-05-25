import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as api from "../lib/api";
import { normalizeUploadFiles } from "../lib/upload-files";
import type { Document } from "../types";

export function useDocuments(conversationId: string | null) {
	const [documents, setDocuments] = useState<Document[]>([]);
	const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
		null,
	);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
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
		pendingUploadsRef.current = [];
		refresh();
	}, [refresh]);

	const processUploadQueue = useCallback(async () => {
		if (processingUploadsRef.current || !conversationId) return false;

		processingUploadsRef.current = true;
		setUploading(true);
		let uploadedAny = false;

		try {
			while (pendingUploadsRef.current.length > 0) {
				const file = pendingUploadsRef.current[0];
				if (!file) {
					pendingUploadsRef.current.shift();
					continue;
				}

				try {
					setError(null);
					const doc = await api.uploadDocument(conversationId, file);
					setDocuments((prev) => [...prev, doc]);
					setSelectedDocumentId(doc.id);
					pendingUploadsRef.current.shift();
					uploadedAny = true;
				} catch (err) {
					setError(
						err instanceof Error ? err.message : "Failed to upload document",
					);
					pendingUploadsRef.current.shift();
				}
			}
		} finally {
			processingUploadsRef.current = false;
			setUploading(false);
		}

		return uploadedAny;
	}, [conversationId]);

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
		error,
		upload,
		selectDocument,
		refresh,
	};
}
