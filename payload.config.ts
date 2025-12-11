import sharp from "sharp";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import type {
  CollectionConfig,
  CollectionSlug,
  Endpoint,
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
} from "payload";

// ============================================================================
// TYPED SLUGS for relationship fields (avoid TS strict mode errors)
// ============================================================================
const postsSlug = "posts" as CollectionSlug;
const authorsSlug = "authors" as CollectionSlug;
const categoriesSlug = "categories" as CollectionSlug;

// ============================================================================
// HOOKS SHOWCASE - demonstrates Payload's powerful hook system
// ============================================================================

// Log after any Author is created/updated
const logAfterAuthorChange: CollectionAfterChangeHook = ({
  doc,
  operation,
  req,
}) => {
  console.log(`[HOOK] Author ${operation}: ID=${doc.id}, Name="${doc.name}"`);
  return doc;
};

// Log before any Post is created/updated (can also mutate data)
const logBeforePostChange: CollectionBeforeChangeHook = ({
  data,
  operation,
  req,
}) => {
  console.log(
    `[HOOK] Post ${operation}: Title="${data.title}", Status="${data.status}"`
  );
  // You could mutate data here, e.g., auto-generate slug
  return data;
};

// Log after any Post is created/updated
const logAfterPostChange: CollectionAfterChangeHook = ({ doc, operation }) => {
  console.log(`[HOOK] Post ${operation} complete: ID=${doc.id}`);
  if (operation === "create") {
    console.log(
      `[HOOK] 🎉 New post created! Consider sending a notification or webhook.`
    );
  }
  return doc;
};

// ============================================================================
// CUSTOM ENDPOINTS - demonstrates extending Payload's REST API
// ============================================================================

// Custom endpoint: GET /api/posts/stats - returns post statistics
const postsStatsEndpoint: Endpoint = {
  path: "/stats",
  method: "get",
  handler: async (req) => {
    console.log("[CUSTOM API] /api/posts/stats called");

    const allPosts = await req.payload.find({
      collection: "posts",
      limit: 1000,
      depth: 0,
    });

    const stats = {
      total: allPosts.totalDocs,
      published: allPosts.docs.filter((p) => p.status === "published").length,
      draft: allPosts.docs.filter((p) => p.status === "draft").length,
      timestamp: new Date().toISOString(),
    };

    console.log("[CUSTOM API] Stats calculated:", stats);
    return Response.json(stats);
  },
};

// Custom endpoint: POST /api/posts/publish-all - bulk publish drafts
const publishAllEndpoint: Endpoint = {
  path: "/publish-all",
  method: "post",
  handler: async (req) => {
    console.log("[CUSTOM API] /api/posts/publish-all called");

    const drafts = await req.payload.find({
      collection: "posts",
      where: { status: { equals: "draft" } },
      limit: 100,
    });

    let publishedCount = 0;
    for (const post of drafts.docs) {
      await req.payload.update({
        collection: "posts",
        id: post.id,
        data: { status: "published" },
      });
      publishedCount++;
      console.log(`[CUSTOM API] Published: "${post.title}"`);
    }

    return Response.json({
      message: `Published ${publishedCount} posts`,
      publishedCount,
    });
  },
};

// Root-level custom endpoint: GET /api/health
const healthEndpoint: Endpoint = {
  path: "/health",
  method: "get",
  handler: () => {
    console.log("[CUSTOM API] Health check called");
    return Response.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      payload: "running",
    });
  },
};

// ============================================================================
// COLLECTIONS
// ============================================================================

const collections: CollectionConfig[] = [
  // ----------------------------------------------------------------------------
  // AUTHORS - Simple collection with hooks
  // ----------------------------------------------------------------------------
  {
    slug: "authors",
    labels: { singular: "Author", plural: "Authors" },
    admin: { useAsTitle: "name" },
    hooks: {
      afterChange: [logAfterAuthorChange],
    },
    fields: [
      { name: "name", type: "text", required: true },
      { name: "bio", type: "textarea" },
      { name: "avatar", type: "text", label: "Avatar URL" },
    ],
  },

  // ----------------------------------------------------------------------------
  // CATEGORIES - Demonstrates relationship field
  // ----------------------------------------------------------------------------
  {
    slug: "categories",
    labels: { singular: "Category", plural: "Categories" },
    admin: { useAsTitle: "title" },
    fields: [
      { name: "title", type: "text", required: true },
      { name: "description", type: "textarea" },
      {
        name: "posts",
        type: "relationship",
        relationTo: postsSlug,
        hasMany: true,
        label: "Related Posts",
      },
    ],
  },

  // ----------------------------------------------------------------------------
  // POSTS - Main collection with hooks and custom endpoints
  // ----------------------------------------------------------------------------
  {
    slug: "posts",
    labels: { singular: "Post", plural: "Posts" },
    admin: { useAsTitle: "title" },
    hooks: {
      beforeChange: [logBeforePostChange],
      afterChange: [logAfterPostChange],
    },
    endpoints: [postsStatsEndpoint, publishAllEndpoint],
    fields: [
      { name: "title", type: "text", required: true },
      { name: "slug", type: "text", required: true, index: true, unique: true },
      { name: "excerpt", type: "textarea" },
      {
        name: "content",
        type: "richText",
        editor: lexicalEditor(),
      },
      {
        name: "author",
        type: "relationship",
        relationTo: authorsSlug,
        required: true,
      },
      {
        name: "categories",
        type: "relationship",
        relationTo: categoriesSlug,
        hasMany: true,
      },
      { name: "publishedOn", type: "date" },
      {
        name: "status",
        type: "select",
        defaultValue: "draft",
        options: [
          { label: "Draft", value: "draft" },
          { label: "Published", value: "published" },
        ],
      },
    ],
  },

  // ----------------------------------------------------------------------------
  // FIELD SHOWCASE - Demonstrates Payload's amazing field types
  // ----------------------------------------------------------------------------
  {
    slug: "field-showcase",
    labels: { singular: "Field Showcase", plural: "Field Showcases" },
    admin: {
      useAsTitle: "title",
      description: "Demonstrates various Payload field types and components",
    },
    fields: [
      // Group: Basic Fields
      {
        type: "collapsible",
        label: "📝 Basic Text Fields",
        admin: { initCollapsed: false },
        fields: [
          { name: "title", type: "text", required: true, label: "Title" },
          {
            name: "email",
            type: "email",
            label: "Email Address",
            admin: { description: "Validates email format automatically" },
          },
          {
            name: "description",
            type: "textarea",
            label: "Description",
            admin: { description: "Multi-line text input" },
          },
          {
            name: "code",
            type: "code",
            label: "Code Snippet",
            admin: {
              language: "typescript",
              description: "Syntax-highlighted code editor",
            },
          },
        ],
      },

      // Group: Number & Date Fields
      {
        type: "collapsible",
        label: "🔢 Numbers & Dates",
        admin: { initCollapsed: true },
        fields: [
          {
            name: "quantity",
            type: "number",
            label: "Quantity",
            min: 0,
            max: 1000,
            admin: { step: 1, description: "Number with min/max validation" },
          },
          {
            name: "price",
            type: "number",
            label: "Price",
            admin: { step: 0.01, description: "Decimal number" },
          },
          {
            name: "eventDate",
            type: "date",
            label: "Event Date",
            admin: {
              date: { pickerAppearance: "dayOnly" },
              description: "Date picker (day only)",
            },
          },
          {
            name: "eventDateTime",
            type: "date",
            label: "Event Date & Time",
            admin: {
              date: { pickerAppearance: "dayAndTime" },
              description: "Date picker with time",
            },
          },
        ],
      },

      // Group: Selection Fields
      {
        type: "collapsible",
        label: "🎯 Selection Fields",
        admin: { initCollapsed: true },
        fields: [
          {
            name: "priority",
            type: "select",
            label: "Priority",
            options: [
              { label: "🔴 High", value: "high" },
              { label: "🟡 Medium", value: "medium" },
              { label: "🟢 Low", value: "low" },
            ],
            admin: { description: "Single select dropdown" },
          },
          {
            name: "tags",
            type: "select",
            label: "Tags",
            hasMany: true,
            options: [
              { label: "Featured", value: "featured" },
              { label: "New", value: "new" },
              { label: "Sale", value: "sale" },
              { label: "Popular", value: "popular" },
            ],
            admin: { description: "Multi-select dropdown" },
          },
          {
            name: "status",
            type: "radio",
            label: "Status",
            options: [
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
              { label: "Pending", value: "pending" },
            ],
            admin: { description: "Radio button group" },
          },
          {
            name: "isPublished",
            type: "checkbox",
            label: "Published",
            admin: { description: "Boolean checkbox" },
          },
        ],
      },

      // Group: Rich Content
      {
        type: "collapsible",
        label: "✨ Rich Content",
        admin: { initCollapsed: true },
        fields: [
          {
            name: "richContent",
            type: "richText",
            label: "Rich Text Editor",
            editor: lexicalEditor(),
            admin: {
              description:
                "Full-featured Lexical editor with formatting, links, lists, etc.",
            },
          },
          {
            name: "jsonData",
            type: "json",
            label: "JSON Data",
            admin: { description: "Raw JSON editor" },
          },
        ],
      },

      // Group: Advanced Fields
      {
        type: "collapsible",
        label: "🚀 Advanced Fields",
        admin: { initCollapsed: true },
        fields: [
          {
            name: "point",
            type: "point",
            label: "Location (Lat/Lng)",
            admin: { description: "Geographic point coordinates" },
          },
          {
            name: "socialLinks",
            type: "array",
            label: "Social Links",
            admin: { description: "Repeatable array of items" },
            fields: [
              {
                name: "platform",
                type: "select",
                options: [
                  { label: "Twitter", value: "twitter" },
                  { label: "LinkedIn", value: "linkedin" },
                  { label: "GitHub", value: "github" },
                ],
              },
              { name: "url", type: "text" },
            ],
          },
          {
            name: "relatedAuthor",
            type: "relationship",
            relationTo: authorsSlug,
            label: "Related Author",
            admin: { description: "Relationship to another collection" },
          },
        ],
      },

      // Group: Layout Fields
      {
        type: "row",
        fields: [
          {
            name: "column1",
            type: "text",
            label: "Column 1",
            admin: { width: "50%", description: "Left column" },
          },
          {
            name: "column2",
            type: "text",
            label: "Column 2",
            admin: { width: "50%", description: "Right column" },
          },
        ],
      },
    ],
  },
];

// ============================================================================
// PAYLOAD CONFIG
// ============================================================================

export default buildConfig({
  editor: lexicalEditor(),
  collections,
  // Root-level custom endpoints
  endpoints: [healthEndpoint],
  admin: {
    // Custom admin components would go here
    // Note: SaveButton override requires proper component path registration
  },
  secret: process.env.PAYLOAD_SECRET || "dev-secret-change-in-production",
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URL || "file:./payload.sqlite",
      authToken: process.env.DATABASE_AUTH_TOKEN,
    },
  }),
  sharp,
});
