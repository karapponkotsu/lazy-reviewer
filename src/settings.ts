// settings.ts
import { App, PluginSettingTab, Setting } from 'obsidian';
import LazyReviewer from './main';

export class SampleSettingTab extends PluginSettingTab {
    plugin: LazyReviewer;

    constructor(app: App, plugin: LazyReviewer) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        let gradingSlider: Setting;

        gradingSlider = new Setting(containerEl)
            .setName('Number of grading levels')
            .setDesc('How many grading buttons to show (3-10)')
            .addSlider(slider => slider
                .setLimits(3, 10, 1)
                .setValue(this.plugin.settings.gradingLevels)
                .onChange(async (value) => {
                    this.plugin.settings.gradingLevels = value;
                    await this.plugin.saveSettings();
                    
                    // Update the name dynamically to show current value
                    if (gradingSlider) {
                        gradingSlider.setName(`Number of grading levels (${value})`);
                    }
                })
            );

        // Initial name with value
        gradingSlider.setName(`Number of grading levels (${this.plugin.settings.gradingLevels})`);

        new Setting(containerEl)
            .setName('Grade property name')
            .setDesc('Frontmatter property used to store the grade (e.g. lazy_reviewer_grade, level, knowledge)')
            .addText(text => text
                .setValue(this.plugin.settings.gradeProperty)
                .onChange(async (value) => {
                    this.plugin.settings.gradeProperty = value.trim() || "lazy_reviewer_grade";
                    await this.plugin.saveSettings();
                })
            );
    }
}