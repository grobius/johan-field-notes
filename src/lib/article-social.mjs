export function canonicalUrl(pathname, site) {
  const url = new URL(pathname, site);
  url.search = '';
  url.hash = '';
  return url.href;
}

export function socialImagePath(image) {
  if (image?.startsWith('/images/') && /\.(svg|webp|png|jpe?g)$/i.test(image)) {
    return image.replace(/^\/images\//, '/social/') + '.jpg';
  }
  return '/social/field-notes.jpg';
}

export function shareLinks(title, url) {
  const link = (base, params) => `${base}?${new URLSearchParams(params)}`;
  return {
    linkedin: link('https://www.linkedin.com/sharing/share-offsite/', { url }),
    facebook: link('https://www.facebook.com/sharer/sharer.php', { u: url }),
    x: link('https://twitter.com/intent/tweet', { text: title, url }),
    bluesky: link('https://bsky.app/intent/compose', { text: `${title}\n${url}` }),
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${title}\n\n${url}`)}`,
  };
}
