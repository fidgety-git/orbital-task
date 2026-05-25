import { useCallback } from "react";
import { ChatSidebar } from "./components/ChatSidebar";
import { ChatWindow } from "./components/ChatWindow";
import { DocumentNameConflictDialog } from "./components/DocumentNameConflictDialog";
import { DocumentRemoveDialog } from "./components/DocumentRemoveDialog";
import { DocumentViewer } from "./components/DocumentViewer";
import { TooltipProvider } from "./components/ui/tooltip";
import { useConversations } from "./hooks/use-conversations";
import { useDocuments } from "./hooks/use-documents";
import { useMessages } from "./hooks/use-messages";

export default function App() {
	const {
		conversations,
		selectedId,
		loading: conversationsLoading,
		create,
		select,
		remove,
		refresh: refreshConversations,
	} = useConversations();

	const {
		messages,
		loading: messagesLoading,
		error: messagesError,
		streaming,
		streamingContent,
		send,
	} = useMessages(selectedId);

	const {
		documents,
		selectedDocument,
		uploading,
		removing,
		error: documentsError,
		upload,
		nameConflict,
		documentToRemove,
		resolveNameConflict,
		cancelNameConflict,
		requestRemove,
		cancelRemove,
		confirmRemove,
		selectDocument,
		refresh: refreshDocuments,
	} = useDocuments(selectedId);

	const handleSend = useCallback(
		async (content: string) => {
			await send(content);
			refreshConversations();
		},
		[send, refreshConversations],
	);

	const handleUpload = useCallback(
		async (files: File[]) => {
			const uploaded = await upload(files);
			if (uploaded) {
				refreshDocuments();
				refreshConversations();
			}
		},
		[upload, refreshDocuments, refreshConversations],
	);

	const handleResolveNameConflict = useCallback(
		async (file: File, filename: string) => {
			const doc = await resolveNameConflict(file, filename);
			if (doc) {
				refreshDocuments();
				refreshConversations();
			}
		},
		[resolveNameConflict, refreshDocuments, refreshConversations],
	);

	const handleConfirmRemove = useCallback(async () => {
		const removed = await confirmRemove();
		if (removed) {
			refreshDocuments();
			refreshConversations();
		}
	}, [confirmRemove, refreshDocuments, refreshConversations]);

	const handleCreate = useCallback(async () => {
		await create();
	}, [create]);

	return (
		<TooltipProvider delayDuration={200}>
			<div className="flex h-screen bg-neutral-50">
				<ChatSidebar
					conversations={conversations}
					selectedId={selectedId}
					loading={conversationsLoading}
					onSelect={select}
					onCreate={handleCreate}
					onDelete={remove}
				/>

				<ChatWindow
					messages={messages}
					loading={messagesLoading}
					error={messagesError ?? documentsError}
					streaming={streaming}
					streamingContent={streamingContent}
					documents={documents}
					uploading={uploading}
					conversationId={selectedId}
					onSend={handleSend}
					onUpload={handleUpload}
					onSelectDocument={selectDocument}
				/>

				<DocumentViewer
					documents={documents}
					selectedDocument={selectedDocument}
					onSelectDocument={selectDocument}
					onRemoveDocument={requestRemove}
				/>

				<DocumentNameConflictDialog
					conflict={nameConflict}
					existingFilenames={documents.map((doc) => doc.filename)}
					onCancel={cancelNameConflict}
					onConfirm={handleResolveNameConflict}
				/>

				<DocumentRemoveDialog
					document={documentToRemove}
					removing={removing}
					onCancel={cancelRemove}
					onConfirm={handleConfirmRemove}
				/>
			</div>
		</TooltipProvider>
	);
}
