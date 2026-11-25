import type { StoryComment } from "../services/fun";

export function mergeCommentThreads(previous: StoryComment[], incoming: StoryComment[], replaceRoots = false): StoryComment[] {
    const known = new Map(previous.map(row => [row.id, row]));
    const merged = incoming.map(row => {
        const old = known.get(row.id);
        if (!old) return row;
        const reset = Number(row.reply_count ?? 0) < Number(old.reply_count ?? 0);
        return { ...old, ...row, replies: reset ? row.replies ?? [] : mergeCommentThreads(old.replies ?? [], row.replies ?? []) };
    });
    const rows = replaceRoots ? merged : [...previous.filter(row => !incoming.some(next => next.id === row.id)), ...merged];
    return rows.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}
export function updateCommentThread(rows: StoryComment[], id: string, update: (row: StoryComment) => StoryComment): StoryComment[] {
    return rows.map(row => row.id === id ? update(row) : { ...row, replies: updateCommentThread(row.replies ?? [], id, update) });
}
export function removeCommentThread(rows: StoryComment[], id: string): StoryComment[] {
    return rows.filter(row => row.id !== id).map(row => ({ ...row, replies: removeCommentThread(row.replies ?? [], id) }));
}
