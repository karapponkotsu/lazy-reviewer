// utils/NoteManager.ts
import { App, TFile, WorkspaceLeaf } from 'obsidian';
import { NotePreviewView, PREVIEW_VIEW_TYPE } from '../ui/NotePreviewView';

/**
 * Handles low-level note loading and Obsidian leaf management.
 * Keeps leaf reuse logic separate from session state.
 */
export class NoteManager {
    constructor(private app: App) {}

    async openNote(file: TFile, displayText?: string, isRevealed: boolean = false) {
        const content = await this.app.vault.read(file);

        const { workspace } = this.app;
        let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(PREVIEW_VIEW_TYPE)[0] ?? null;

        if (!leaf) {
            leaf = workspace.getLeaf(false);
            if (leaf) {
                await leaf.setViewState({
                    type: PREVIEW_VIEW_TYPE,
                    active: true,
                });
            }
        }

        if (leaf) {
            const view = leaf.view as NotePreviewView;
            if (view && typeof view.setContent === 'function') {
                await view.setContent(content, file.path, displayText, isRevealed);
            }

            workspace.revealLeaf(leaf);
            workspace.setActiveLeaf(leaf, { focus: true });
        }
    }
}
