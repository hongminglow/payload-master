import { getPayload } from "payload";
import configPromise from "@payload-config";
import { headers } from "next/headers";

// ============================================================================
// Types for our data (using string | number for id to match Payload types)
// ============================================================================
interface Author {
  id: string | number;
  name: string;
  bio?: string | null;
  avatar?: string | null;
}

interface Category {
  id: string | number;
  title: string;
  description?: string | null;
}

interface Post {
  id: string | number;
  title: string;
  slug: string;
  excerpt?: string | null;
  status?: "draft" | "published" | null;
  publishedOn?: string | null;
  author?: Author | string | number | null;
  categories?: (Category | string | number)[] | null;
}

interface PostStats {
  total: number;
  published: number;
  draft: number;
  timestamp: string;
}

interface GraphQLResponse {
  data?: {
    Authors?: { docs: Author[] };
    Posts?: { docs: Post[] };
    Categories?: { docs: Category[] };
  };
  errors?: Array<{ message: string }>;
}

// ============================================================================
// Data Fetching Functions
// ============================================================================

async function getBaseUrlFromRequestHeaders(): Promise<string> {
  const h = await headers();

  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    return `${proto}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
}

// LOCAL API - Direct database access (most performant)
async function fetchWithLocalAPI() {
  const payload = await getPayload({ config: configPromise });

  const [authors, posts, categories] = await Promise.all([
    payload.find({ collection: "authors", limit: 10 }),
    payload.find({ collection: "posts", limit: 10, depth: 1 }),
    payload.find({ collection: "categories", limit: 10 }),
  ]);

  return {
    authors: authors.docs as Author[],
    posts: posts.docs as Post[],
    categories: categories.docs as Category[],
    totalAuthors: authors.totalDocs,
    totalPosts: posts.totalDocs,
    totalCategories: categories.totalDocs,
  };
}

// GRAPHQL - Query via GraphQL endpoint
async function fetchWithGraphQL(baseUrl: string): Promise<GraphQLResponse> {
  const query = `
    query DashboardData {
      Authors(limit: 10) {
        docs {
          id
          name
          bio
        }
      }
      Posts(limit: 10) {
        docs {
          id
          title
          slug
          excerpt
          status
          publishedOn
        }
      }
      Categories(limit: 10) {
        docs {
          id
          title
          description
        }
      }
    }
  `;

  try {
    const response = await fetch(`${baseUrl}/api/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      cache: "no-store",
    });

    return await response.json();
  } catch (error) {
    console.error("GraphQL fetch error:", error);
    return { errors: [{ message: "Failed to fetch GraphQL data" }] };
  }
}

// REST API - Fetch via custom endpoint
async function fetchPostStats(baseUrl: string): Promise<PostStats | null> {
  try {
    const response = await fetch(`${baseUrl}/api/posts/stats`, {
      cache: "no-store",
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// ============================================================================
// UI Components
// ============================================================================

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h3>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <span className="text-3xl">{icon}</span>
      <div>
        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {value}
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      </div>
    </div>
  );
}

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning";
}) {
  const colors = {
    default: "bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200",
    success:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    warning:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[variant]}`}
    >
      {children}
    </span>
  );
}

function SectionHeader({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle: string;
  badge: string;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {title}
        </h2>
        <Badge>{badge}</Badge>
      </div>
      <p className="mt-1 text-zinc-600 dark:text-zinc-400">{subtitle}</p>
    </div>
  );
}

// ============================================================================
// Main Dashboard Page
// ============================================================================

export default async function PayloadDashboard() {
  const baseUrl = await getBaseUrlFromRequestHeaders();

  // Fetch data using different methods
  let localData: Awaited<ReturnType<typeof fetchWithLocalAPI>> = {
    authors: [],
    posts: [],
    categories: [],
    totalAuthors: 0,
    totalPosts: 0,
    totalCategories: 0,
  };
  let localError: string | null = null;

  try {
    localData = await fetchWithLocalAPI();
  } catch (e) {
    console.error("Local API error:", e);
    localError =
      "Payload is not started yet, or the database is unavailable. Start the dev server and ensure migrations can run.";
  }

  const graphqlData = await fetchWithGraphQL(baseUrl);
  const postStats = await fetchPostStats(baseUrl);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                🚀 Payload + Next.js Dashboard
              </h1>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Showcasing Payload CMS integration with Next.js 15
              </p>
            </div>
            <a
              href="/admin"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
            >
              Open Admin Panel →
            </a>
          </div>
        </div>
      </header>

      {localError && (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-900 dark:border-yellow-900/40 dark:bg-yellow-950/40 dark:text-yellow-100">
            <p className="font-semibold">Development note</p>
            <p className="mt-1 text-sm">{localError}</p>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Overview */}
        <section className="mb-12">
          <SectionHeader
            title="📊 Overview"
            subtitle="Real-time statistics from your Payload CMS"
            badge="Local API"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon="👥"
              label="Authors"
              value={localData.totalAuthors}
            />
            <StatCard icon="📝" label="Posts" value={localData.totalPosts} />
            <StatCard
              icon="🏷️"
              label="Categories"
              value={localData.totalCategories}
            />
            <StatCard
              icon="✅"
              label="Published"
              value={postStats?.published ?? 0}
            />
          </div>
        </section>

        {/* Section 1: Local API */}
        <section className="mb-12">
          <SectionHeader
            title="🔌 Local API"
            subtitle="Direct database access - fastest method, runs on server"
            badge="Recommended"
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Authors */}
            <Card title="👥 Authors">
              {localData.authors.length === 0 ? (
                <p className="text-zinc-500 dark:text-zinc-400 italic">
                  No authors yet. Create one in the admin panel!
                </p>
              ) : (
                <ul className="space-y-3">
                  {localData.authors.map((author) => (
                    <li
                      key={author.id}
                      className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
                        {author.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {author.name}
                        </p>
                        {author.bio && (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate max-w-[200px]">
                            {author.bio}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Posts */}
            <Card title="📝 Posts">
              {localData.posts.length === 0 ? (
                <p className="text-zinc-500 dark:text-zinc-400 italic">
                  No posts yet. Create one in the admin panel!
                </p>
              ) : (
                <ul className="space-y-3">
                  {localData.posts.map((post) => (
                    <li
                      key={post.id}
                      className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800"
                    >
                      <div className="flex items-start justify-between">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {post.title}
                        </p>
                        <Badge
                          variant={
                            post.status === "published" ? "success" : "warning"
                          }
                        >
                          {post.status}
                        </Badge>
                      </div>
                      {post.excerpt && (
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                          {post.excerpt}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Categories */}
            <Card title="🏷️ Categories">
              {localData.categories.length === 0 ? (
                <p className="text-zinc-500 dark:text-zinc-400 italic">
                  No categories yet. Create one in the admin panel!
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {localData.categories.map((cat) => (
                    <span
                      key={cat.id}
                      className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                    >
                      {cat.title}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Code Example */}
          <Card title="💻 Code Example" className="mt-6">
            <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-sm text-zinc-100">
              <code>{`// Local API - Direct database access (Server Component)
import { getPayload } from "payload";
import configPromise from "@payload-config";

const payload = await getPayload({ config: configPromise });

const authors = await payload.find({
  collection: "authors",
  limit: 10,
});

const posts = await payload.find({
  collection: "posts",
  limit: 10,
  depth: 1, // Populate relationships
  where: { status: { equals: "published" } },
});`}</code>
            </pre>
          </Card>
        </section>

        {/* Section 2: GraphQL API */}
        <section className="mb-12">
          <SectionHeader
            title="🔮 GraphQL API"
            subtitle="Query exactly what you need with GraphQL"
            badge="Flexible"
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* GraphQL Results */}
            <Card title="📊 GraphQL Response">
              {graphqlData.errors ? (
                <div className="rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  <p className="font-medium">Error fetching GraphQL data</p>
                  <p className="text-sm">{graphqlData.errors[0]?.message}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Authors
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {graphqlData.data?.Authors?.docs?.length ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Posts
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {graphqlData.data?.Posts?.docs?.length ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Categories
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {graphqlData.data?.Categories?.docs?.length ?? 0}
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {/* GraphQL Code Example */}
            <Card title="💻 GraphQL Query">
              <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-sm text-zinc-100">
                <code>{`// GraphQL Query
const query = \`
  query DashboardData {
    Authors(limit: 10) {
      docs { id, name, bio }
    }
    Posts(limit: 10) {
      docs { id, title, status }
    }
    Categories(limit: 10) {
      docs { id, title }
    }
  }
\`;

const response = await fetch("/api/graphql", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query }),
});`}</code>
              </pre>
            </Card>
          </div>
        </section>

        {/* Section 3: Custom REST API */}
        <section className="mb-12">
          <SectionHeader
            title="⚡ Custom REST Endpoints"
            subtitle="Extend Payload with custom API routes"
            badge="Custom"
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Stats from Custom Endpoint */}
            <Card title="📈 Post Statistics (Custom Endpoint)">
              {postStats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                        {postStats.total}
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Total
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {postStats.published}
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Published
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                        {postStats.draft}
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Drafts
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    Last updated: {postStats.timestamp}
                  </p>
                </div>
              ) : (
                <p className="text-zinc-500 dark:text-zinc-400 italic">
                  Stats endpoint not available
                </p>
              )}
            </Card>

            {/* Custom Endpoint Code */}
            <Card title="💻 Custom Endpoint Definition">
              <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-sm text-zinc-100">
                <code>{`// In payload.config.ts
const postsStatsEndpoint: Endpoint = {
  path: "/stats",
  method: "get",
  handler: async (req) => {
    const posts = await req.payload.find({
      collection: "posts",
      limit: 1000,
    });

    return Response.json({
      total: posts.totalDocs,
      published: posts.docs.filter(
        p => p.status === "published"
      ).length,
    });
  },
};

// Add to collection
{
  slug: "posts",
  endpoints: [postsStatsEndpoint],
}`}</code>
              </pre>
            </Card>
          </div>
        </section>

        {/* Section 4: Features Showcase */}
        <section className="mb-12">
          <SectionHeader
            title="✨ Payload Features"
            subtitle="Key features demonstrated in this project"
            badge="Showcase"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "🪝",
                title: "Hooks",
                description:
                  "beforeChange & afterChange hooks for logging and data transformation",
              },
              {
                icon: "🔌",
                title: "Custom Endpoints",
                description:
                  "Extend REST API with custom routes like /api/posts/stats",
              },
              {
                icon: "🔮",
                title: "GraphQL",
                description: "Built-in GraphQL API with auto-generated schema",
              },
              {
                icon: "📝",
                title: "Rich Text (Lexical)",
                description:
                  "Full-featured editor with formatting, links, and more",
              },
              {
                icon: "🔗",
                title: "Relationships",
                description: "Connect collections with relationship fields",
              },
              {
                icon: "🎨",
                title: "Field Types",
                description:
                  "Text, number, date, select, array, JSON, and more",
              },
              {
                icon: "⚡",
                title: "Local API",
                description: "Direct database access in Server Components",
              },
              {
                icon: "🔐",
                title: "Type Safety",
                description: "Full TypeScript support with generated types",
              },
              {
                icon: "🎯",
                title: "Admin Panel",
                description: "Beautiful auto-generated admin UI",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{feature.icon}</span>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {feature.title}
                  </h3>
                </div>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Links */}
        <section>
          <Card title="🔗 Quick Links">
            <div className="flex flex-wrap gap-3">
              <a
                href="/admin"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
              >
                Admin Panel
              </a>
              <a
                href="/api/graphql-playground"
                className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-500 transition-colors"
              >
                GraphQL Playground
              </a>
              <a
                href="/api/posts"
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-600 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-500 transition-colors"
              >
                REST API: Posts
              </a>
              <a
                href="/api/authors"
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-600 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-500 transition-colors"
              >
                REST API: Authors
              </a>
              <a
                href="/api/posts/stats"
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors"
              >
                Custom: Post Stats
              </a>
              <a
                href="/api/health"
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors"
              >
                Custom: Health Check
              </a>
            </div>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-zinc-200 bg-white py-8 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-zinc-600 dark:text-zinc-400">
            Built with{" "}
            <a
              href="https://payloadcms.com"
              className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              Payload CMS
            </a>{" "}
            +{" "}
            <a
              href="https://nextjs.org"
              className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              Next.js 15
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
