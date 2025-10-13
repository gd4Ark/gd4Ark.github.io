---
title: 我如何自己实现 lint-staged
pubDatetime: 2025-10-13
tags:
  - 前端
  - hg
  - vcs
description: 都 2025 年了还在聊 lint-staged？确实有点复古。但最近实在闲得慌，博客都快长草了，索性把过去几年踩过的坑和折腾过的轮子翻出来炒冷饭。接下来会陆续更新一系列文章，就当是给自己这几年的搬砖生涯做个总结。
---

## 前言

都 2025 年了还在聊 lint-staged？确实有点复古。但最近实在闲得慌，博客都快长草了，索性把过去几年踩过的坑和折腾过的轮子翻出来炒冷饭。接下来会陆续更新一系列文章，就当是给自己这几年的搬砖生涯做个总结。

## 为什么要自己实现 lint-staged？

说来惭愧，我司用的不是 git，而是 Mercurial (hg) 这个「冷门」版本控制工具。所以很自然地，git 生态下的各种神器都用不了。2022 年写过一篇 [《Hg hooks 实践历程》](https://4ark.me/posts/2022-03-17-hg-hooks/)，主要就是给 hg 造了个 husky 轮子，结果被领导看上了，在公司内推广使用。既然都做到这份上了，lint-staged 自然也被提上了日程。

简单来说，lint-staged 就是专门处理暂存区（staged）文件的格式化和 lint 操作。这样做有两个好处：一是速度快，二是不会被那些还没提交的本地改动搞出来的 lint 错误打断提交。

但问题来了，hg 压根就没有暂存区这玩意儿！这就是我实现 lint-staged 时遇到的最大挑战。

## 实现思路

先回忆一下 lint-staged 的标准配置：

```json
{
  "scripts": {
    "lint-staged": "lint-staged"
  },
  "lint-staged": {
    "**/*.{js,vue}": ["eslint --cache --fix", "pnpm dts"],
    "**/*.{css,vue}": "stylelint --cache --fix",
    "**/*.{json,d.ts,md}": "prettier --write"
  }
}
```

然后在 `pre-commit` 钩子里执行：

```bash
# .husky/pre-commit

npx lint-staged
```

标准流程是这样的：

1. 在 `pre-commit` 阶段执行 lint-staged
2. 通过 git 命令获取暂存区的文件列表，对这些文件按配置执行各种命令
3. 把产生的文件改动重新加到暂存区，合并到本次提交

但 hg 没有暂存区，没法像 git 那样直接获取文件列表，只能另辟蹊径。虽然官方 lint-staged 在 `pre-commit` 阶段执行，但在 hg 中我们可以改到 `pretxncommit` 阶段，用 `hg export tip --template "{file_adds} {file_mods}"` 命令获取本次提交涉及的文件列表。

lint-staged 的操作会改动文件，需要把产生的改动合并到本次提交中。在 hg 里可以用 `(HUSKY=0 hg commit $files --amend -m "$commit_message") >/dev/null 2>&1` 命令把最新改动合并到本次提交。

> PS：这里需要 HUSKY=0 是因为本次提交不需要再经过 lint-staged，不然就会死循环。

到这里其实已经可以做到官方 lint-staged 的核心功能，基本够用了。但我们还有个额外需求：有些项目会对 `.js` 文件执行 `pnpm dts` 操作，这会产生新文件或删除文件，我们希望把这些 lint-staged 操作导致的文件改动也合并到本次提交中。

举个例子，我们有 `a.js`，经过 `pnpm dts` 后会产生 `types/a.d.ts`，我们想把这个文件也合并到提交中。所以设计了一个硬编码命令 `hg commit`：

```json
"lint-staged": {
   "**/*.{js,vue}": [
     "eslint --fix",
     "pnpm dts",
     "hg commit"
   ],
},
```

当遇到 `hg commit` 时，就获取最新的文件改动列表，与之前拿到的文件改动列表做 diff，差异部分就是本次操作产生的改动。把这部分差异存到临时文件里，附加到 `$files` 中，就能实现想要的效果。

## 核心代码

最后附上核心实现，首先是 `lint-staged.js`：

```js
#!/usr/bin/env node

/* eslint-disable no-console,no-await-in-loop */

const fs = require("fs");
const { exec, execSync: _execSync } = require("child_process");
const path = require("path");

const glob = require("glob");

const cwd = process.cwd();

// 获取 hg 仓库根目录路径
const ROOT_PATH = execSync("hg root");
const PACKAGE_JSON_PATH = path.join(cwd, "package.json");

// 临时文件路径，用于存储 lint-staged 操作产生的文件改动
const LINT_STAGED_MODIFIED_PATH = path.join(
  ROOT_PATH,
  ".hghusky/_",
  "LINT_STAGED_MODIFIED"
);

// 硬编码的特殊命令，用于触发文件改动检测
const COMMIT_COMMAND = "hg commit";

main();

async function main() {
  try {
    // 组合函数：读取配置 -> 生成命令 -> 执行命令
    const tasks = compose(
      getLintStagedConfig,
      generateCommands,
      executeCommands
    );

    await tasks();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

/**
 * 从 package.json 中读取 lint-staged 配置
 */
function getLintStagedConfig() {
  const packageJsonContent = fs.readFileSync(PACKAGE_JSON_PATH, "utf-8");
  const packageJson = JSON.parse(packageJsonContent);
  const lintStagedConfig = packageJson["lint-staged"];

  if (!lintStagedConfig) {
    throw new Error("No lint-staged config found");
  }

  return lintStagedConfig;
}

/**
 * 根据配置生成需要执行的命令
 * 核心逻辑：匹配本次提交的文件与配置的 glob 模式
 */
function generateCommands(config) {
  // 获取本次提交涉及的文件列表（新增和修改的文件）
  const committedFiles = execSync(
    'hg export tip --template "{file_adds} {file_mods}"'
  ).split(" ");
  const commands = [];

  Object.entries(config).forEach(([pattern, command]) => {
    // 1. 使用 glob 匹配所有符合模式的文件
    // 2. 转换为相对于仓库根目录的路径
    // 3. 过滤出本次提交涉及的文件
    // 4. 转换为相对于当前工作目录的路径
    const matchedFiles = glob
      .sync(pattern, { nodir: true })
      .map(file => path.relative(ROOT_PATH, path.resolve(cwd, file)))
      .filter(file => committedFiles.includes(file))
      .map(file => path.relative(cwd, path.resolve(ROOT_PATH, file)))
      .join(" ");

    if (matchedFiles) {
      commands.push({ command, files: matchedFiles });
    }
  });

  return commands;
}

/**
 * 执行生成的命令列表
 * 关键特性：支持检测命令执行前后的文件变化
 */
async function executeCommands(commands) {
  await Promise.all(
    commands.map(async item => {
      if (!item.files.length) return;

      // 如果命令是数组（包含多个子命令）
      if (Array.isArray(item.command)) {
        // 检查是否包含特殊的 hg commit 命令
        const needCommit = item.command.find(cmd => cmd === COMMIT_COMMAND);

        // 如果需要检测文件变化，先记录当前的文件状态
        const prevModifyFiles = needCommit ? getModifyFiles() : [];

        // 依次执行每个子命令
        for (const subCommand of item.command) {
          if (subCommand === COMMIT_COMMAND) {
            // 遇到 hg commit 命令时，计算文件变化
            const afterModifyFiles = diff(getModifyFiles(), prevModifyFiles);

            // 如果有新产生的文件改动，写入临时文件
            if (afterModifyFiles.length) {
              fs.writeFileSync(
                LINT_STAGED_MODIFIED_PATH,
                afterModifyFiles.join(" ")
              );
            }
          } else {
            await executeCommand(`${subCommand} ${item.files}`);
          }
        }

        return;
      }

      await executeCommand(`${item.command} ${item.files}`);
    })
  );
}

function executeCommand(commandWithFiles) {
  return new Promise(resolve => {
    console.log(`[lint-staged] execute: ${commandWithFiles}`);
    const child = exec(commandWithFiles, (error, _stdout, stderr) => {
      if (error) {
        console.warn(stderr);
        process.exit(1);
      } else {
        resolve();
      }
    });

    // 将子进程的输出重定向到当前进程
    child.stderr.pipe(process.stderr);
    child.stdout.pipe(process.stdout);
  });
}

// eslint-disable-next-line consistent-return
function execSync(command) {
  try {
    const result = _execSync(command, { encoding: "utf-8" });

    return result.trim();
  } catch (error) {
    console.error(`[lint-staged] execute ${command} error: ${error}`);

    process.exit(1);
  }
}

function compose(...functions) {
  return async () => {
    let result;
    for (const func of functions) {
      result = await func(result);
    }

    return result;
  };
}

/**
 * 获取当前工作目录中所有修改过的文件列表
 * 用于检测 lint-staged 操作产生的文件变化
 */
function getModifyFiles() {
  return execSync("hg status | sort")
    .split("\n")
    .map(line => line.replace(/^.*?\s/, ""));
}

function diff(array1, array2) {
  return array1.filter(item => !array2.includes(item));
}
```

这里最关键的就是会在遇到 `hg commit` 命令的时候，产生一个临时文件 `LINT_STAGED_MODIFIED_PATH`，它就是本次操作改动的文件列表，然后在 `commit` 阶段将其附加到 `$files` 合并到本次提交：

```bash
#!/bin/bash

HUSKY_DIR='.hghusky'

# 在上级目录的 commit 执行之前，先做一些初始化工作
commit_message=$(hg tip --template '{desc}')

# 将 lint-staged 产生的变更重新添加到当前 commit 中
function mergeAutoFixed2Commit() {
  if [ ! -f "$HUSKY_DIR/pretxncommit" ]; then
    exit 0
  fi

  skipLint

  files=$(hg export tip --template '{files}')

  # 提交 lint-staged 阶段改动的文件
  LINT_STAGED_MODIFIED_PATH="$HUSKY_DIR/_/LINT_STAGED_MODIFIED"
  if [ -f "$LINT_STAGED_MODIFIED_PATH" ]; then
    modified_files=$(cat "$LINT_STAGED_MODIFIED_PATH")
    files="$files $modified_files"

    rm "$LINT_STAGED_MODIFIED_PATH"
  fi

  set +e
  # shellcheck disable=SC2086
  hg addremove $modified_files
  # shellcheck disable=SC2086
  (HUSKY=0 hg commit $files --amend -m "$commit_message") >/dev/null 2>&1
  set -e
}

if [ -f "$HUSKY_DIR/pretxncommit" ]; then
  mergeAutoFixed2Commit
fi
```
