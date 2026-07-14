// utils/ContentProcessor.ts
/**
 * Handles processing of note content: hiding sections, hints, future separator strategies.
 * Keeps rendering logic clean in NotePreviewView.
 */
export class ContentProcessor {
    private readonly defaultSeparator = '%%??%%';

    process(content: string, isRevealed: boolean = false): { markdown: string; hasHiddenContent: boolean } {
        const index = content.indexOf(this.defaultSeparator);

        if (index === -1) {
            return { markdown: content, hasHiddenContent: false };
        }

        const questionPart = content.substring(0, index).trim();
        const answerPart = content.substring(index + this.defaultSeparator.length).trim();

        let markdown: string;
        if (!isRevealed) {
            markdown = questionPart + `\n\n---\n*Hint: There is more content hidden below for review.*`;
        } else {
            markdown = questionPart + `\n\n---\n` + answerPart;
        }

        return { markdown, hasHiddenContent: true };
    }
}
