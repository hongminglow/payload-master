import sharp from "sharp";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import { sqliteAdapter } from "@payloadcms/db-sqlite";

export default buildConfig({
  // If you'd like to use Rich Text, pass your editor here
  editor: lexicalEditor(),

  // Define and configure your collections in this array
  collections: [],

  // Your Payload secret - should be a complex and secure string, unguessable
  secret: process.env.PAYLOAD_SECRET || "",
  // Whichever Database Adapter you're using should go here
  // Mongoose is shown as an example, but you can also use Postgres
  // Use SQLite for local/dev usage. Set `DATABASE_URL` (e.g. file:./payload.sqlite) in env to override.
  db: sqliteAdapter({
    client: {
      // Default to a local file; for Turso/libsql provide an authToken as well.
      url: process.env.DATABASE_URL || "file:./payload.sqlite",
      authToken: process.env.DATABASE_AUTH_TOKEN,
    },
  }),
  // If you want to resize images, crop, set focal point, etc.
  // make sure to install it and pass it to the config.
  // This is optional - if you don't need to do these things,
  // you don't need it!
  sharp,
});
