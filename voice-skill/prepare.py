"""Clean, language-tag, classify and redact the mail exported by extract_sent.ps1.

Usage:
    python prepare.py [--min-words 60] [--private-domains mydomain.se ...]

Reads  data/raw.jsonl
Writes data/corpus.jsonl        cleaned + redacted mail, one per line
       data/redaction_check.md  random sample to eyeball for leaks

Optional word lists, one entry per line:
    data/names.txt  extra words to redact (customers, projects, family names, ...)
    data/keep.txt   words that must never be redacted (e.g. a first name that is also a common word)

Standard library only.
"""
import argparse
import hashlib
import json
import random
import re
from collections import Counter
from pathlib import Path

DATA = Path(__file__).parent / "data"

# Everything from the first of these lines onwards is someone else's text or boilerplate.
REPLY_MARKER = re.compile(
    r"^\s*(?:"
    r"-{2,}\s*(?:Original Message|Ursprungligt meddelande|Forwarded message|Vidarebefordrat meddelande)"
    r"|_{10,}"
    r"|(?:From|Från|Von|Sent|Skickat):\s.+"
    r"|On .{5,150} wrote:"
    r"|Den .{5,150} skrev.{0,150}:"
    r"|(?:Sent from my|Skickat från min|Get Outlook|Hämta Outlook)\b.*"
    r"|>.*"
    r"|--\s*"
    r")$",
    re.IGNORECASE | re.MULTILINE,
)
DISCLAIMER = re.compile(
    r"^.*\b(?:confidential|konfidentiell|disclaimer|this e-?mail and any|detta e-?postmeddelande|sekretess)\b.*$",
    re.IGNORECASE | re.MULTILINE,
)
CLOSING = re.compile(
    r"^\s*(?:med vänlig(?:a)? hälsning(?:ar)?|vänlig(?:a)? hälsning(?:ar)?|mvh|hälsningar|hälsning"
    r"|ha det (?:bra|gott)|trevlig helg|tack(?: så mycket| på förhand)?"
    r"|best(?: regards)?|kind regards|regards|br|cheers|thanks|thank you|many thanks|all the best|best wishes"
    r"|/\s?\w+)[\s,.!]*$",
    re.IGNORECASE | re.MULTILINE,
)

EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
URL = re.compile(r"(?:https?://|www\.)\S+", re.IGNORECASE)
PERSONNUMMER = re.compile(r"\b(?:19|20)?\d{6}[-+]?\d{4}\b")
DIGIT_RUN = re.compile(r"(?<![\w])\+?\d[\d\s().-]{6,}\d(?![\w])")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

SV_WORDS = set(
    "och att det som en på är för med har inte jag till av den om vi de så kan men ett var vid eller "
    "från här mycket bara nu också skulle vill ska hade bra då när vad sig mig dig oss vår kommer finns".split()
)
EN_WORDS = set(
    "the and to of a in is that for it with as on be this are have not you we at but will can if your "
    "from our so would about there just do".split()
)
CONSUMER_DOMAINS = {
    "gmail.com", "googlemail.com", "hotmail.com", "hotmail.se", "outlook.com", "outlook.se", "live.com",
    "live.se", "msn.com", "yahoo.com", "yahoo.se", "icloud.com", "me.com", "mac.com", "telia.com",
    "spray.se", "bredband.net", "comhem.se", "bahnhof.se", "tele2.se", "passagen.se",
}
# Capitalised tokens in display names that are not personal names.
NOT_NAMES = {w.capitalize() for w in SV_WORDS | EN_WORDS} | {
    "Info", "Support", "Sales", "Team", "Admin", "Office", "Service", "Kundtjänst", "Ekonomi", "Faktura",
    "Invoice", "Noreply", "Mail", "Group", "Gruppen", "Kontor", "Contact", "Kontakt", "The", "And",
}
DOMAIN_NOISE = {"co", "com", "org", "net", "ac", "gov", "mail", "www", "se", "uk", "eu", "info"}


def own_text(body):
    """Strip quoted replies, signature, disclaimer; return (text, closing line)."""
    body = body.replace("\r\n", "\n").replace("\r", "\n").replace("\xa0", " ")
    m = REPLY_MARKER.search(body)
    if m:
        body = body[: m.start()]
    d = DISCLAIMER.search(body)
    if d and d.start() > len(body) * 0.6:
        body = body[: d.start()]
    closing = ""
    for c in CLOSING.finditer(body):
        if c.start() > len(body) * 0.5:
            closing = c.group(0).strip()
            body = body[: c.start()]
            break
    body = re.sub(r"[ \t]+\n", "\n", body)
    body = re.sub(r"\n{3,}", "\n\n", body).strip()
    return body, closing


def language(text):
    tokens = re.findall(r"[a-zåäöéü]+", text.lower())
    sv = sum(t in SV_WORDS for t in tokens)
    en = sum(t in EN_WORDS for t in tokens)
    if max(sv, en) < 3:
        return "other"
    return "sv" if sv > en else "en"


def kind(addresses, private_domains):
    domains = {a.rsplit("@", 1)[1].lower() for a in addresses if "@" in a}
    if not domains:
        return "unknown"
    return "private" if domains <= private_domains else "business"


def build_redactors(records, private_domains):
    names = set()
    labels = set()
    for r in records:
        for display in r.get("to") or []:
            for token in re.split(r"[\s,()\"'<>/]+", display or ""):
                if re.fullmatch(r"[A-ZÅÄÖÉ][a-zåäöéü-]{2,}", token) and token not in NOT_NAMES:
                    names.add(token)
        for addr in r.get("to_addr") or []:
            if "@" not in (addr or ""):
                continue
            domain = addr.rsplit("@", 1)[1].lower()
            if domain in CONSUMER_DOMAINS or domain in private_domains:
                continue
            parts = [p for p in domain.split(".")[:-1] if p not in DOMAIN_NOISE and len(p) >= 3]
            if parts:
                labels.add(parts[-1])

    names |= set(read_list("names.txt"))
    names -= set(read_list("keep.txt"))
    labels -= {w.lower() for w in read_list("keep.txt")}

    def alternation(words):
        return "|".join(re.escape(w) for w in sorted(words, key=len, reverse=True))

    name_re = re.compile(rf"\b(?:{alternation(names)})(?:s|'s)?\b") if names else None
    label_re = re.compile(rf"\b(?:{alternation(labels)})\b", re.IGNORECASE) if labels else None
    return name_re, label_re, len(names), len(labels)


def read_list(filename):
    path = DATA / filename
    if not path.exists():
        return []
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def redact(text, name_re, label_re):
    text = EMAIL.sub("[EMAIL]", text)
    text = URL.sub("[URL]", text)
    text = PERSONNUMMER.sub("[ID]", text)

    def phone(m):
        digits = re.sub(r"\D", "", m.group(0))
        if len(digits) < 8 or DATE.match(m.group(0).strip()):
            return m.group(0)
        return "[PHONE]"

    text = DIGIT_RUN.sub(phone, text)
    if label_re:
        text = label_re.sub("[COMPANY]", text)
    if name_re:
        text = name_re.sub("[NAME]", text)
    return text


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--min-words", type=int, default=60)
    parser.add_argument("--private-domains", nargs="*", default=[], help="extra domains that count as private mail")
    args = parser.parse_args()

    private_domains = CONSUMER_DOMAINS | {d.lower() for d in args.private_domains}
    raw = [json.loads(line) for line in (DATA / "raw.jsonl").open(encoding="utf-8-sig") if line.strip()]
    name_re, label_re, n_names, n_labels = build_redactors(raw, private_domains)

    dropped = Counter()
    seen = set()
    corpus = []
    for r in raw:
        text, closing = own_text(r.get("body") or "")
        words = len(text.split())
        if words < args.min_words:
            dropped["too short"] += 1
            continue
        key = hashlib.sha1(" ".join(text.lower().split())[:300].encode()).hexdigest()
        if key in seen:
            dropped["duplicate"] += 1
            continue
        seen.add(key)
        lang = language(text)
        if lang == "other":
            dropped["language unclear"] += 1
            continue
        corpus.append({
            "id": key[:12],
            "sent": r.get("sent", ""),
            "lang": lang,
            "kind": kind(r.get("to_addr") or [], private_domains),
            "subject": redact(r.get("subject") or "", name_re, label_re),
            "text": redact(text, name_re, label_re),
            "closing": redact(closing, name_re, label_re),
            "words": words,
        })

    with (DATA / "corpus.jsonl").open("w", encoding="utf-8") as f:
        for c in corpus:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")

    random.seed(1)
    sample = random.sample(corpus, min(15, len(corpus)))
    with (DATA / "redaction_check.md").open("w", encoding="utf-8") as f:
        f.write("# Redaction check\n\nRead these. Anything identifying that slipped through goes into data/names.txt; "
                "anything wrongly redacted goes into data/keep.txt. Then re-run prepare.py.\n\n")
        for c in sample:
            f.write(f"## {c['lang']} / {c['kind']} / {c['sent'][:10]}\n\n**{c['subject']}**\n\n{c['text']}\n\n")

    by_group = Counter((c["lang"], c["kind"]) for c in corpus)
    print(f"Read {len(raw)} mails, kept {len(corpus)}. Redacting {n_names} name tokens, {n_labels} company labels.")
    for reason, n in dropped.most_common():
        print(f"  dropped {n:>6}  {reason}")
    for (lang, k), n in sorted(by_group.items()):
        print(f"  kept    {n:>6}  {lang} {k}")
    print("Next: read data/redaction_check.md")


if __name__ == "__main__":
    main()
