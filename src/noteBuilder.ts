import { App, TFile, stringifyYaml } from "obsidian";
import type { MediaGardenSettings } from "./settings";
import { MEDIA_TYPE_FOLDERS, type MediaDetails, type MediaType } from "./types";

function sanitize(name: string): string {
	return name.replace(/[\\/:*?"<>|]/g, "").trim();
}

function clean<T extends object>(obj: T): Partial<T> {
	const out: Partial<T> = {};
	for (const [k, v] of Object.entries(obj)) {
		if (v !== undefined && v !== null) (out as any)[k] = v;
	}
	return out;
}

function buildFrontmatter(type: MediaType, d: MediaDetails): Record<string, unknown> {
	const common = {
		type,
		title: d.title,
		year: d.year,
		genres: d.genres,
		cover: d.cover,
		external_rating: d.externalRating,
		status: "planning",
		rating: "",
		date_started: "",
		date_finished: "",
	};

	const specific: Record<MediaType, Record<string, unknown>> = {
		movie: { runtime: d.runtime, director: d.director },
		game: { platforms: d.platforms, developer: d.developer, publisher: d.publisher },
		anime: { media_type: d.mediaType, episodes: d.episodes, studio: d.studio },
		manga: { chapters: d.chapters, volumes: d.volumes, author: d.author },
		book: { author: d.author, pages: d.pages, isbn: d.isbn },
	};

	return { ...common, ...clean(specific[type]) };
}

function buildBody(d: MediaDetails): string {
	return [
		"## Summary",
		"",
		d.summary ?? "",
		"",
		"## Quotes",
		"",
		"## Notes",
		"",
		"## Review",
		"",
	].join("\n");
}

async function ensureFolder(app: App, path: string): Promise<void> {
	const parts = path.split("/").filter(Boolean);
	let current = "";
	for (const part of parts) {
		current = current ? `${current}/${part}` : part;
		if (!app.vault.getAbstractFileByPath(current)) {
			await app.vault.createFolder(current).catch(() => {});
		}
	}
}

export async function createMediaNote(
	app: App,
	settings: MediaGardenSettings,
	type: MediaType,
	details: MediaDetails
): Promise<{ file: TFile; created: boolean }> {
	const folder = `${settings.baseFolder}/${MEDIA_TYPE_FOLDERS[type]}`;
	await ensureFolder(app, folder);

	const titlePart = sanitize(details.title) || "Untitled";
	const filename = details.year ? `${titlePart} (${details.year})` : titlePart;
	const path = `${folder}/${filename}.md`;

	const existing = app.vault.getAbstractFileByPath(path);
	if (existing instanceof TFile) {
		return { file: existing, created: false };
	}

	const frontmatter = buildFrontmatter(type, details);
	const content = `---\n${stringifyYaml(frontmatter)}---\n\n${buildBody(details)}`;
	const file = await app.vault.create(path, content);
	return { file, created: true };
}
