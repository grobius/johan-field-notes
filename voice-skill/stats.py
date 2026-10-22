"""Measure style features per language and cut sample batches for LLM analysis.

Usage:
    python stats.py [--batch-size 30] [--batches 4]

Reads  data/corpus.jsonl
Writes data/style_stats.md        measured habits per language (paste into the merge prompt)
       data/batches/<lang>_NN.md  redacted samples to analyse, one batch per chat message

Standard library only.
"""
import argparse
import json
import random
import re
import statistics
from collections import Counter
from pathlib import Path

from prepare import DATA, EN_WORDS, SV_WORDS

GREETING = re.compile(r"^(?:hej\w*|hallå|tjen\w*|god (?:morgon|dag|kväll)|hi|hello|hey|dear|morning)\b.{0,40}$",
                      re.IGNORECASE)
SENTENCE_END = re.compile(r"(?<=[.!?])\s+")
EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿]|[:;]-?[)(DP]")
BULLET = re.compile(r"^\s*(?:[-*•]|\d+[.)])\s+", re.MULTILINE)
# English words that commonly creep into Swedish business writing, beyond plain function words.
ANGLICISMS = set(
    "meeting deadline feedback update team call check deal business case nice cool ok okay sorry anyway basically "
    "actually workshop roadmap pitch leads stuff boost insights issue follow up asap fyi btw sync scope offer "
    "budget mindset challenge performance".split()
)
FIRST_PERSON = {"sv": ({"jag", "mig", "min", "mitt", "mina"}, {"vi", "oss", "vår", "vårt", "våra"}),
                "en": ({"i", "me", "my", "mine"}, {"we", "us", "our", "ours"})}
STOP = SV_WORDS | EN_WORDS | {"i", "är", "it's", "i'm"}


def words(text):
    return re.findall(r"[\wåäöéü']+", text.lower())


def per_k(n, total):
    return f"{1000 * n / total:.1f}" if total else "0"


def split_greeting(text):
    lines = text.split("\n", 1)
    if GREETING.match(lines[0].strip()):
        return lines[0].strip(), lines[1].strip() if len(lines) > 1 else ""
    return "", text


def describe(mails, lang):
    texts = [m["text"] for m in mails]
    all_words = [w for t in texts for w in words(t)]
    total = len(all_words)
    sentences = [s for t in texts for s in SENTENCE_END.split(t.replace("\n", " ")) if s.strip()]
    sentence_lengths = [len(s.split()) for s in sentences]
    paragraphs = [p for t in texts for p in re.split(r"\n\s*\n", t) if p.strip()]

    greetings = Counter()
    openers = Counter()
    for t in texts:
        greeting, rest = split_greeting(t)
        greetings[re.sub(r"\[NAME\]|[\s,!.]+$", "", greeting.lower()).strip() or "(none)"] += 1
        first = " ".join(words(rest)[:3])
        if first:
            openers[first] += 1
    closings = Counter((m["closing"].lower() or "(none)") for m in mails)

    trigrams = Counter()
    for t in texts:
        w = words(t)
        for i in range(len(w) - 2):
            gram = w[i:i + 3]
            if not all(x in STOP for x in gram) and "name" not in gram:
                trigrams[" ".join(gram)] += 1

    joined = "\n".join(texts)
    singular, plural = FIRST_PERSON[lang]
    n_sing = sum(w in singular for w in all_words)
    n_plur = sum(w in plural for w in all_words)

    out = [
        f"## {'Swedish' if lang == 'sv' else 'English'} ({len(mails)} mails, {total} words)",
        "",
        f"- Kinds: {dict(Counter(m['kind'] for m in mails))}",
        f"- Mail length, median words: {statistics.median(m['words'] for m in mails):.0f}",
        f"- Sentence length, words: median {statistics.median(sentence_lengths):.0f}, "
        f"mean {statistics.mean(sentence_lengths):.1f}, share over 25 words "
        f"{100 * sum(n > 25 for n in sentence_lengths) / len(sentence_lengths):.0f}%",
        f"- Paragraph length, words: median {statistics.median(len(p.split()) for p in paragraphs):.0f}",
        f"- Per 1000 words: '!' {per_k(joined.count('!'), total)}, '?' {per_k(joined.count('?'), total)}, "
        f"dashes {per_k(len(re.findall(r' [–—-] ', joined)), total)}, '...' {per_k(joined.count('...') + joined.count('…'), total)}, "
        f"parentheses {per_k(joined.count('('), total)}, emoji/smileys {per_k(len(EMOJI.findall(joined)), total)}",
        f"- Mails with bullet or numbered lists: {100 * sum(bool(BULLET.search(t)) for t in texts) / len(texts):.0f}%",
        f"- First person singular vs plural: {n_sing} vs {n_plur}",
        "",
        "Greetings: " + ", ".join(f"{g} ({n})" for g, n in greetings.most_common(10)),
        "",
        "Closings: " + ", ".join(f"{c} ({n})" for c, n in closings.most_common(10)),
        "",
        "First three words after the greeting: " + ", ".join(f"\"{o}\" ({n})" for o, n in openers.most_common(15)),
        "",
        "Recurring phrases: " + ", ".join(f"\"{g}\" ({n})" for g, n in trigrams.most_common(30) if n >= 3),
        "",
    ]
    if lang == "sv":
        english = Counter(w for w in all_words if w in EN_WORDS | ANGLICISMS)
        out += ["English words in Swedish mail: " + ", ".join(f"{w} ({n})" for w, n in english.most_common(20)), ""]
    return out


def write_batches(mails, lang, size, count):
    rng = random.Random(42)
    longer = [m for m in mails if m["words"] >= 100] or mails
    rng.shuffle(longer)
    # Alternate business and private so each batch shows both registers.
    business = [m for m in longer if m["kind"] != "private"]
    private = [m for m in longer if m["kind"] == "private"]
    mixed = []
    while business or private:
        for pool in (business, business, private):
            if pool:
                mixed.append(pool.pop())
    folder = DATA / "batches"
    folder.mkdir(exist_ok=True)
    for f in folder.glob(f"{lang}_*.md"):
        f.unlink()
    written = 0
    for b in range(count):
        chunk = mixed[b * size:(b + 1) * size]
        if not chunk:
            break
        lines = [f"# {lang} batch {b + 1}", ""]
        for i, m in enumerate(chunk, 1):
            lines += [f"### Sample {i} ({m['kind']}, {m['sent'][:4]})", "", m["text"], ""]
        (folder / f"{lang}_{b + 1:02}.md").write_text("\n".join(lines), encoding="utf-8")
        written += 1
    return written


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--batch-size", type=int, default=30)
    parser.add_argument("--batches", type=int, default=4, help="batches per language")
    args = parser.parse_args()

    corpus = [json.loads(line) for line in (DATA / "corpus.jsonl").open(encoding="utf-8")]
    report = ["# Measured style", ""]
    for lang in ("sv", "en"):
        mails = [m for m in corpus if m["lang"] == lang]
        if not mails:
            continue
        report += describe(mails, lang)
        n = write_batches(mails, lang, args.batch_size, args.batches)
        print(f"{lang}: {len(mails)} mails, {n} batches in data/batches/")
    (DATA / "style_stats.md").write_text("\n".join(report), encoding="utf-8")
    print("Wrote data/style_stats.md")


if __name__ == "__main__":
    main()
