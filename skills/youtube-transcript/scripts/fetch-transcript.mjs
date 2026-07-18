#!/usr/bin/env node
// YouTube transcript fetcher — pure Node (Node >= 22, global fetch), no Python / npm deps.
// Primary path: iOS/Android InnerTube player API (returns working caption baseUrls even
// when the watch-page URLs are PO-token-gated). Optional fallback: yt-dlp, if in PATH.
//
// Usage: node fetch-transcript.mjs <url|videoId> [--lang=xx] [--out[=path]]
//   --lang=xx   Prefer caption track for language xx (e.g. de, en, pt-BR).
//   --out       Also write the transcript to a .txt file (name derived from video title).
//   --out=path  Also write the transcript to the given file path.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const YT_VIDEO_ID_LENGTH = 11;
const MAX_FILENAME_LENGTH = 120;
const ID = `[\\w-]{${YT_VIDEO_ID_LENGTH}}`; // video-id character class, reused in URL patterns

const USAGE =
  "Usage: fetch-transcript.mjs <url|videoId> [--lang=xx] [--out[=path]]\n";

// InnerTube clients that yield playable caption tracks. YouTube returns an
// intermittent LOGIN_REQUIRED per client (rate-limit-like); IOS and ANDROID are
// complementary, so trying both across a few rounds is reliable in practice.
const CLIENTS = [
  {
    name: "IOS",
    client: {
      clientName: "IOS",
      clientVersion: "20.10.4",
      deviceMake: "Apple",
      deviceModel: "iPhone16,2",
      osName: "iPhone",
      osVersion: "18.3.2.22D82",
      hl: "en",
      gl: "US",
    },
    ua: "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X)",
  },
  {
    name: "ANDROID",
    client: {
      clientName: "ANDROID",
      clientVersion: "20.10.38",
      androidSdkVersion: 34,
      osName: "Android",
      osVersion: "14",
      hl: "en",
      gl: "US",
    },
    ua: "com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip",
  },
];
const RETRY_ROUNDS = 3;
const RETRY_DELAY_MS = 700;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fail(msg, code = 1) {
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(code);
}

function extractVideoId(input) {
  if (new RegExp(`^${ID}$`).test(input)) return input;
  const patterns = [
    new RegExp(`[?&]v=(${ID})`),
    new RegExp(`youtu\\.be/(${ID})`),
    new RegExp(`/embed/(${ID})`),
    new RegExp(`/shorts/(${ID})`),
    new RegExp(`/live/(${ID})`),
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  return null;
}

function parseArgs(argv) {
  const out = { source: null, lang: null, save: false, savePath: null };
  for (const a of argv) {
    if (a === "--help" || a === "-h") out.help = true;
    else if (a.startsWith("--lang=")) out.lang = a.slice(7).trim();
    else if (a === "--out") out.save = true;
    else if (a.startsWith("--out=")) {
      out.save = true;
      out.savePath = a.slice(6).trim();
    } else if (a.startsWith("--")) fail(`Unknown option: ${a}`, 2);
    else if (!out.source) out.source = a;
  }
  return out;
}

// Pick a caption track: requested lang (manual before asr) > manual > first.
function selectTrack(tracks, wantLang) {
  const code = (t) => (t.languageCode || "").toLowerCase();
  const isManual = (t) => t.kind !== "asr";
  if (wantLang) {
    const w = wantLang.toLowerCase();
    const base = w.split("-")[0];
    const matches = tracks.filter(
      (t) => code(t) === w || code(t).split("-")[0] === base
    );
    if (!matches.length) return null; // signal "requested lang unavailable"
    matches.sort((a, b) => Number(isManual(b)) - Number(isManual(a)));
    return matches[0];
  }
  const manual = tracks.filter(isManual);
  return manual[0] || tracks[0];
}

function json3ToText(json) {
  const data = JSON.parse(json);
  const lines = [];
  for (const ev of data.events || []) {
    if (!ev.segs) continue;
    const t = ev.segs.map((s) => s.utf8 || "").join("").trim();
    if (t) lines.push(t);
  }
  return lines.join(" ").replace(/\s+/g, " ").trim();
}

async function queryClient(cl, videoId) {
  const res = await fetch(
    "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": cl.ua },
      body: JSON.stringify({ context: { client: cl.client }, videoId }),
    }
  );
  if (!res.ok) throw new Error(`player API HTTP ${res.status}`);
  const data = await res.json();
  return {
    status: data?.playabilityStatus?.status,
    title: data?.videoDetails?.title || videoId,
    tracks:
      data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [],
  };
}

// Try each client across a few rounds until one returns caption tracks.
async function fetchInnerTube(videoId) {
  let lastStatus = "unknown";
  let lastTitle = videoId;
  for (let round = 0; round < RETRY_ROUNDS; round++) {
    for (const cl of CLIENTS) {
      try {
        const r = await queryClient(cl, videoId);
        lastStatus = r.status || lastStatus;
        if (r.title) lastTitle = r.title;
        if (r.tracks.length) return { ...r, ua: cl.ua };
      } catch (e) {
        lastStatus = e.message;
      }
    }
    if (round < RETRY_ROUNDS - 1) await sleep(RETRY_DELAY_MS);
  }
  return { status: lastStatus, title: lastTitle, tracks: [], ua: CLIENTS[0].ua };
}

async function fetchTrackText(track, ua) {
  const res = await fetch(track.baseUrl + "&fmt=json3", {
    headers: { "User-Agent": ua },
  });
  if (!res.ok) throw new Error(`caption fetch HTTP ${res.status}`);
  const body = await res.text();
  if (!body || body.length < 10) return null; // empty = gated / no content
  return json3ToText(body);
}

function ytDlpAvailable() {
  const r = spawnSync("yt-dlp", ["--version"], { encoding: "utf8" });
  return r.status === 0;
}

function buildYtDlpArgs(videoId, wantLang, outDir) {
  // sub-langs is treated as regex by yt-dlp. With no --lang, ".*-orig" matches the
  // original auto-caption track in ANY language (not just English), with en as a
  // safety net — mirroring the InnerTube path's "original / first" default.
  const langSel = wantLang
    ? `${wantLang}-orig,${wantLang},${wantLang}.*`
    : ".*-orig,en-orig,en";
  // Canonical URL from the already-validated videoId — never the raw user source.
  // Prefixed with "--" (end-of-options) so nothing is ever parsed as a yt-dlp flag.
  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  return [
    "--skip-download",
    "--write-auto-subs",
    "--write-subs",
    "--sub-langs",
    langSel,
    "--sub-format",
    "json3",
    "-o",
    join(outDir, "sub.%(ext)s"),
    "--print",
    "%(title)s",
    "--",
    canonicalUrl,
  ];
}

// Fallback via yt-dlp subprocess: collect subtitle files in a temp dir, parse the
// first json3 file, always clean up in finally. Returns {title, text} or null.
function fetchViaYtDlp(videoId, wantLang) {
  const dir = mkdtempSync(join(tmpdir(), "yt-transcript-"));
  try {
    const r = spawnSync("yt-dlp", buildYtDlpArgs(videoId, wantLang, dir), {
      encoding: "utf8",
    });
    const title = (r.stdout || "").trim().split("\n")[0] || "transcript";
    const files = readdirSync(dir).filter((f) => f.endsWith(".json3"));
    if (!files.length) return null;
    return { title, text: json3ToText(readFileSync(join(dir, files[0]), "utf8")) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function safeFilename(title) {
  const cleaned = [...title.replace(/[/\\?%*:|"<>]/g, "").replace(/\s+/g, "_")]
    .slice(0, MAX_FILENAME_LENGTH) // spread → code points, so we never split a surrogate pair
    .join("")
    .replace(/[.\s]+$/, ""); // Windows: a filename component may not end in "." or a space
  return cleaned || "transcript";
}

// Orchestrate the two fetch strategies (InnerTube primary, yt-dlp fallback) and
// return { title, text, usedLang }. text is null when no transcript could be found.
async function resolveTranscript(videoId, wantLang) {
  let title = videoId;
  let text = null;
  let usedLang = wantLang || "auto";

  try {
    const { status, title: t, tracks, ua } = await fetchInnerTube(videoId);
    title = t;
    if (tracks.length) {
      const track = selectTrack(tracks, wantLang);
      if (!track && wantLang) {
        const avail = tracks
          .map((x) => x.languageCode + (x.kind === "asr" ? " (auto)" : ""))
          .join(", ");
        fail(`No caption track for --lang=${wantLang}. Available: ${avail}`);
      }
      if (track) {
        usedLang =
          (track.languageCode || "?") + (track.kind === "asr" ? " (auto)" : "");
        text = await fetchTrackText(track, ua);
      }
    } else {
      process.stderr.write(
        `Note: no caption tracks via InnerTube (playability: ${status}).\n`
      );
    }
  } catch (e) {
    process.stderr.write(`Note: InnerTube path failed: ${e.message}\n`);
  }

  if (!text && ytDlpAvailable()) {
    process.stderr.write("Note: falling back to yt-dlp...\n");
    const r = fetchViaYtDlp(videoId, wantLang);
    if (r && r.text) {
      text = r.text;
      title = r.title || title;
      usedLang = wantLang || "auto (yt-dlp)";
    }
  }

  return { title, text, usedLang };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    process.stdout.write(USAGE);
    process.exit(0);
  }
  if (!args.source) {
    process.stderr.write(USAGE); // missing required arg → stderr + non-zero exit
    process.exit(2);
  }
  if (typeof fetch !== "function") {
    fail("Node >= 22 required (global fetch unavailable).");
  }

  const videoId = extractVideoId(args.source);
  if (!videoId) fail(`Could not extract a video ID from: ${args.source}`, 2);

  const { title, text, usedLang } = await resolveTranscript(videoId, args.lang);

  if (!text) {
    fail(
      "No transcript available for this video " +
        "(no captions found, or the requested language is missing). " +
        "This tool does not transcribe audio."
    );
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  process.stderr.write(
    `Title: ${title}\nLanguage: ${usedLang}\nWords: ${wordCount}\n`
  );

  const header = `# ${title} (${usedLang})\n\n`;
  process.stdout.write(header + text + "\n");

  if (args.save) {
    const path = args.savePath || `${safeFilename(title)}.txt`;
    writeFileSync(path, header + text + "\n", "utf8");
    process.stderr.write(`Saved to: ${path}\n`);
  }
}

main().catch((e) => fail(e.message));
