import type { MediaGardenSettings } from "../settings";
import type { MediaType, Provider } from "../types";
import { TmdbProvider } from "./tmdb";
import { RawgProvider } from "./rawg";
import { TenraiProvider } from "./tenrai";
import { HardcoverProvider } from "./hardcover";

export function getProvider(type: MediaType, settings: MediaGardenSettings): Provider {
	switch (type) {
		case "movie":
			return new TmdbProvider(settings.tmdbApiKey);
		case "game":
			return new RawgProvider(settings.rawgApiKey);
		case "anime":
			return new TenraiProvider("anime");
		case "manga":
			return new TenraiProvider("manga");
		case "book":
			return new HardcoverProvider(settings.hardcoverToken);
	}
}
