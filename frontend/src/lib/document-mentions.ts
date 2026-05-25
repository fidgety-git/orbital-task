/** Token format stored in message content: @[filename](document:uuid) */
export const MENTION_TOKEN_REGEX = /@\[([^\]]+)\]\(document:([^)]+)\)/g;

export interface ParsedMention {
	filename: string;
	documentId: string;
	start: number;
	end: number;
}

export function parseMentionTokens(content: string): ParsedMention[] {
	const mentions: ParsedMention[] = [];
	for (const match of content.matchAll(MENTION_TOKEN_REGEX)) {
		const start = match.index;
		const filename = match[1];
		const documentId = match[2];
		if (start === undefined || !filename || !documentId) {
			continue;
		}
		mentions.push({
			filename,
			documentId,
			start,
			end: start + match[0].length,
		});
	}
	return mentions;
}

export function buildMentionToken(
	documentId: string,
	filename: string,
): string {
	return `@[${filename}](document:${documentId})`;
}

export type ComposerSegment =
	| { type: "text"; value: string }
	| { type: "mention"; id: string; filename: string };

export function createEmptySegments(): ComposerSegment[] {
	return [{ type: "text", value: "" }];
}

export function serializeSegments(segments: ComposerSegment[]): string {
	const content = segments
		.map((segment) =>
			segment.type === "mention"
				? buildMentionToken(segment.id, segment.filename)
				: segment.value,
		)
		.join("");
	return content.trim();
}

export function isComposerEmpty(segments: ComposerSegment[]): boolean {
	return serializeSegments(segments) === "";
}

export function getActiveTextSegment(segments: ComposerSegment[]): {
	index: number;
	value: string;
} {
	const index = segments.length - 1;
	const last = segments[index];
	if (last?.type === "text") {
		return { index, value: last.value };
	}
	return { index: segments.length, value: "" };
}

export function insertMentionInSegments(
	segments: ComposerSegment[],
	doc: { id: string; filename: string },
	mentionStart: number,
	cursorPos: number,
): ComposerSegment[] {
	const { index: textIndex, value: activeText } =
		getActiveTextSegment(segments);
	const before = activeText.slice(0, mentionStart);
	const after = activeText.slice(cursorPos);

	const next = segments.slice(0, textIndex);
	if (before) next.push({ type: "text", value: before });
	next.push({ type: "mention", id: doc.id, filename: doc.filename });
	next.push({ type: "text", value: after });
	return next;
}

export function updateActiveText(
	segments: ComposerSegment[],
	value: string,
): ComposerSegment[] {
	const { index: textIndex } = getActiveTextSegment(segments);
	const next = [...segments];
	if (textIndex === segments.length) {
		next.push({ type: "text", value });
	} else {
		next[textIndex] = { type: "text", value };
	}
	return next;
}

export function removeMentionSegment(
	segments: ComposerSegment[],
	mentionIndex: number,
): ComposerSegment[] {
	const before = segments[mentionIndex - 1];
	const after = segments[mentionIndex + 1];

	if (before?.type === "text" && after?.type === "text") {
		const merged = { type: "text" as const, value: before.value + after.value };
		return [
			...segments.slice(0, mentionIndex - 1),
			merged,
			...segments.slice(mentionIndex + 2),
		];
	}

	const next = segments.filter((_, i) => i !== mentionIndex);
	return next.length > 0 ? next : createEmptySegments();
}

export function handleComposerBackspace(
	segments: ComposerSegment[],
): ComposerSegment[] | null {
	const { value: activeText } = getActiveTextSegment(segments);
	if (activeText) return null;

	if (segments.length < 2) return null;
	const mentionIndex = segments.length - 2;
	if (segments[mentionIndex]?.type !== "mention") return null;

	return removeMentionSegment(segments, mentionIndex);
}

export function getMentionQuery(
	text: string,
	cursorPos: number,
): { query: string; start: number } | null {
	const before = text.slice(0, cursorPos);
	const match = before.match(/@([^\s@[\]()]*)\s*$/);
	if (!match?.[1]) return null;
	return { query: match[1], start: before.length - match[0].length };
}

export type MessagePart =
	| { type: "text"; value: string }
	| { type: "mention"; filename: string; documentId: string };

export function messagePartKey(part: MessagePart, index: number): string {
	if (part.type === "mention") {
		return `mention-${part.documentId}-${index}`;
	}
	return `text-${index}-${part.value.length}`;
}

export function splitMessageContent(content: string): MessagePart[] {
	const parts: MessagePart[] = [];
	let lastIndex = 0;

	for (const mention of parseMentionTokens(content)) {
		if (mention.start > lastIndex) {
			const text = content.slice(lastIndex, mention.start);
			if (text) parts.push({ type: "text", value: text });
		}
		parts.push({
			type: "mention",
			filename: mention.filename,
			documentId: mention.documentId,
		});
		lastIndex = mention.end;
	}

	if (lastIndex < content.length) {
		const text = content.slice(lastIndex);
		if (text) parts.push({ type: "text", value: text });
	}

	return parts.length > 0 ? parts : [{ type: "text", value: content }];
}
