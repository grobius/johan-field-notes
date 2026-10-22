const STORAGE_KEY = 'field-notes-visitor-v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type LikeState = { count: number; liked: boolean };
class LikeError extends Error {}

export function initArticleActions(panel: HTMLElement) {
  const like = panel.querySelector<HTMLButtonElement>('[data-like]')!;
  const count = panel.querySelector<HTMLElement>('[data-like-count]')!;
  const label = panel.querySelector<HTMLElement>('[data-like-label]')!;
  const feedback = panel.querySelector<HTMLElement>('[data-like-feedback]')!;
  const shareFeedback = panel.querySelector<HTMLElement>('[data-share-feedback]')!;
  const share = panel.querySelector<HTMLButtonElement>('[data-native-share]')!;
  const menu = panel.querySelector<HTMLDetailsElement>('[data-share-menu]')!;
  const copy = panel.querySelector<HTMLButtonElement>('[data-copy]')!;
  const fallback = panel.querySelector<HTMLElement>('[data-copy-fallback]')!;
  const url = panel.dataset.shareUrl!;
  const title = panel.dataset.shareTitle!;
  const endpoint = `/api/likes?${new URLSearchParams({ post: panel.dataset.postId! })}`;
  let state: LikeState = { count: 0, liked: false };
  let ready = false;
  let busy = false;

  function visitor(create = false) {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && UUID.test(saved)) return saved;
    if (!create) return '';
    const id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  }
  function paint() {
    like.disabled = busy;
    like.setAttribute('aria-busy', String(busy));
    like.setAttribute('aria-pressed', String(state.liked));
    label.textContent = ready ? state.liked ? 'Liked' : 'Like' : busy ? 'Loading…' : 'Retry likes';
    count.textContent = ready ? new Intl.NumberFormat('en').format(state.count) : '—';
    count.setAttribute('aria-label', ready ? `${state.count} likes` : 'Like count unavailable');
  }
  async function request(liked?: boolean): Promise<LikeState> {
    let id = '';
    try { id = visitor(liked !== undefined); }
    catch { if (liked !== undefined) throw new LikeError('Allow browser storage to save your like.'); }
    const response = await fetch(endpoint, {
      method: liked === undefined ? 'GET' : 'PUT', mode: 'same-origin', credentials: 'same-origin', cache: 'no-store',
      signal: AbortSignal.timeout(8000),
      headers: { ...(id ? { 'X-Visitor-ID': id } : {}), ...(liked === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(liked === undefined ? {} : { body: JSON.stringify({ liked }) }),
    });
    if (!response.ok) throw new LikeError(response.status === 429 ? 'Please wait a minute and try again.' : 'Likes are temporarily unavailable. Please retry.');
    const result = await response.json();
    if (!result || !Number.isSafeInteger(result.count) || result.count < 0 || typeof result.liked !== 'boolean') throw new LikeError('Likes are temporarily unavailable. Please retry.');
    return result;
  }
  async function load() {
    if (busy) return;
    busy = true; paint();
    try { state = await request(); ready = true; feedback.textContent = ''; }
    catch (error) { ready = false; feedback.textContent = error instanceof LikeError ? error.message : 'Likes are temporarily unavailable. Please retry.'; }
    finally { busy = false; paint(); }
  }
  like.addEventListener('click', async () => {
    if (busy) return;
    if (!ready) { await load(); return; }
    busy = true; paint();
    try {
      state = await request(!state.liked);
      feedback.textContent = state.liked ? 'Thanks for the like.' : 'Like removed.';
    } catch (error) {
      // A timed-out response may still have saved. Reconcile before allowing a retry.
      try { state = await request(); } catch { ready = false; }
      feedback.textContent = error instanceof LikeError ? error.message : 'Could not confirm your change. Please retry.';
    } finally { busy = false; paint(); }
  });
  window.addEventListener('focus', () => { if (ready) void load(); });
  window.addEventListener('storage', event => { if (event.key === STORAGE_KEY) void load(); });
  void load();

  copy.hidden = false;
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(url);
      fallback.hidden = true;
      shareFeedback.textContent = 'Link copied.';
    } catch {
      fallback.hidden = false;
      const input = fallback.querySelector('input')!;
      input.focus(); input.select();
      shareFeedback.textContent = 'Select and copy the link below.';
    }
  });
  if (typeof navigator.share === 'function') {
    share.hidden = false;
    panel.querySelector<HTMLElement>('[data-menu-label]')!.textContent = 'More';
    share.addEventListener('click', async () => {
      try { await navigator.share({ title, url }); }
      catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        menu.open = true;
        menu.querySelector<HTMLAnchorElement>('a')?.focus();
        shareFeedback.textContent = 'Choose a sharing option below.';
      }
    });
  }
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary')!.focus(); }
  });
  document.addEventListener('click', event => { if (event.target instanceof Node && !menu.contains(event.target)) menu.open = false; });
}
