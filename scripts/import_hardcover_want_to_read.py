#!/usr/bin/env python3
"""One-off import: pulls your Hardcover "Want to Read" shelf into Media Garden book notes.

Usage:
    HARDCOVER_TOKEN=<token> VAULT_PATH=/path/to/vault python3 scripts/import_hardcover_want_to_read.py

Optional: BASE_FOLDER=Media (must match the plugin's "Base folder" setting, default "Media")
"""

import json
import os
import re
import sys
import urllib.request
from datetime import datetime
from pathlib import Path

ENDPOINT = "https://api.hardcover.app/v1/graphql"


def gql(token: str, query: str, variables: dict) -> dict:
    auth = token if token.startswith("Bearer ") else f"Bearer {token}"
    body = json.dumps({"query": query, "variables": variables}).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": auth,
            "User-Agent": "media-garden-plugin import script (personal use)",
        },
    )
    with urllib.request.urlopen(req) as res:
        payload = json.load(res)
    if payload.get("errors"):
        raise RuntimeError(payload["errors"][0]["message"])
    return payload["data"]


def sanitize(name: str) -> str:
    return re.sub(r'[\\/:*?"<>|]', "", name).strip()


def now_timestamp() -> str:
    return datetime.now().strftime("%Y-%m-%dT%H:%M")


def yaml_string(value) -> str:
    return '"' + str(value).replace("\\", "\\\\").replace('"', '\\"') + '"'


def literary_type(literary_type_id) -> str | None:
    return {1: "Fiction", 2: "Nonfiction"}.get(literary_type_id)


def build_frontmatter(book: dict) -> str:
    author_list = book.get("contributions") or []
    author = author_list[0]["author"]["name"] if author_list and author_list[0].get("author") else None
    cover = (book.get("image") or {}).get("url")
    rating = book.get("rating")
    lit_type = literary_type(book.get("literary_type_id"))

    lines = [
        "ContentType: media",
        "type: book",
        f"title: {yaml_string(book['title'])}",
        f"year: {book.get('release_year') or ''}",
        "genres: []",
        f"cover: {yaml_string(cover) if cover else ''}",
        f"external_rating: {round(rating * 2, 2) if rating else ''}",
        f"created: {now_timestamp()}",
        "status: planning",
        'rating: ""',
        'date_started: ""',
        'date_finished: ""',
        "digital_copy: false",
        f"author: {yaml_string(author) if author else ''}",
        f"pages: {book.get('pages') or ''}",
        f"literary_type: {yaml_string(lit_type) if lit_type else ''}",
        "physical_copy: false",
    ]
    return "\n".join(lines)


def build_body(book: dict) -> str:
    return "\n".join(
        ["## Summary", "", book.get("description") or "", "", "## Quotes", "", "## Notes", "", "## Review", ""]
    )


def main() -> None:
    token = os.environ.get("HARDCOVER_TOKEN")
    vault_path = os.environ.get("VAULT_PATH")
    base_folder = os.environ.get("BASE_FOLDER", "Media")

    if not token or not vault_path:
        print(
            "Usage: HARDCOVER_TOKEN=<token> VAULT_PATH=<path to vault> "
            "python3 scripts/import_hardcover_want_to_read.py",
            file=sys.stderr,
        )
        sys.exit(1)

    me = gql(token, "query { me { id } }", {})
    user_id = me["me"][0]["id"]
    if not user_id:
        raise RuntimeError("Could not resolve your Hardcover user id from the `me` query.")

    data = gql(
        token,
        """
        query WantToRead($userId: Int!) {
            user_books(where: { user_id: { _eq: $userId }, status_id: { _eq: 1 } }, limit: 500) {
                book {
                    title
                    description
                    rating
                    pages
                    release_year
                    image { url }
                    contributions { author { name } }
                    literary_type_id
                }
            }
        }
        """,
        {"userId": user_id},
    )

    books = [ub["book"] for ub in (data.get("user_books") or []) if ub.get("book")]
    print(f'Found {len(books)} "Want to Read" books.')

    folder = Path(vault_path) / base_folder / "Books"
    folder.mkdir(parents=True, exist_ok=True)

    created = skipped = 0
    for book in books:
        title_part = sanitize(book["title"]) or "Untitled"
        year = book.get("release_year")
        filename = f"{title_part} ({year}).md" if year else f"{title_part}.md"
        file_path = folder / filename

        if file_path.exists():
            skipped += 1
            continue

        content = f"---\n{build_frontmatter(book)}\n---\n\n{build_body(book)}"
        file_path.write_text(content, encoding="utf-8")
        created += 1
        print(f"Created: {filename}")

    print(f"Done. {created} created, {skipped} already existed and were left untouched.")


if __name__ == "__main__":
    main()
