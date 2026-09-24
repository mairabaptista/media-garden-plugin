import { Notice, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, MediaGardenSettingTab, type MediaGardenSettings } from "./settings";
import { CreateMediaModal, SearchResultsModal } from "./modals";
import { getProvider } from "./providers";
import { createMediaNote } from "./noteBuilder";

export default class MediaGardenPlugin extends Plugin {
	settings: MediaGardenSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new MediaGardenSettingTab(this.app, this));

		this.addCommand({
			id: "create-media-note",
			name: "Create media note",
			callback: () => this.openCreateModal(),
		});
	}

	private openCreateModal() {
		new CreateMediaModal(this.app, async (type, title) => {
			const provider = getProvider(type, this.settings);
			try {
				const results = await provider.search(title);
				if (results.length === 0) {
					new Notice("No results found. Try a different title.");
					return false;
				}
				new SearchResultsModal(this.app, results, async (choice) => {
					try {
						const details = await provider.getDetails(choice.id);
						const { file, created } = await createMediaNote(this.app, this.settings, type, details);
						await this.app.workspace.getLeaf(false).openFile(file);
						if (!created) new Notice(`"${details.title}" already exists — opened it.`);
					} catch (err) {
						new Notice(`Media Garden: ${(err as Error).message}`);
					}
				}).open();
				return true;
			} catch (err) {
				new Notice(`Media Garden: ${(err as Error).message}`);
				return false;
			}
		}).open();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
