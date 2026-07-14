// utils/ReviewSession.ts
import { App, TFile } from 'obsidian';
import { NoteManager } from './NoteManager';
import type { ClickableLink } from './DataviewHelper';
import { VIEW_TYPE } from '../ui/SearchResultsView';

/**
 * Central controller for the review session.
 * Manages current note, navigation, grading, and state.
 */
export class ReviewSession {
    private results: ClickableLink[] = [];
    private currentIndex: number = -1;
    private currentFile: TFile | null = null;
    private isRevealed: boolean = false;
    private gradingLevels: number;
    private gradeProperty: string;

    constructor(
        private app: App,
        private noteManager: NoteManager,
        gradingLevels: number = 5,
        gradeProperty: string = "lazy_reviewer_grade"
    ) {
        this.gradingLevels = gradingLevels;
        this.gradeProperty = gradeProperty;
    }

    // Set new list of results (from Dataview query)
    setResults(results: ClickableLink[]) {
        this.results = results;
        this.currentIndex = -1;
        this.currentFile = null;
        this.isRevealed = false;
    }

    // Open a specific note by index
    async open(index: number) {
        if (index < 0 || index >= this.results.length) return;

        this.currentIndex = index;
        this.isRevealed = false;

        const item = this.results[index];
        if (!item) return;

        const file = this.app.vault.getAbstractFileByPath(item.path);
        if (file instanceof TFile) {
            this.currentFile = file;
            await this.noteManager.openNote(file, item.displayText, this.isRevealed);
            
            // Force highlight on the list view
            const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
            const view = leaves[0]?.view as any;
            if (view && typeof view.forceHighlight === 'function') {
                view.forceHighlight(index);
            }
        }
    }

    async next() {
        if (this.results.length === 0) return;
        const newIndex = (this.currentIndex + 1) % this.results.length;
        await this.open(newIndex);
    }

    async previous() {
        if (this.results.length === 0) return;
        let newIndex = this.currentIndex - 1;
        if (newIndex < 0) newIndex = this.results.length - 1;
        await this.open(newIndex);
    }

    async reveal() {
        if (this.currentFile && this.currentIndex >= 0) {
            const currentItem = this.results[this.currentIndex];
            if (!currentItem) return;

            this.isRevealed = true;
            await this.noteManager.openNote(this.currentFile, currentItem.displayText, true);
        }
    }

    async grade(level: number) {
        if (!this.currentFile) return;

        await this.updateFrontmatter(this.currentFile, level);
        console.log(`Graded ${this.currentFile.path} → ${this.gradeProperty}: ${level}`);

        await this.next();
    }

    private async updateFrontmatter(file: TFile, level: number) {
        let content = await this.app.vault.read(file);
        
        if (!content.startsWith('---')) {
            content = `---\n${this.gradeProperty}: ${level}\n---\n` + content;
        } else {
            const fmEnd = content.indexOf('---', 3);
            let frontmatter = content.substring(0, fmEnd);
            
            if (new RegExp(`${this.gradeProperty}:`).test(frontmatter)) {
                frontmatter = frontmatter.replace(
                    new RegExp(`${this.gradeProperty}:\\s*\\d+`), 
                    `${this.gradeProperty}: ${level}`
                );
            } else {
                frontmatter = frontmatter.replace('---', `---\n${this.gradeProperty}: ${level}`);
            }
            
            content = frontmatter + content.substring(fmEnd);
        }

        await this.app.vault.modify(file, content);
    }

    // Return current grade for button highlighting
    getCurrentGrade(): number {
        if (!this.currentFile) return 0;

        const cache = this.app.metadataCache.getFileCache(this.currentFile);
        if (cache?.frontmatter && this.gradeProperty in cache.frontmatter) {
            const grade = parseInt(cache.frontmatter[this.gradeProperty] as string);
            return isNaN(grade) ? 0 : grade;
        }
        return 0;
    }

    getCurrentIndex(): number {
        return this.currentIndex;
    }

    getResults(): ClickableLink[] {
        return [...this.results];
    }

    isAnswerRevealed(): boolean {
        return this.isRevealed;
    }
}