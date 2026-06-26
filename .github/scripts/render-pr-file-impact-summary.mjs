const START_MARKER = "<!-- pr-file-impact-summary:start -->";
const END_MARKER = "<!-- pr-file-impact-summary:end -->";

const STATUS_ORDER = [
  "added",
  "modified",
  "renamed",
  "removed",
  "copied",
  "changed",
  "unchanged",
];

const STATUS_LABELS = {
  added: "新規",
  modified: "既存変更",
  renamed: "リネーム",
  removed: "削除",
  copied: "コピー",
  changed: "変更",
  unchanged: "変更なし",
};

export function renderUpdatedPrBody({ body = "", files = [], maxFiles = 300 } = {}) {
  const block = renderSummaryBlock({ files, maxFiles });

  if (body.includes(START_MARKER) && body.includes(END_MARKER)) {
    const pattern = new RegExp(`${escapeRegExp(START_MARKER)}[\\s\\S]*?${escapeRegExp(END_MARKER)}`);
    return body.replace(pattern, block);
  }

  const trimmedBody = body.trimEnd();
  return `${trimmedBody}${trimmedBody ? "\n\n" : ""}${block}\n`;
}

export function renderSummaryBlock({ files = [], maxFiles = 300 } = {}) {
  const sortedFiles = sortFiles(files);
  const visibleFiles = sortedFiles.slice(0, maxFiles);
  const omittedCount = Math.max(sortedFiles.length - visibleFiles.length, 0);

  const lines = [
    START_MARKER,
    "## 変更ファイル一覧（自動更新）",
    "",
    "_GitHub Actions がPRの変更ファイル一覧から自動生成しています。画面・共通部品の意味判定は含めていません。_",
    "",
    renderFileTable(visibleFiles),
  ];

  if (omittedCount > 0) {
    lines.push("", `※ ${omittedCount}件は表示上限により省略しています。`);
  }

  lines.push(END_MARKER);
  return lines.join("\n");
}

function renderFileTable(files) {
  if (files.length === 0) {
    return "変更ファイルはありません。";
  }

  return [
    "| 種別 | src直下 | ファイル | 変更量 |",
    "|---|---|---|---:|",
    ...files.map((file) => {
      const label = STATUS_LABELS[file.status] ?? file.status;
      const srcRoot = formatSrcRoot(file.filename);
      const filename = formatFilename(file);
      const additions = Number.isFinite(file.additions) ? file.additions : 0;
      const deletions = Number.isFinite(file.deletions) ? file.deletions : 0;
      return `| ${escapeTableText(label)} | ${srcRoot} | ${filename} | +${additions} / -${deletions} |`;
    }),
  ].join("\n");
}

function formatFilename(file) {
  const currentFilename = linkedFilename(file.filename, file.blob_url);

  if (file.status === "renamed" && file.previous_filename) {
    return `${inlineCode(getBaseName(file.previous_filename))} -> ${currentFilename}`;
  }

  return currentFilename;
}

function linkedFilename(filename, href) {
  const text = escapeMarkdownLinkText(escapeTableText(getBaseName(filename)));

  if (!href) {
    return inlineCode(text);
  }

  return `[${text}](${escapeMarkdownLinkUrl(href)})`;
}

function formatSrcRoot(filename) {
  return inlineCode(getSrcRoot(filename));
}

function getSrcRoot(filename = "") {
  const parts = filename.split("/");
  if (parts[0] !== "src") {
    return "-";
  }

  return parts.length > 2 ? parts[1] : "src直下";
}

function getBaseName(filename = "") {
  const index = filename.lastIndexOf("/");
  return index === -1 ? filename : filename.slice(index + 1);
}

function sortFiles(files) {
  return [...files].sort((a, b) => {
    const statusDiff = statusRank(a.status) - statusRank(b.status);
    if (statusDiff !== 0) return statusDiff;
    return a.filename.localeCompare(b.filename);
  });
}

function statusRank(status) {
  const index = STATUS_ORDER.indexOf(status);
  return index === -1 ? STATUS_ORDER.length : index;
}

function inlineCode(value = "") {
  return `<code>${escapeHtml(value).replaceAll("|", "&#124;")}</code>`;
}

function escapeTableText(value = "") {
  return String(value).replaceAll("|", "\\|");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeMarkdownLinkUrl(value = "") {
  return String(value).replaceAll(")", "%29");
}

function escapeMarkdownLinkText(value = "") {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
