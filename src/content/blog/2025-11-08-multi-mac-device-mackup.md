---
title: 多 Mac 设备配置同步方案
pubDatetime: 2025-12-10T09:46:00+08:00
featured: true
draft: false
tags:
  - 折腾
description: 用 mackup 实现多台 Mac 设备配置与软件环境的一键快速同步。
---

## 前言

过去几年，我的主力机一直是那台 14 英寸的 M1 Pro，虽然也有 dotfiles 仓库，通过手工软链来同步，但充其量只是为了版本控制。

直到我入手了 Mac mini M4，才有了要同步两台设备配置的需求。因为我已经不止一次：在 A 机上装了某个命令行工具，到了 B 机又得重新安装、重新配置……折腾几次后，还是得找一种方案。

我的目标很简单：只要在任意一台机器上安装新软件或修改配置，其他设备可以快速做到 1:1 同步。

核心就两条命令：

- 离开当前机器前，运行 macup —— 将所有改动备份到仓库
- 到另一台机器前，执行 macdown —— 从仓库里还原

以下全是细节。

## 为什么不用这些方案

- chezmoi / yadm：有点重
- Nix / Home Manager：更重
- Mackup + iCloud/Dropbox：确实方便，但更希望放在 Git 里

## 目前方案

最终核心就三板斧：

- Mackup + file_system：所有应用配置都放在 dotfiles 仓库
- Brew 的 formula 和 cask 列表，并且有前缀 + 表示需要同步安装
- 两个脚本：macup 负责备份并更新列表，macdown 负责还原

仓库结构示例如下：

```txt
dotfiles/
├── .mackup.cfg
├── mackup/                     # mackup 导出的所有配置
├── mackup/brew-formulae.txt
├── mackup/brew-casks.txt
├── bin/macup → ../mackup-backup.sh
├── bin/macdown → ../mackup-restore.sh
├── bin/xxx                     # 任何可执行文件，会自动软链到 ~/.bin
├── mackup-backup.sh
├── mackup-restore.sh
└── init.sh                     # 新机器第一步运行，自动软链 .mackup.cfg
```

.mackup.cfg 示例：

```txt
[storage]
engine    = file_system
path      = /Users/4ark/projects/dotfiles
directory = mackup
[applications_to_sync]
Bash
Charles
Cursor
claude-code
dig
git-hooks
homebrew
Htop
Itsycal
custom-kitty
nvm
PicGo
Pnpm
ripgrep
SourceTree
yazi
Zsh
Mercurial
p10k
vim
neovim
ssh
starship
[applications_to_ignore]
adium
```

### 核心文件说明

- mackup/：mackup 导出的配置/偏好，直接放在仓库里版本化
- mackup/brew-formulae.txt、mackup/brew-casks.txt：Brew 安装列表，使用 +包名 表示需要安装，注释以 # 开头；脚本会去重、排序并保留注释
- mackup-backup.sh / bin/macup：备份脚本，负责合并列表、执行 mackup backup 并同步 bin/
- mackup-restore.sh / bin/macdown：还原脚本，负责差异预览、执行 mackup restore 并按列表安装软件
- init.sh：新机器上第一步运行，为 ~/.mackup.cfg 创建软链

### 备份流程：macup

- 收集当前机器的 formula/cask，与列表合并并展示差异
- 确认后写回 brew-formulae.txt 和 brew-casks.txt
- 运行 mackup backup --force，将所有配置导出到 mackup/
- 将仓库的 bin/ 软链到 ~/.bin

### 恢复流程：macdown

- 读取 mackup/brew-\*.txt，与本机已安装列表对比，并展示「待安装／可移除」项
- 确认后执行 mackup restore --force，将 mackup/ 中的配置恢复到对应位置
- 按列表逐个安装缺失的 formula/cask（已安装的会自动跳过）
- 同步 bin/ 到 ~/.bin（与 macup 流程相同）
