import { requestUrl } from "obsidian";
import type { Provider, SearchResult, MediaDetails } from "../types";

const BASE = "https://api.themoviedb.org/3";

export class TmdbProvider implements Provider {
	constructor(private apiKey: string) {}

	async search(query: string): Promise<SearchResult[]> {
		if (!this.apiKey) throw new Error("TMDB API key is not set. Add it in Media Garden settings.");
		const res = await requestUrl({
			url: `${BASE}/search/movie?api_key=${encodeURIComponent(this.apiKey)}&query=${encodeURIComponent(query)}`,
		});
		const results = res.json.results ?? [];
		return results.map((r: any) => ({
			id: r.id,
			title: r.title,
			year: r.release_date ? Number(r.release_date.slice(0, 4)) : undefined,
			thumbnail: r.poster_path ? `https://image.tmdb.org/t/p/w92${r.poster_path}` : undefined,
		}));
	}

	async getDetails(id: string | number): Promise<MediaDetails> {
		const res = await requestUrl({
			url: `${BASE}/movie/${id}?api_key=${encodeURIComponent(this.apiKey)}&append_to_response=credits`,
		});
		const d = res.json;
		const director = (d.credits?.crew ?? []).find((c: any) => c.job === "Director");
		return {
			title: d.title,
			year: d.release_date ? Number(d.release_date.slice(0, 4)) : undefined,
			genres: (d.genres ?? []).map((g: any) => g.name),
			cover: d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : undefined,
			externalRating: d.vote_average,
			summary: d.overview,
			runtime: d.runtime,
			director: director?.name,
		};
	}
}
