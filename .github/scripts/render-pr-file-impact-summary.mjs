const SECTION_HEADING = "## 変更ファイル一覧（自動更新）";
const LEGACY_START_MARKER = "<!-- pr-file-impact-summary:start -->";
const LEGACY_END_MARKER = "<!-- pr-file-impact-summary:end -->";

const STATUS_SECTIONS = [
  { status: "added", heading: "### 新規ファイル" },
  { status: "modified", heading: "### 既存変更ファイル" },
  { status: "renamed", heading: "### リネームファイル" },
  { status: "removed", heading: "### 削除ファイル" },
];

export function renderUpdatedPrBody({ body = "", files = [], maxFiles = 300 } = {}) {
  const block = renderSummaryBlock({ files, maxFiles });
  const bodyWithoutGeneratedSection = removeExistingGeneratedSection(body);
  const trimmedBody = bodyWithoutGeneratedSection.trimEnd();

  return `${trimmedBody}${trimmedBody ? "\n\n" : ""}${block}\n`;
}

export function renderSummaryBlock({ files = [], maxFiles = 300 } = {}) {
  const sortedFiles = sortFiles(files.filter((file) => !isTestFile(file.filename)));
  const visibleFiles = sortedFiles.slice(0, maxFiles);
  const omittedCount = Math.max(sortedFiles.length - visibleFiles.length, 0);

  const lines = [
    SECTION_HEADING,
    "",
    renderFileTable(visibleFiles),
  ];

  if (omittedCount > 0) {
    lines.push("", `※ ${omittedCount}件は表示上限により省略しています。`);
  }

  return lines.join("\n");
}

function removeExistingGeneratedSection(body = "") {
  const legacyStartIndex = body.lastIndexOf(LEGACY_START_MARKER);
  if (legacyStartIndex !== -1) {
    const legacyEndIndex = body.indexOf(LEGACY_END_MARKER, legacyStartIndex);
    if (legacyEndIndex !== -1) {
      return body.slice(0, legacyStartIndex) + body.slice(legacyEndIndex + LEGACY_END_MARKER.length);
    }
  }

  const index = body.lastIndexOf(SECTION_HEADING);
  if (index === -1) {
    return body;
  }

  return body.slice(0, index);
}

function renderFileTable(files) {
  if (files.length === 0) {
    return "表示対象の変更ファイルはありません。";
  }

  return [
    ...STATUS_SECTIONS.flatMap(({ status, heading }) => {
      const sectionFiles = files.filter((file) => file.status === status);
      return renderFileSection(heading, sectionFiles);
    }),
    ...renderFileSection("### その他の変更ファイル", files.filter((file) => !isKnownStatus(file.status))),
  ].join("\n");
}

function renderFileSection(heading, files) {
  if (files.length === 0) {
    return [];
  }

  return [
    heading,
    "",
    "| src直下 | ファイル |",
    "|---|---|",
    ...files.map((file) => {
      const srcRoot = formatSrcRoot(file.filename);
      const filename = formatFilename(file);
      return `| ${srcRoot} | ${filename} |`;
    }),
    "",
  ];
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

function isTestFile(filename = "") {
  return getBaseName(filename).includes(".test.");
}

function sortFiles(files) {
  return [...files].sort((a, b) => {
    const statusDiff = statusRank(a.status) - statusRank(b.status);
    if (statusDiff !== 0) return statusDiff;
    return a.filename.localeCompare(b.filename);
  });
}

function statusRank(status) {
  const index = STATUS_SECTIONS.findIndex((section) => section.status === status);
  return index === -1 ? STATUS_SECTIONS.length : index;
}

function isKnownStatus(status) {
  return STATUS_SECTIONS.some((section) => section.status === status);
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
