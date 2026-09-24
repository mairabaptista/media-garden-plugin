import { requestUrl } from "obsidian";
import type { Provider, SearchResult, MediaDetails } from "../types";

const BASE = "https://api.rawg.io/api";

export class RawgProvider implements Provider {
	constructor(private apiKey: string) {}

	async search(query: string): Promise<SearchResult[]> {
		if (!this.apiKey) throw new Error("RAWG API key is not set. Add it in Media Garden settings.");
		const res = await requestUrl({
			url: `${BASE}/games?key=${encodeURIComponent(this.apiKey)}&search=${encodeURIComponent(query)}`,
		});
		const results = res.json.results ?? [];
		return results.map((r: any) => ({
			id: r.id,
			title: r.name,
			year: r.released ? Number(r.released.slice(0, 4)) : undefined,
			thumbnail: r.background_image,
		}));
	}

	async getDetails(id: string | number): Promise<MediaDetails> {
		const res = await requestUrl({
			url: `${BASE}/games/${id}?key=${encodeURIComponent(this.apiKey)}`,
		});
		const d = res.json;
		return {
			title: d.name,
			year: d.released ? Number(d.released.slice(0, 4)) : undefined,
			genres: (d.genres ?? []).map((g: any) => g.name),
			cover: d.background_image,
			externalRating: d.metacritic ?? undefined,
			summary: d.description_raw,
			platforms: (d.platforms ?? []).map((p: any) => p.platform?.name).filter(Boolean),
			developer: (d.developers ?? [])[0]?.name,
			publisher: (d.publishers ?? [])[0]?.name,
		};
	}
}
