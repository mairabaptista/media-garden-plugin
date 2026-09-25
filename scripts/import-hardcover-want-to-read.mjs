#!/usr/bin/env node
// One-off import: pulls your Hardcover "Want to Read" shelf into Media Garden book notes.
// Usage:
//   HARDCOVER_TOKEN=<token> VAULT_PATH=/path/to/vault node scripts/import-hardcover-want-to-read.mjs
// Optional: BASE_FOLDER=Media (must match the plugin's "Base folder" setting, default "Media")

import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";

async function gql(token, query, variables) {
	const res = await fetch("https://api.hardcover.app/v1/graphql", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
			"User-Agent": "media-garden-plugin import script (personal use)",
		},
		body: JSON.stringify({ query, variables }),
	});
	const json = await res.json();
	if (json.errors?.length) throw new Error(json.errors[0].message);
	return json.data;
}

export function sanitize(name) {
	return name.replace(/[\\/:*?"<>|]/g, "").trim();
}

function nowTimestamp() {
	const d = new Date();
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function yamlString(s) {
	return `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function buildFrontmatter(book) {
	return [
		`ContentType: media`,
		`type: book`,
		`title: ${yamlString(book.title)}`,
		`year: ${book.release_year ?? ""}`,
		`genres: []`,
		`cover: ${book.image?.url ? yamlString(book.image.url) : ""}`,
		`external_rating: ${book.rating ? (book.rating * 2).toFixed(2) : ""}`,
		`created: ${nowTimestamp()}`,
		`status: planning`,
		`rating: ""`,
		`date_started: ""`,
		`date_finished: ""`,
		`digital_copy: false`,
		`author: ${book.contributions?.[0]?.author?.name ? yamlString(book.contributions[0].author.name) : ""}`,
		`pages: ${book.pages ?? ""}`,
		`physical_copy: false`,
	].join("\n");
}

export function buildBody(book) {
	return ["## Summary", "", book.description ?? "", "", "## Quotes", "", "## Notes", "", "## Review", ""].join("\n");
}

async function fileExists(p) {
	try {
		await access(p);
		return true;
	} catch {
		return false;
	}
}

async function main() {
	const TOKEN = process.env.HARDCOVER_TOKEN;
	const VAULT_PATH = process.env.VAULT_PATH;
	const BASE_FOLDER = process.env.BASE_FOLDER || "Media";

	if (!TOKEN || !VAULT_PATH) {
		console.error(
			"Usage: HARDCOVER_TOKEN=<token> VAULT_PATH=<path to vault> node scripts/import-hardcover-want-to-read.mjs"
		);
		process.exit(1);
	}

	const me = await gql(TOKEN, `query { me { id } }`, {});
	const userId = me.me?.id;
	if (!userId) throw new Error("Could not resolve your Hardcover user id from the `me` query.");

	const data = await gql(
		TOKEN,
		`query WantToRead($userId: Int!) {
			user_books(where: { user_id: { _eq: $userId }, status_id: { _eq: 1 } }, limit: 500) {
				book {
					title
					description
					rating
					pages
					release_year
					image { url }
					contributions { author { name } }
				}
			}
		}`,
		{ userId }
	);

	const books = (data.user_books ?? []).map((ub) => ub.book).filter(Boolean);
	console.log(`Found ${books.length} "Want to Read" books.`);

	const folder = path.join(VAULT_PATH, BASE_FOLDER, "Books");
	await mkdir(folder, { recursive: true });

	let created = 0;
	let skipped = 0;
	for (const book of books) {
		const titlePart = sanitize(book.title) || "Untitled";
		const filename = book.release_year ? `${titlePart} (${book.release_year}).md` : `${titlePart}.md`;
		const filePath = path.join(folder, filename);

		if (await fileExists(filePath)) {
			skipped++;
			continue;
		}

		const content = `---\n${buildFrontmatter(book)}\n---\n\n${buildBody(book)}`;
		await writeFile(filePath, content, "utf8");
		created++;
		console.log(`Created: ${filename}`);
	}

	console.log(`Done. ${created} created, ${skipped} already existed and were left untouched.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((err) => {
		console.error("Import failed:", err.message);
		process.exit(1);
	});
}
