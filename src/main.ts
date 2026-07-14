// main.ts
import { Plugin } from 'obsidian';
import { SearchResultsView, VIEW_TYPE } from './ui/SearchResultsView';
import { NotePreviewView, PREVIEW_VIEW_TYPE } from './ui/NotePreviewView';
import { DataviewHelper } from './utils/DataviewHelper';
import { QueryModal } from './utils/QueryModal';
import { ReviewSession } from './utils/ReviewSession';
import { NoteManager } from './utils/NoteManager';
import { SampleSettingTab } from './settings';

// Main plugin class - entry point for Obsidian
export default class LazyReviewer extends Plugin {
    private dvHelper!: DataviewHelper;
    private reviewSession!: ReviewSession;
    private noteManager!: NoteManager;

    public settings = {
        gradingLevels: 5,
        gradeProperty: "lazy_reviewer_grade"
    };

    // Called when the plugin is loaded
    async onload() {
        await this.loadSettings();

        this.dvHelper = new DataviewHelper(this.app);
        this.noteManager = new NoteManager(this.app);

        this.reviewSession = new ReviewSession(
            this.app,
            this.noteManager,
            this.settings.gradingLevels,
            this.settings.gradeProperty
        );

        // Register custom views
        this.registerView(VIEW_TYPE, (leaf) => new SearchResultsView(leaf, this.reviewSession));
        this.registerView(PREVIEW_VIEW_TYPE, (leaf) => new NotePreviewView(leaf, this.reviewSession, this.settings.gradingLevels));

        // Command to open the Dataview query modal
        this.addCommand({
            id: 'ask-query',
            name: 'Dataview Query',
            callback: async () => {
                const modal = new QueryModal(this.app, this.dvHelper);
                modal.onChoose = async (query: string) => {
                    const results = await this.dvHelper.getClickableLinks(query);

                    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];

                    if (!leaf) {
                        const leftLeaf = this.app.workspace.getLeftLeaf(false);
                        if (!leftLeaf) return;
                        await leftLeaf.setViewState({ type: VIEW_TYPE });
                        leaf = leftLeaf;
                    }

                    // Wait for the view to be fully initialized
                    const waitForView = () => new Promise<void>(resolve => {
                        const check = () => {
                            const view = leaf.view as SearchResultsView;
                            if (view && typeof view.setResults === 'function') {
                                resolve();
                            } else {
                                requestAnimationFrame(check);
                            }
                        };
                        check();
                    });

                    await waitForView();

                    const view = leaf.view as SearchResultsView;
                    await view.setResults(results);
                    this.reviewSession.setResults(results);

                    this.app.workspace.revealLeaf(leaf);
                };
                modal.open();
            }
        });

        this.addCommand({
            id: 'next-note',
            name: 'Next Note in Results',
            callback: () => this.reviewSession.next()
        });

        this.addCommand({
            id: 'prev-note',
            name: 'Previous Note in Results',
            callback: () => this.reviewSession.previous()
        });

        this.addCommand({
            id: 'reveal-answer',
            name: 'Reveal Answer',
            callback: () => this.reviewSession.reveal()
        });

        this.addSettingTab(new SampleSettingTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign({}, { gradingLevels: 5, gradeProperty: "lazy_reviewer_grade" }, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}