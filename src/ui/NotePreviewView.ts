// ui/NotePreviewView.ts
import { ItemView, WorkspaceLeaf, MarkdownRenderer, Component, ButtonComponent, TFile } from 'obsidian';
import { ReviewSession } from '../utils/ReviewSession';
import { ContentProcessor } from '../utils/ContentProcessor';

/**
 * Custom preview view for review notes.
 * Shows processed markdown + bottom control panel.
 */
export const PREVIEW_VIEW_TYPE = 'note-preview-view';

export class NotePreviewView extends ItemView {
    private currentContent: string = '';
    private currentFilePath: string = '';
    private currentDisplayText: string = 'Note Preview';
    private session: ReviewSession;
    private gradingLevels: number;

    constructor(leaf: WorkspaceLeaf, session: ReviewSession, gradingLevels: number = 5) {
        super(leaf);
        this.session = session;
        this.gradingLevels = gradingLevels;
    }

    getViewType(): string { return PREVIEW_VIEW_TYPE; }
    getDisplayText(): string { return this.currentDisplayText; }

    // Load and render a note
    async setContent(content: string, filePath: string, displayText?: string, isRevealed: boolean = false) {
        this.currentContent = content;
        this.currentFilePath = filePath;

        if (displayText && displayText.trim()) {
            this.currentDisplayText = displayText;
        } else {
            const fileName = filePath.split('/').pop()?.replace(/\.md$/, '') || 'Untitled';
            this.currentDisplayText = fileName;
        }

        await this.render(isRevealed);
        this.updateTitles();
    }

    private async render(isRevealed: boolean) {
        const container = this.contentEl;
        container.empty();
        container.addClass('markdown-rendered', 'markdown-preview-view');

        const processor = new ContentProcessor();
        const processed = processor.process(this.currentContent, isRevealed);

        const component = new Component();
        await MarkdownRenderer.render(this.app, processed.markdown, container, this.currentFilePath, component);

        this.applyReadingViewStyles();
        this.addBottomControlPanel(processed.hasHiddenContent && !isRevealed);
    }

    private addBottomControlPanel(showReveal: boolean) {
        const panel = this.contentEl.createEl('div', { cls: 'review-bottom-panel' });

        Object.assign(panel.style, {
            marginTop: '40px',
            padding: '20px 10px',
            borderTop: '2px solid var(--background-modifier-border)',
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            background: 'var(--background-primary)',
            borderRadius: '6px'
        });

        if (showReveal) {
            new ButtonComponent(panel)
                .setButtonText('Reveal Answer')
                .setCta()
                .onClick(() => this.session.reveal());
        } else {
            // === COUNTER: e.g. "3 / 15" ===
            const total = this.session.getResults().length;
            const current = this.session.getCurrentIndex() + 1;
            const counterEl = panel.createEl('div', {
                text: `${current} / ${total}`,
                cls: 'review-counter'
            });
            Object.assign(counterEl.style, {
                alignSelf: 'center',
                fontWeight: 'bold',
                color: 'var(--text-muted)',
                minWidth: '60px',
                textAlign: 'center'
            });

            // Navigation
            new ButtonComponent(panel)
                .setButtonText('← Previous')
                .onClick(() => this.session.previous());

            // Grading buttons
            const currentGrade = this.session.getCurrentGrade?.() ?? 0;

            for (let level = 1; level <= this.gradingLevels; level++) {
                const btn = new ButtonComponent(panel)
                    .setButtonText(level.toString())
                    .onClick(() => this.session.grade(level));

                if (level === currentGrade && currentGrade > 0) {
                    btn.setCta();
                    btn.buttonEl.addClass('is-current-grade');
                }
            }

            new ButtonComponent(panel)
                .setButtonText('Next →')
                .onClick(() => this.session.next());

            // Edit button
            new ButtonComponent(panel)
                .setButtonText('✏️ Edit Note')
                .setTooltip('Open in native editor tab')
                .onClick(async () => {
                    if (this.currentFilePath) {
                        const file = this.app.vault.getAbstractFileByPath(this.currentFilePath);
                        if (file instanceof TFile) {
                            const leaf = this.app.workspace.getLeaf(false);
                            await leaf.openFile(file);
                        }
                    }
                });
        }
    }

    private applyReadingViewStyles() {
        const container = this.contentEl;
        container.style.padding = 'var(--size-4-3)';
        container.style.maxWidth = 'var(--file-line-width, 700px)';
        container.style.margin = '0 auto';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.minHeight = '100%';
        container.style.height = '100%';
        container.style.boxSizing = 'border-box';

        const images = container.querySelectorAll('img');
        images.forEach(img => (img as HTMLElement).style.maxWidth = '100%');
    }

    private updateTitles() {
        const displayText = this.currentDisplayText;
        if (this.leaf) {
            const tabTitleEl = (this.leaf as any).tabHeaderEl?.querySelector('.workspace-tab-header-inner-title');
            if (tabTitleEl) tabTitleEl.textContent = displayText;
        }

        const headerTitleEl = this.containerEl.querySelector('.view-header-title');
        if (headerTitleEl) headerTitleEl.textContent = displayText;

        this.app.workspace.requestSaveLayout?.();
    }

    async onClose() {
        this.currentContent = '';
        this.contentEl.empty();
    }
}