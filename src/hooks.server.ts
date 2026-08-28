import type { Handle } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";

export const handle: Handle = async ({ event, resolve }) => {
  const accessKey = env.ACCESS_KEY;

  if (accessKey) {
    const key = event.url.searchParams.get("key");
    if (key !== accessKey) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  return resolve(event);
};
