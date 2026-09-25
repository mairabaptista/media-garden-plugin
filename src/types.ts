export type MediaType = "movie" | "game" | "anime" | "manga" | "book";

export const MEDIA_TYPES: MediaType[] = ["movie", "game", "anime", "manga", "book"];

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
	movie: "Movie",
	game: "Game",
	anime: "Anime",
	manga: "Manga",
	book: "Book",
};

export const MEDIA_TYPE_FOLDERS: Record<MediaType, string> = {
	movie: "Movies",
	game: "Games",
	anime: "Anime",
	manga: "Manga",
	book: "Books",
};

export interface SearchResult {
	id: string | number;
	title: string;
	year?: number;
	thumbnail?: string;
}

export interface MediaDetails {
	title: string;
	year?: number;
	genres: string[];
	cover?: string;
	externalRating?: number;
	summary?: string;
	runtime?: number;
	director?: string;
	platforms?: string[];
	developer?: string;
	publisher?: string;
	mediaType?: string;
	episodes?: number;
	studio?: string;
	chapters?: number;
	volumes?: number;
	author?: string;
	pages?: number;
	isbn?: string;
	literaryType?: string;
}

export interface Provider {
	search(query: string): Promise<SearchResult[]>;
	getDetails(id: string | number): Promise<MediaDetails>;
}
