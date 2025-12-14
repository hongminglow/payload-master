import { getPayload } from "payload";
import configPromise from "@payload-config";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Custom API example (does NOT replace Payload's built-in /api/posts CRUD)
// GET  /api/custom/posts  -> list posts
// POST /api/custom/posts  -> create a post with custom logic

export async function GET(req: Request) {
  const payload = await getPayload({ config: configPromise });
  const url = new URL(req.url);

  const limit = Number(url.searchParams.get("limit") ?? "10");

  const result = await payload.find({
    collection: "posts",
    limit: Number.isFinite(limit) ? limit : 10,
    depth: 1,
    overrideAccess: true,
  });

  return Response.json({
    source: "custom-api",
    note: "This response is from /api/custom/posts (custom route), not Payload's built-in CRUD.",
    ...result,
  });
}

export async function POST(req: Request) {
  const payload = await getPayload({ config: configPromise });
  const body = await req.json().catch(() => ({}));

  const title = typeof body.title === "string" ? body.title : "Custom API Post";
  const slug = typeof body.slug === "string" ? body.slug : slugify(title);

  // Demo override logic: if caller doesn't provide authorId, create/use an "API Bot" author.
  let authorId = body.authorId;
  if (authorId === undefined || authorId === null || authorId === "") {
    const existing = await payload.find({
      collection: "authors",
      where: { name: { equals: "API Bot" } },
      limit: 1,
      overrideAccess: true,
    });

    if (existing.docs[0]?.id) {
      authorId = existing.docs[0].id;
    } else {
      const createdAuthor = await payload.create({
        collection: "authors",
        data: { name: "API Bot", bio: "Created automatically by /api/custom/posts" },
        overrideAccess: true,
      });
      authorId = createdAuthor.id;
    }
  }

  const created = await payload.create({
    collection: "posts",
    data: {
      title,
      slug,
      excerpt: typeof body.excerpt === "string" ? body.excerpt : "Created by custom API",
      status: body.status === "published" ? "published" : "draft",
      author: authorId,
      categories: Array.isArray(body.categoryIds) ? body.categoryIds : undefined,
      publishedOn: body.status === "published" ? new Date().toISOString() : undefined,
    },
    overrideAccess: true,
  });

  return Response.json({
    source: "custom-api",
    created,
  });
}
