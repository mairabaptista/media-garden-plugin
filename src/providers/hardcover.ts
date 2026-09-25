import { requestUrl } from "obsidian";
import type { Provider, SearchResult, MediaDetails } from "../types";

const ENDPOINT = "https://api.hardcover.app/v1/graphql";

// Typesense's standard hit shape is `{ hits: [{ document: {...} }] }`, but
// Hardcover's `results` field is untyped jsonb, so fall back defensively.
function normalizeHits(results: unknown): any[] {
	if (!results) return [];
	if (Array.isArray(results)) return results;
	const hits = (results as any).hits;
	if (Array.isArray(hits)) return hits.map((h: any) => h.document ?? h);
	return [];
}

function literaryType(id: number | undefined): string | undefined {
	return id === 1 ? "Fiction" : id === 2 ? "Nonfiction" : undefined;
}

const BOOK_CATEGORIES: Record<number, string> = {
	1: "Book",
	2: "Novella",
	3: "Short Story",
	4: "Graphic Novel",
	5: "Fan Fiction",
	6: "Research Paper",
	7: "Poetry",
	8: "Collection",
	9: "Web Novel",
	10: "Light Novel",
};

function bookCategory(id: number | undefined): string | undefined {
	return id !== undefined ? BOOK_CATEGORIES[id] : undefined;
}

export class HardcoverProvider implements Provider {
	// Search already returns rating/description/genres/pages, so cache them by
	// id and avoid a second round-trip for anything but the cover image.
	private cache = new Map<number, any>();

	constructor(private token: string) {}

	async search(query: string): Promise<SearchResult[]> {
		if (!this.token) throw new Error("Hardcover API token is not set. Add it in Media Garden settings.");
		const data = await this.gql(
			`query Search($q: String!) {
				search(query: $q, query_type: "Book", per_page: 20, page: 1) {
					ids
					results
				}
			}`,
			{ q: query }
		);
		const ids: number[] = data.search?.ids ?? [];
		const hits = normalizeHits(data.search?.results);
		this.cache.clear();
		return ids.map((id, i) => {
			const doc = hits[i] ?? {};
			this.cache.set(id, doc);
			return {
				id,
				title: doc.title ?? String(id),
				year: doc.release_year ?? undefined,
			};
		});
	}

	async getDetails(id: string | number): Promise<MediaDetails> {
		const numId = Number(id);
		const doc = this.cache.get(numId) ?? {};
		const data = await this.gql(
			`query BookImage($id: Int!) {
				books(where: { id: { _eq: $id } }) {
					image { url }
					contributions { author { name } }
					literary_type_id
					book_category_id
				}
			}`,
			{ id: numId }
		);
		const b = data.books?.[0] ?? {};
		const genres = doc.genres?.length ? doc.genres : await this.fetchGenres(doc.title);
		return {
			title: doc.title,
			year: doc.release_year ?? undefined,
			genres: genres.slice(0, 5),
			cover: b.image?.url,
			// Hardcover's rating is 0-5; normalize to the 0-10 scale every other provider uses.
			externalRating: doc.rating ? doc.rating * 2 : undefined,
			summary: doc.description,
			author: b.contributions?.[0]?.author?.name ?? (doc.author_names ?? [])[0],
			pages: doc.pages,
			isbn: (doc.isbns ?? [])[0],
			literaryType: literaryType(b.literary_type_id),
			category: bookCategory(b.book_category_id),
		};
	}

	// `genres` only exists on the Typesense search index, not the plain `books`
	// type, so a cache miss (or an empty hit) needs its own lookup by title.
	// Best-effort: a failed or mismatched lookup just means no genres.
	private async fetchGenres(title: string | undefined): Promise<string[]> {
		if (!title) return [];
		try {
			const data = await this.gql(
				`query GenreLookup($q: String!) {
					search(query: $q, query_type: "Book", per_page: 1, page: 1) {
						results
					}
				}`,
				{ q: title }
			);
			const hits = normalizeHits(data.search?.results);
			return hits[0]?.genres ?? [];
		} catch {
			return [];
		}
	}

	private async gql(query: string, variables: Record<string, unknown>): Promise<any> {
		const res = await requestUrl({
			url: ENDPOINT,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: this.token.startsWith("Bearer ") ? this.token : `Bearer ${this.token}`,
			},
			body: JSON.stringify({ query, variables }),
		});
		if (res.json.errors?.length) throw new Error(res.json.errors[0].message ?? "Hardcover API error");
		return res.json.data;
	}
}
