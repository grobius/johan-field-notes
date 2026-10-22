# Prompts for building the voice skill

Use these in ChatGPT, in order. Before you start, turn off model training on your chats:
Settings → Data controls → "Improve the model for everyone" → off.

Only paste redacted material from `data/`. Never paste raw.jsonl.

---

## A. Analyse one batch (repeat for every file in data/batches/)

Start a new chat per language. Paste this prompt, then the content of one batch file.
Repeat with the next batch file in the same chat ("Same analysis, next batch:").

```
You are a stylistician. Below are redacted emails written by one person, Johan.
Placeholders like [NAME] and [COMPANY] are redactions; ignore them.

Describe how Johan writes. Only report patterns you see in at least 3 samples,
and quote 1–2 short examples (in the original language) for each.

Cover:
1. How he opens (first sentence after any greeting): straight to the point, context first, a question...
2. Sentence and paragraph rhythm: length, variation, fragments
3. Word choice: formal/informal, technical terms, loanwords, favourite words and phrases
4. How he argues or explains: order of claim/reason/example, use of lists, numbers, analogies
5. Humour and warmth: what kind, how often, where in the text
6. Certainty: hedging vs. directness, how he disagrees, how he asks for things
7. How he ends (the last sentence before the sign-off)
8. Differences between business and private mail
9. Things he consistently does NOT do

Be specific. "Friendly and professional" is useless; "asks for decisions with a deadline in the
same sentence: 'Kan du bekräfta senast fredag?'" is useful.
```

## B. Merge into one profile per language

In the same chat, after the last batch, paste this followed by the matching section of
`data/style_stats.md`:

```
Merge your batch analyses into one voice profile. Here are measured statistics from the full
mail corpus (several thousand mails); where your impression and the numbers disagree, trust
the numbers.

Output, in English, with quoted examples in the original language:
- "Voice core": 6–10 traits, each one line + one example
- "Signature moves": 3–6 recurring phrases or constructions that sound like Johan
- "Never": things he does not do (also list typical AI phrasing that would be out of character)
- "Register shift": what changes between business and private mail
Keep it under 600 words.
```

Do this once for Swedish and once for English. Then, in a third chat, paste both profiles and ask:

```
Here are two voice profiles of the same writer, Swedish and English. Split them into:
1. Traits shared by both languages (voice-core.md)
2. Swedish-only traits (swedish.md)
3. English-only traits (english.md)
Keep quotes in their original language.
```

Read the result critically. Delete anything that does not feel like you, and add what is missing.
This is the most important review in the whole process.

## C. Pick exemplars

Go through `data/batches/` (or search `data/corpus.jsonl`) and copy 10–20 passages per language
that you think are the best of you: a paragraph that explains something well, an argument, a
funny aside. Strip anything still personal, tighten if needed, and paste them into
`exemplars-sv.md` / `exemplars-en.md`. Passages of 50–200 words work best. Picking these by hand
matters more than anything an LLM can extract.

## D. Define the blog layer (interview)

```
I am turning my email voice into a blog voice. Interview me, one question at a time
(max 10 questions), to find out:
- who the readers are and what they should feel/do after a post
- which of my email traits to keep, soften, or drop on the blog
- how professional vs. personal the blog should be, with examples of bloggers I like
- post length, structure, headline style, and how I want posts to open and end
- topics I write about and topics I avoid
Then write blog-layer.md as three lists, KEEP / ADD / REMOVE, plus a short "Opening
patterns" and "Ending patterns" section, each with an example in Swedish and English.
```

## E. Before/after pairs

Write these yourself, with help if needed. For each pair: a "before" (a real email paragraph of
yours, or a generic AI paragraph on one of your topics) and an "after" (how you want it on the blog).
5–8 pairs, at least 2 per language. Put them in `before-after.md`.

## F. Test the skill

With the skill or GPT installed:

1. "Write a 500-word blog post in Swedish about <topic you have written about before>."
2. Same topic in English.
3. "Rewrite this in my voice for the blog:" + a paragraph of generic text.
4. "Here are my notes, turn them into a post:" + rough bullet points.

Read each output and mark every phrase that does not sound like you. Add those phrases to the
**Never** list in SKILL.md, fix the trait that caused them, and run the tests again.
Two or three rounds is usually enough.
