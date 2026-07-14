// utils/QueryModal.ts
import { SuggestModal, App } from 'obsidian';
import { DataviewHelper } from './DataviewHelper';

export class QueryModal extends SuggestModal<string> {
    private dvHelper: DataviewHelper;
    public onChoose!: (query: string) => void;

    constructor(app: App, dvHelper: DataviewHelper) {
        super(app);
        this.dvHelper = dvHelper;
    }

    getSuggestions(query: string): string[] {
        return [query]; // Simple: just echo the input
    }

    renderSuggestion(suggestion: string, el: HTMLElement) {
        el.setText(suggestion);
    }

    onChooseSuggestion(suggestion: string) {
        if (this.onChoose) {
            this.onChoose(suggestion);
        }
    }
}
