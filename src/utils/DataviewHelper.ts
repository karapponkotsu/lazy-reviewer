// utils/DataviewHelper.ts
import type { App } from 'obsidian';
import type { DataviewApi } from 'obsidian-dataview';
import { TFile } from 'obsidian';

export class DataviewHelper {
    private app: App;
    private api: DataviewApi | null = null;

    constructor(app: App) {
        this.app = app;
    }

    getAPI(): DataviewApi | null {
        if (!this.api) {
            try {
                const dataviewPlugin = (this.app as any).plugins.getPlugin('dataview');
                if (dataviewPlugin && 'api' in dataviewPlugin) {
                    this.api = dataviewPlugin.api as DataviewApi;
                }
            } catch (error) {
                console.warn('Dataview not available:', error);
            }
        }
        return this.api;
    }

    isAvailable(): boolean {
        return this.getAPI() !== null;
    }

    async query(source: string) {
        const api = this.getAPI();
        if (!api) {
            console.warn('Dataview not available');
            return null;
        }
        try {
            const rawResult = await api.query(source);

            if (rawResult && rawResult.successful === true) {
                return rawResult.value;
            } else {
                console.error('Query failed:', rawResult?.error || 'Unknown error');
                return null;
            }
        } catch (error) {
            console.error('Dataview query failed:', error);
            return null;
        }
    }

    /**
     * Execute a query and extract clickable links from the results.
     * Improved to handle LIST, TABLE, WITHOUT ID, etc.
     */
    async getClickableLinks(queryString: string): Promise<ClickableLink[]> {
        const result = await this.query(queryString);

        if (!result) {
            console.warn('Query returned no results');
            return [];
        }

        if (result.type === 'list') {
            return this.extractLinksFromList(result.values);
        }

        if (result.type === 'table') {
            return this.extractLinksFromTable(result.values, result.headers);
        }

        // Fallback for other result formats
        if (Array.isArray(result.values)) {
            return this.extractLinksFromList(result.values);
        }

        console.warn(`Unsupported query type: ${result.type}`);
        return [];
    }

    private extractLinksFromList(values: any[]): ClickableLink[] {
        const links: ClickableLink[] = [];

        for (const item of values) {
            const extracted = this.extractLinkFromAny(item);
            if (extracted) {
                links.push(extracted);
            }
        }

        return links;
    }

    private extractLinksFromTable(values: any[][], headers: string[]): ClickableLink[] {
        const links: ClickableLink[] = [];

        for (const row of values) {
            for (const cell of row) {
                const extracted = this.extractLinkFromAny(cell);
                if (extracted) {
                    links.push(extracted);
                    break;
                }
            }
        }

        return links;
    }

    private extractLinkFromAny(value: any): ClickableLink | null {
        if (!value) return null;

        // Dataview Link object
        if (value && typeof value === 'object' && 'path' in value) {
            return {
                displayText: value.display || 
                            (value.file ? value.file.name : '') || 
                            value.path.split('/').pop() || 'Untitled',
                path: value.path,
                link: value
            };
        }

        // File / Page object with .file
        if (value && typeof value === 'object' && value.file) {
            const f = value.file;
            return {
                displayText: f.name || f.path || 'Untitled',
                path: f.path || '',
                link: f.link || null
            };
        }

        // Simple string (try to match file)
        if (typeof value === 'string' && value.trim()) {
            const file = this.findFileByName(value);
            if (file) {
                return {
                    displayText: value,
                    path: file.path,
                    link: null
                };
            }
        }

        return null;
    }

    private findFileByName(name: string): TFile | null {
        const files = this.app.vault.getMarkdownFiles();
        return files.find(f => 
            f.basename === name || 
            f.name === name || 
            f.basename.toLowerCase() === name.toLowerCase()
        ) || null;
    }
}

export interface ClickableLink {
    displayText: string;
    path: string;
    link: any;
}