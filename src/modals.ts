import { App, FuzzySuggestModal, Modal, Notice, Setting } from "obsidian";
import { MEDIA_TYPES, MEDIA_TYPE_LABELS, type MediaType, type SearchResult } from "./types";

/** Returns true if the search succeeded and the modal should close. */
type SubmitHandler = (type: MediaType, title: string) => Promise<boolean>;

export class CreateMediaModal extends Modal {
	private type: MediaType = "movie";
	private title = "";
	private submitBtn?: HTMLButtonElement;

	constructor(app: App, private onSubmit: SubmitHandler) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: "Create media note" });

		new Setting(contentEl).setName("Type").addDropdown((drop) => {
			for (const t of MEDIA_TYPES) drop.addOption(t, MEDIA_TYPE_LABELS[t]);
			drop.setValue(this.type).onChange((v) => (this.type = v as MediaType));
		});

		let titleInputEl: HTMLInputElement;
		new Setting(contentEl).setName("Title").addText((text) => {
			titleInputEl = text.inputEl;
			text.setPlaceholder("e.g. Dune").onChange((v) => (this.title = v));
			text.inputEl.addEventListener("keydown", (evt) => {
				if (evt.key === "Enter") this.submit();
			});
		});

		new Setting(contentEl).addButton((btn) => {
			this.submitBtn = btn.buttonEl;
			btn.setButtonText("Search").setCta().onClick(() => this.submit());
		});

		window.setTimeout(() => titleInputEl?.focus(), 0);
	}

	private async submit() {
		const title = this.title.trim();
		if (!title) {
			new Notice("Enter a title first.");
			return;
		}
		if (this.submitBtn) {
			this.submitBtn.disabled = true;
			this.submitBtn.setText("Searching…");
		}
		const shouldClose = await this.onSubmit(this.type, title);
		if (shouldClose) {
			this.close();
			return;
		}
		if (this.submitBtn) {
			this.submitBtn.disabled = false;
			this.submitBtn.setText("Search");
		}
	}

	onClose() {
		this.contentEl.empty();
	}
}

export class SearchResultsModal extends FuzzySuggestModal<SearchResult> {
	constructor(app: App, private results: SearchResult[], private onChoose: (r: SearchResult) => void) {
		super(app);
		this.setPlaceholder("Pick the correct match…");
	}

	getItems(): SearchResult[] {
		return this.results;
	}

	getItemText(item: SearchResult): string {
		return item.year ? `${item.title} (${item.year})` : item.title;
	}

	onChooseItem(item: SearchResult): void {
		this.onChoose(item);
	}
}
