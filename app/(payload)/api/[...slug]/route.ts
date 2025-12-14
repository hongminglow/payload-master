/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import config from "@payload-config";
import "@payloadcms/next/css";
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from "@payloadcms/next/routes";

const GETHandler = REST_GET(config);
const POSTHandler = REST_POST(config);
const DELETEHandler = REST_DELETE(config);
const PATCHHandler = REST_PATCH(config);
const PUTHandler = REST_PUT(config);
const OPTIONSHandler = REST_OPTIONS(config);

export const GET = GETHandler;

// Demo: intercept the built-in Payload CRUD route for creating posts.
// This runs *before* Payload handles the request.
export const POST = async (req: Request, ctx: any) => {
  try {
    const url = new URL(req.url);

    // Payload REST create for Posts is POST /api/posts
    if (url.pathname.endsWith("/api/posts")) {
      const clone = req.clone();
      const body = await clone.json().catch(() => undefined);
      const title =
        body && typeof body.title === "string" ? body.title : undefined;

      console.log("[REST OVERRIDE] POST /api/posts (create)", {
        title,
      });
    }
  } catch {
    // ignore logging errors
  }

  return POSTHandler(req, ctx);
};

export const DELETE = DELETEHandler;
export const PATCH = PATCHHandler;
export const PUT = PUTHandler;
export const OPTIONS = OPTIONSHandler;
