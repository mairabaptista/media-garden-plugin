import { App, PluginSettingTab, Setting } from "obsidian";
import type MediaGardenPlugin from "./main";

export interface MediaGardenSettings {
	tmdbApiKey: string;
	rawgApiKey: string;
	hardcoverToken: string;
	baseFolder: string;
}

export const DEFAULT_SETTINGS: MediaGardenSettings = {
	tmdbApiKey: "",
	rawgApiKey: "",
	hardcoverToken: "",
	baseFolder: "Media",
};

export class MediaGardenSettingTab extends PluginSettingTab {
	plugin: MediaGardenPlugin;

	constructor(app: App, plugin: MediaGardenPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Base folder")
			.setDesc("Notes are created under this folder, in per-type subfolders (e.g. Media/Movies).")
			.addText((text) =>
				text
					.setPlaceholder("Media")
					.setValue(this.plugin.settings.baseFolder)
					.onChange(async (value) => {
						this.plugin.settings.baseFolder = value.trim() || "Media";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("TMDB API key")
			.setDesc("Required for movies. Free key at themoviedb.org/settings/api.")
			.addText((text) =>
				text
					.setPlaceholder("API key")
					.setValue(this.plugin.settings.tmdbApiKey)
					.onChange(async (value) => {
						this.plugin.settings.tmdbApiKey = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("RAWG API key")
			.setDesc("Required for games. Free key at rawg.io/apidocs.")
			.addText((text) =>
				text
					.setPlaceholder("API key")
					.setValue(this.plugin.settings.rawgApiKey)
					.onChange(async (value) => {
						this.plugin.settings.rawgApiKey = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Hardcover API token")
			.setDesc(
				"Required for books. Personal Access Token from hardcover.app account settings -> Hardcover API. Tokens expire, so you'll need to refresh this occasionally."
			)
			.addText((text) =>
				text
					.setPlaceholder("Token")
					.setValue(this.plugin.settings.hardcoverToken)
					.onChange(async (value) => {
						this.plugin.settings.hardcoverToken = value.trim();
						await this.plugin.saveSettings();
					})
			);
	}
}
