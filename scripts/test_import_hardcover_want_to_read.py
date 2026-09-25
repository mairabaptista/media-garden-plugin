from import_hardcover_want_to_read import sanitize, build_frontmatter, build_body

# sanitize: strips filesystem-unsafe characters
assert sanitize('Dune: Part Two?') == "Dune Part Two"

# build_frontmatter: full record
full = build_frontmatter({
    "title": 'The "Great" Gatsby',
    "release_year": 1925,
    "rating": 4.2,
    "pages": 180,
    "image": {"url": "https://covers.example/gatsby.jpg"},
    "contributions": [{"author": {"name": "F. Scott Fitzgerald"}}],
})
assert 'title: "The \\"Great\\" Gatsby"' in full
assert "year: 1925" in full
assert "external_rating: 8.4" in full  # 4.2 * 2, normalized to the 0-10 scale
assert 'author: "F. Scott Fitzgerald"' in full
assert "pages: 180" in full
assert "status: planning" in full

# build_frontmatter: missing rating/cover/author/pages should emit blanks, not crash
sparse = build_frontmatter({"title": "Untitled Draft"})
assert "external_rating: \n" in sparse
assert "cover: \n" in sparse
assert "author: \n" in sparse
assert "pages: \n" in sparse

# build_body: description flows into the Summary section
body = build_body({"description": "A short synopsis."})
assert "## Summary\n\nA short synopsis." in body
assert "## Quotes" in body
assert "## Review" in body

print("All checks passed.")
