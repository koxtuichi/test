const SECTION_HEADING = "## 変更ファイル一覧（自動更新）";
const FILE_STATUS = {
  added: "added",
  modified: "modified",
  renamed: "renamed",
  removed: "removed",
};

export const renderUpdatedPrBody = ({ body = "", files = [] } = {}) => {
  const displayTargetFiles = files
    .filter((file) => isDisplayTargetFile(file))
    .sort((a, b) => a.filename.localeCompare(b.filename));
  const changedFileSummary = buildChangedFileSummaryBlock({ files: displayTargetFiles });
  const bodyWithoutChangedFileList = removeExistingChangedFileList(body);

  return `${bodyWithoutChangedFileList}${bodyWithoutChangedFileList ? "\n\n" : ""}${changedFileSummary}\n`;
};

const buildChangedFileSummaryBlock = ({ files = [] } = {}) => {
  const lines = [
    SECTION_HEADING,
    "",
    buildFileSections(files),
  ];

  return lines.join("\n");
};

const removeExistingChangedFileList = (body = "") => {
  const index = body.lastIndexOf(SECTION_HEADING);
  if (index === -1) {
    return body.trimEnd();
  }

  return body.slice(0, index).trimEnd();
};

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

const isDisplayTargetFile = (file) => {
  const isTargetStatus =
    file.status === FILE_STATUS.added ||
    file.status === FILE_STATUS.modified ||
    file.status === FILE_STATUS.renamed ||
    file.status === FILE_STATUS.removed;

  return isTargetStatus && !getBaseName(file.filename).includes(".test.");
};
