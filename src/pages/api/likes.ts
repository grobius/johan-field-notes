import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { env } from 'cloudflare:workers';
import { handleLikes } from '../../server/article-likes.mjs';

export const prerender = false;

export const ALL: APIRoute = async ({ request }) => {
  const notes = await getCollection('notes');
  const ids = notes.map(note => note.data.reactionId ?? note.id);
  if (new Set(ids).size !== ids.length) {
    return Response.json({ error: 'Likes temporarily unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  return handleLikes(request, env, new Set(ids));
};
