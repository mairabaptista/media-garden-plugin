import { requestUrl } from "obsidian";
import type { Provider, SearchResult, MediaDetails } from "../types";

const BASE = "https://api.tenrai.org/v1";

export class TenraiProvider implements Provider {
	constructor(private kind: "anime" | "manga") {}

	async search(query: string): Promise<SearchResult[]> {
		const res = await requestUrl({
			url: `${BASE}/${this.kind}?q=${encodeURIComponent(query)}`,
		});
		const results = res.json.data ?? [];
		return results.map((r: any) => ({
			id: r.mal_id,
			title: r.title,
			year: this.year(r),
			thumbnail: r.images?.jpg?.small_image_url,
		}));
	}

	async getDetails(id: string | number): Promise<MediaDetails> {
		const res = await requestUrl({ url: `${BASE}/${this.kind}/${id}` });
		const d = res.json.data;
		const base: MediaDetails = {
			title: d.title,
			year: this.year(d),
			genres: (d.genres ?? []).map((g: any) => g.name),
			cover: d.images?.jpg?.large_image_url,
			externalRating: d.score,
			summary: d.synopsis,
			mediaType: d.type,
		};
		if (this.kind === "anime") {
			return {
				...base,
				episodes: d.episodes ?? undefined,
				studio: (d.studios ?? [])[0]?.name,
			};
		}
		return {
			...base,
			chapters: d.chapters ?? undefined,
			volumes: d.volumes ?? undefined,
			author: (d.authors ?? [])[0]?.name,
		};
	}

	private year(d: any): number | undefined {
		const from = this.kind === "anime" ? d.aired?.prop?.from : d.published?.prop?.from;
		return from?.year ?? undefined;
	}
}
