---
title: 常用 Git 命令
categories:
  - Git
tags:
  - Git
abbrlink: b1abdfdb
date: 2019-03-12 15:40:54
---

> 最后更新时间为：2019-3-12 16:24:27

## 配置 Git ssh

```
# 设置 Git 的 name 和 email
git config --global user.name "gd4ark"
git config --global user.email "gd4ark@gmail.com"

# 生成秘钥
ssh-keygen -t rsa -C "gd4ark@gmail.com"

# 测试
ssh -T git@github.com
```

## Git 配置

```
--system # 系统级别
--global # 用户全局
--local  # 单独一个项目

# 让 Git 显示不同的颜色
git config --global color.ui true

# 让 Git 对仓库中的文件大小写敏感
git config core.ignorecase true    

# 设置别名
git config --global alias.st status

# 查看所有的已经做出的配置
git config -l
```

## 初始化版本库

```
# 在当前目录初始化一个Git版本库
git init

# 指定一个目录并将其初始化为Git版本库
git init project-path

# 下载一个项目和它的整个代码历史
git clone url
```

## 添加或删除文件

```
# 添加指定文件到暂存区
git add < 文件 | 目录 | . >

# 添加每个变化前，都会要求确认
git add -p

# 删除工作区文件，并且将这次删除放入暂存区
git rm 文件

# 停止追踪指定文件，但该文件会保留在工作区
git rm --cached 文件

# 改名文件，并且将这个改名放入暂存区
git mv a.txt b.txt
```

## 设置忽略文件

```
# 设置每个人都想要忽略的文件
> 在根目录新建一个 .gitignore 文件，并将该文件提交到版本库，文件写下你要忽略的文件

# 设置只有自己想要忽略的文件
> 修改 .git/info/exclude 文件
```

## 导出版本库

```
git archive --format=zip head > project.zip
```

## 代码提交

```
# 提交暂存区到仓库区
git commit -m "变更说明"

# 提交暂存区的指定文件到仓库区
git commit 文件1 文件2 ... -m "变更说明"

# 提交工作区自上次commit之后的变化，直接到仓库区
git commit -a

# 提交时显示所有diff信息
git commit -v

# 改写上一次commit的提交信息
git commit --amend -m "变更说明"
```

## 分支管理

```
# 列出所有本地分支
git branch

# 列出所有远程分支
git branch -r

# 列出所有本地分支和远程分支
git branch -a

# 新建一个分支，但依然停留在当前分支
git branch 分支名

# 新建一个分支，并切换到该分支
git checkout -b 分支名

# 新建一个分支，与指定的远程分支建立追踪关系
git branch --track 本地分支 远程分支

# 切换到指定分支，并更新工作区
git checkout 分支名

# 切换到上一个分支
git checkout -

# 合并指定分支到当前分支
git merge [branch]

# 选择一个commit，合并进当前分支
git cherry-pick 提交点ID

# 删除分支
git branch -d 分支名

# 删除远程分支

git push origin --delete 分支名
git branch -dr 分支名
```

## 状态和日志

```
# 显示当前分支的最近几次提交
git reflog

# 显示有变更的文件
git status

# 显示当前分支的版本历史
git log

# 显示指定文件相关的每一次diff
git log -p 文件名

# 显示commit历史
git log --stat

# 根据关键词搜索提交历史
git log -S "关键词"

# 显示过去5次提交
git log -5 --pretty --oneline

# 显示指定文件的提交信息
git blame 文件名

# 显示暂存区和工作区的差异
git diff

# 显示所有提交过的用户，按提交次数排序
git shortlog -sn

# 显示暂存区和上一个commit的差异
git diff --cached 文件名

# 显示工作区与当前分支最新commit之间的差异
git diff HEAD
```

## 远程同步

```
# 下载远程仓库的所有变动
git fetch origin

# 显示所有远程仓库
git remote -v

# 显示某个远程仓库的信息
git remote show origin

# 取回远程仓库的变化，并与本地分支合并
git pull origin 分支名

# 上传本地指定分支到远程仓库
git push origin 分支名

# 强行推送当前分支到远程仓库
git push origin --force

# 推送所有分支到远程仓库
git push origin --all
```

## 标签管理

```
# 列出所有tag
git tag

# 新建一个tag在当前commit
git tag tag名

# 新建一个分支，指向某个tag
git checkout -b 分支名 tag名

# 删除远程tag
git push origin :refs/tags/tag名

# 新建一个tag在指定commit
git tag tag名 提交点

# 删除本地tag
git tag -d tag名

# 提交指定tag
git push origin tag名

# 查看tag信息
git show tag名

# 提交所有tag
git push origin --tags
```

## 撤销修改

```
# 撤销多个文件
git checkout head 文件1 文件2

# 撤销所有txt文件
git checkout head *.txt

# 撤销所有文件
git checkout head .
```

## 修改暂存区

```
# 从暂存区恢复到工作区
git reset < 文件 | 目录 | . >

# 恢复到指定的提交版本，该$id之后的版本提交都恢复到工作区
git reset $id

# 恢复到指定的提交版本，该$id之后的版本提交全部会被抛弃，将不出现在工作区
git reset --hard $id

# 显示所有的版本记录
git reflog show master
```