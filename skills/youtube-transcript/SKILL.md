---
description: Fetch the transcript/subtitles of a YouTube video as plain text. Use when the user provides a YouTube URL or video ID and wants its transcript, captions, or subtitles read out — e.g. "get the transcript", "YouTube Transkript auslesen", "Untertitel dieses Videos", "transcribe this YouTube video" (existing captions only, no audio transcription). Pure Node, no Python/yt-dlp required.
model: haiku
effort: low
---

# YouTube Transcript

Fetch a YouTube video's existing captions as plain text. Pure Node (uses the
InnerTube player API); falls back to `yt-dlp` only if it is installed. **Does
not** transcribe audio — if a video has no captions, there is no transcript.

## Usage

```
/agenticaiplugin:youtube-transcript <url|videoId> [--lang=xx] [--out[=path]]
```

| Argument | Behavior |
|----------|----------|
| `<url\|videoId>` | Any YouTube URL form (`watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/`) or a bare 11-char video ID |
| `--lang=xx` | Prefer captions in language `xx` (e.g. `de`, `en`, `pt-BR`); manual tracks win over auto-generated |
| `--out` | Also save the transcript as a `.txt` file named after the video title |
| `--out=path` | Also save the transcript to the given file path |
| `--help` / `-h` | Show this usage, then STOP |

## Argument Handling

**Check BEFORE executing:**

1. **`--help` / `-h`** → display the Usage section above verbatim, then STOP.
2. **No argument** → display the Usage section above verbatim, then STOP. A URL or video ID is required.
3. **Otherwise** → run the script (below).

## Procedure

1. Note the absolute path of **this skill's directory** — referred to as
   `{skill_dir}`.
2. Run via Bash, passing the user's URL/ID and any flags through unchanged:
   ```bash
   node "{skill_dir}/scripts/fetch-transcript.mjs" "<url|videoId>" [--lang=xx] [--out]
   ```
3. The transcript is written to **stdout** (prefixed with a `# <title> (<lang>)`
   header). Diagnostics (title, language, word count, fallback notice) go to
   **stderr**.
4. Relay the transcript to the user, or — if they asked for a summary/analysis —
   use the stdout transcript as the source for that.
5. On error (no captions, requested language missing, network), report the
   script's error message plainly. Do not retry with a different tool unless the
   user asks.

**Prerequisite — Node.js:** the script requires `node` on PATH. If the Bash call
fails because `node` is not found (not a "no transcript" result), do NOT report a
caption failure — tell the user this skill requires Node.js (≥ 22) and show the
install hint for their platform read from the central registry at
`{skill_dir}/../../prerequisites.json` (entry `id: "node"`, field `hints` — the
single source of truth for install guidance).

## Notes

- **Requirements:** Node ≥ 22 (global `fetch`; matches the plugin's Node 22 LTS
  baseline). No Python, no npm packages, no yt-dlp needed for the primary path.
  Works identically on Linux and Windows.
- **Reliability:** YouTube intermittently returns `LOGIN_REQUIRED` per client;
  the script tries multiple InnerTube clients across a few retry rounds, so
  transient failures self-heal.
- **Language default:** with no `--lang`, the original / first track is used
  (manual before auto-generated).
- **Scope:** existing captions only. Audio-to-text (Whisper etc.) is out of
  scope by design.
- **Related:** `markdown-converter` also accepts YouTube URLs (via `uvx
  markitdown`, i.e. Python). Prefer `youtube-transcript` when you only need the
  caption text and want no Python/uvx dependency.
