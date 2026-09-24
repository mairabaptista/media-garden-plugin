import { requestUrl } from "obsidian";
import type { Provider, SearchResult, MediaDetails } from "../types";

const FIELDS = "key,title,author_name,first_publish_year,cover_i,subject,number_of_pages_median,isbn";

// Open Library's search endpoint already returns everything we need, so we
// cache each result by key and skip a second "detail" request.
export class OpenLibraryProvider implements Provider {
	private cache = new Map<string, any>();

	async search(query: string): Promise<SearchResult[]> {
		const res = await requestUrl({
			url: `https://openlibrary.org/search.json?fields=${FIELDS}&q=${encodeURIComponent(query)}`,
		});
		const docs = res.json.docs ?? [];
		this.cache.clear();
		return docs.slice(0, 20).map((d: any) => {
			this.cache.set(d.key, d);
			return {
				id: d.key,
				title: d.title,
				year: d.first_publish_year,
				thumbnail: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-S.jpg` : undefined,
			};
		});
	}

	async getDetails(id: string | number): Promise<MediaDetails> {
		const d = this.cache.get(String(id));
		if (!d) throw new Error("Book details expired, please search again.");
		return {
			title: d.title,
			year: d.first_publish_year,
			genres: (d.subject ?? []).slice(0, 5),
			cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : undefined,
			author: (d.author_name ?? [])[0],
			pages: d.number_of_pages_median,
			isbn: (d.isbn ?? [])[0],
		};
	}
}
