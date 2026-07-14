// ui/SearchResultsView.ts
import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import { ReviewSession } from '../utils/ReviewSession';
import type { ClickableLink } from '../utils/DataviewHelper';

// View type identifier for Obsidian
export const VIEW_TYPE = 'search-results-view';

// Left sidebar view that shows the list of notes from the Dataview query
export class SearchResultsView extends ItemView {
    private items: ClickableLink[] = [];
    private itemElements: HTMLElement[] = [];
    private currentIndex: number = -1;

    constructor(leaf: WorkspaceLeaf, private session: ReviewSession) {
        super(leaf);
    }

    getViewType(): string { return VIEW_TYPE; }
    getDisplayText(): string { return 'Search Results'; }

    // Called when new results are loaded
    async setResults(results: ClickableLink[]) {
        this.items = results;
        this.itemElements = [];
        this.currentIndex = -1;
        await this.render();
    }

    // Highlights the selected item in the list
    highlightItem(index: number) {
        this.currentIndex = index;
        this.itemElements.forEach((el, i) => {
            if (i === index) {
                el.addClass('is-selected');
                el.style.background = 'var(--background-modifier-hover)';
                el.style.color = 'var(--text-accent)';
                el.style.fontWeight = 'bold';
                el.style.borderLeft = '4px solid var(--text-accent)';
                el.style.paddingLeft = '5px';
            } else {
                el.removeClass('is-selected');
                el.style.background = '';
                el.style.color = '';
                el.style.fontWeight = '';
                el.style.borderLeft = '';
                el.style.paddingLeft = '';
            }
        });
    }

    // Renders the list of results
    async render() {
        const container = this.contentEl;
        container.empty();
        this.itemElements = [];

        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            if (!item) continue;

            const el = container.createEl('div', {
                text: item.displayText,
                cls: 'search-result-item'
            });

            el.addEventListener('click', async () => {
                await this.session.open(i);
                this.highlightItem(i);
            });

            this.itemElements.push(el);
        }
    }

    // Public method so ReviewSession can force highlight
    public forceHighlight(index: number) {
        this.highlightItem(index);
    }

    onload() {
        // Listen for when the active file changes to sync highlight
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', () => {
                this.syncHighlightWithActiveFile();
            })
        );

        this.registerEvent(
            this.app.workspace.on('file-open', (file: TFile | null) => {
                if (file) this.syncHighlightWithActiveFile();
            })
        );

        super.onload();
    }

    private syncHighlightWithActiveFile() {
        setTimeout(() => {
            const activeFile = this.app.workspace.getActiveFile();
            if (!activeFile) return;

            const matchingIndex = this.items.findIndex(item => item.path === activeFile.path);
            if (matchingIndex !== -1 && matchingIndex !== this.currentIndex) {
                this.highlightItem(matchingIndex);
            }
        }, 100);
    }

    onunload() {
        super.onunload();
    }
}