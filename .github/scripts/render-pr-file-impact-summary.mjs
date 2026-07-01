const SECTION_HEADING = "## 変更ファイル一覧（自動更新）";
const FILE_STATUS = {
  added: "added",
  modified: "modified",
  renamed: "renamed",
  removed: "removed",
};

// PR本文を保ったまま、末尾の変更ファイル一覧だけを最新状態に差し替える。
export const renderUpdatedPrBody = ({ body = "", files = [] } = {}) => {
  const displayTargetFiles = files
    .filter((file) => isDisplayTargetFile(file))
    .sort((a, b) => a.filename.localeCompare(b.filename));
  const changedFileSummary = buildChangedFileSummaryBlock({ files: displayTargetFiles });
  const bodyWithoutChangedFileList = removeExistingChangedFileList(body);

  return `${bodyWithoutChangedFileList}${bodyWithoutChangedFileList ? "\n\n" : ""}${changedFileSummary}\n`;
};

// 自動生成する変更ファイル一覧のMarkdown全体を組み立てる。
const buildChangedFileSummaryBlock = ({ files = [] } = {}) => {
  const lines = [
    SECTION_HEADING,
    "",
    buildFileSections(files),
  ];

  return lines.join("\n");
};

// 前回生成した変更ファイル一覧があれば、見出し以降をまとめて取り除く。
const removeExistingChangedFileList = (body = "") => {
  const index = body.lastIndexOf(SECTION_HEADING);
  if (index === -1) {
    return body.trimEnd();
  }

  return body.slice(0, index).trimEnd();
};

// 固定の表示順で、変更種別ごとのセクションに分ける。
const buildFileSections = (files) => {
  if (files.length === 0) {
    return "表示対象の変更ファイルはありません。";
  }

  const addedFiles = files.filter((file) => file.status === FILE_STATUS.added);
  const modifiedFiles = files.filter((file) => file.status === FILE_STATUS.modified);
  const renamedFiles = files.filter((file) => file.status === FILE_STATUS.renamed);
  const removedFiles = files.filter((file) => file.status === FILE_STATUS.removed);

  return [
    buildFileSection("### 新規ファイル", addedFiles),
    buildFileSection("### 既存変更ファイル", modifiedFiles),
    buildFileSection("### リネームファイル", renamedFiles),
    buildFileSection("### 削除ファイル", removedFiles),
  ]
    .filter(Boolean)
    .join("\n\n");
};

// 1つの変更種別セクションをMarkdown表にする。
const buildFileSection = (heading, files) => {
  if (files.length === 0) {
    return "";
  }

  const rows = files.map((file) => {
    const srcRoot = getSrcRootDirectoryName(file.filename);
    const filename = formatFileName(file);
    return `| ${srcRoot} | ${filename} |`;
  });

  return [
    heading,
    "",
    "| src直下 | ファイル |",
    "|---|---|",
    ...rows,
  ].join("\n");
};

// ファイル名をPR上でクリックできる表示に整える。リネーム時は旧名も併記する。
const formatFileName = (file) => {
  const baseName = getBaseName(file.filename);
  const currentFileName = file.blob_url
    ? `[${baseName}](<${file.blob_url}>)`
    : baseName;

  if (file.status === FILE_STATUS.renamed && file.previous_filename) {
    return `${getBaseName(file.previous_filename)} -> ${currentFileName}`;
  }

  return currentFileName;
};

// src配下ならsrc直下のディレクトリ名を返す。src直下ファイルやsrc外は分類なしにする。
const getSrcRootDirectoryName = (filename) => {
  const parts = filename.split("/");
  if (parts[0] !== "src" || parts.length <= 2) {
    return "-";
  }

  return parts[1];
};

const getBaseName = (filename = "") => {
  const index = filename.lastIndexOf("/");
  return index === -1 ? filename : filename.slice(index + 1);
};

// 表示対象は主要な変更種別だけに絞り、テストファイルは一覧から外す。
const isDisplayTargetFile = (file) => {
  const isTargetStatus =
    file.status === FILE_STATUS.added ||
    file.status === FILE_STATUS.modified ||
    file.status === FILE_STATUS.renamed ||
    file.status === FILE_STATUS.removed;

  return isTargetStatus && !getBaseName(file.filename).includes(".test.");
};
