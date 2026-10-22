# Voice skill

Builds a ChatGPT skill for writing blog posts in my voice, in Swedish and English,
using my sent mail as source material. All mail processing runs locally. `data/` is git-ignored.

```
.\extract_sent.ps1 -PstPath "<path to .pst>"   # Outlook → data/raw.jsonl
python prepare.py                               # clean, tag language, redact → data/corpus.jsonl
python stats.py                                 # data/style_stats.md + data/batches/
```

Then follow `prompts.md` (A–F) to fill in `skill/johan-voice/`, and zip that folder to upload it:

```
Compress-Archive skill\johan-voice johan-voice.zip -Force
```
