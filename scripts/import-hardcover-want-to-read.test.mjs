import assert from "node:assert";
import { sanitize, buildFrontmatter, buildBody } from "./import-hardcover-want-to-read.mjs";

// sanitize: strips filesystem-unsafe characters
assert.equal(sanitize('Dune: Part Two?'), "Dune Part Two");

// buildFrontmatter: full record
const full = buildFrontmatter({
	title: 'The "Great" Gatsby',
	release_year: 1925,
	rating: 4.2,
	pages: 180,
	image: { url: "https://covers.example/gatsby.jpg" },
	contributions: [{ author: { name: "F. Scott Fitzgerald" } }],
});
assert.match(full, /title: "The \\"Great\\" Gatsby"/);
assert.match(full, /year: 1925/);
assert.match(full, /external_rating: 8\.40/); // 4.2 * 2, normalized to the 0-10 scale
assert.match(full, /author: "F\. Scott Fitzgerald"/);
assert.match(full, /pages: 180/);
assert.match(full, /status: planning/);

// buildFrontmatter: missing rating/cover/author/pages should emit blanks, not crash
const sparse = buildFrontmatter({ title: "Untitled Draft" });
assert.match(sparse, /external_rating: \n/);
assert.match(sparse, /cover: \n/);
assert.match(sparse, /author: \n/);
assert.match(sparse, /pages: \n/);

// buildBody: description flows into the Summary section
const body = buildBody({ description: "A short synopsis." });
assert.match(body, /## Summary\n\nA short synopsis\./);
assert.match(body, /## Quotes/);
assert.match(body, /## Review/);

console.log("All checks passed.");
