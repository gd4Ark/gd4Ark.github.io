# blog-content Specification

## Purpose
TBD - created by archiving change complete-openspec-article. Update Purpose after archive.
## Requirements
### Requirement: OpenSpec 使用心得博客文章
博客系统 SHALL 包含一篇完整的关于 OpenSpec 使用心得的文章，文章应涵盖 AI 工具使用、开发者演进阶段、OpenSpec 解决方案、使用流程、实践心得和总结展望等内容。

#### Scenario: 文章内容完整性
- **WHEN** 用户访问博客文章页面
- **THEN** 文章应包含所有五个主要部分：AI 工具拥抱、演进阶段、困境与解决方案、特点与流程、实践心得

#### Scenario: 文章标题和目录结构
- **WHEN** 文章文件存在
- **THEN** 文章标题应为"OpenSpec 使用心得"（7个字以内），目录结构应遵循提案中定义的章节结构：
  - 引言：拥抱 AI 工具
  - AI 工具的演进阶段（无需子标题，以段落形式描述四个阶段）
  - 现有困境与解决方案（包含4个子章节）
  - OpenSpec 使用案例（包含完成这篇文章提案的子章节）
  - 个人实践心得

#### Scenario: 文章格式规范
- **WHEN** 文章文件存在
- **THEN** frontmatter 应包含必需的字段（title, pubDatetime, tags, description）且格式正确

#### Scenario: 使用流程之前的内容完整性
- **WHEN** 文章包含"使用流程"章节
- **THEN** "使用流程"章节之前应包含以下完整内容：
  - 引言部分：阐述 2025 年开发者应积极拥抱 AI 工具的必要性
  - 开发者使用 AI 工具的演进阶段：详细描述四个阶段（洪荒时代、集成时代、增强时代、智能时代），每个阶段应包含阶段名称、特点描述和该阶段的具体表现
  - 现有流程的困境与 OpenSpec 的解决方案：分析现有 AI 辅助开发流程的问题（上下文丢失、缺乏规范、决策记录缺失、变更管理混乱、知识传承困难），并说明 OpenSpec 如何通过规范驱动开发理念解决这些问题

#### Scenario: 文章精炼度
- **WHEN** 文章完成
- **THEN** 应遵循以下原则：
  - 去除所有冗余和重复内容：避免相同观点或信息的重复表述（如"共识无法复用"不应在多处重复出现）
  - 合并相似内容的段落：将重复表达的内容合并或精简
  - 使用案例部分需要详细描述：保留对话示例和文件内容示例，不能忽略这些重要示例
  - 其他部分精简：除了使用案例部分外，其他部分应精简，每个段落紧扣主题，避免过渡冗余的描述
  - 确保所有技术描述准确无误

#### Scenario: 名词使用一致性
- **WHEN** 文章完成
- **THEN** 名词使用应保持一致：
  - 当指代具体的 AI 助手时，统一使用"AI Agent"（如"AI Agent 会根据..."）
  - 当泛指 AI 能力或技术时，使用"AI"（如"AI 工具"、"AI 能力"）
  - 当指代工具时，使用"AI 工具"或具体工具名称（如"Cursor"、"GitHub Copilot"）
  - 避免在同一段落或相邻段落中混用不同名词指代同一概念
  - 根据上下文场景选择最合适的名词，但全文保持一致性

#### Scenario: 演进阶段准确性
- **WHEN** 文章包含"AI 工具的演进阶段"章节
- **THEN** 应准确描述四个阶段：
  - 阶段1（洪荒时代）：GitHub Copilot tab 补全 → ChatGPT 网页手动复制代码，AI 充其量只能是一个辅助的工具
  - 阶段2（集成时代）：Cursor 等 AI 编辑器，直接在编辑器对话，省去了手动复制代码的繁琐流程
  - 阶段3（增强时代）：MCP 协议，可以读取文件、执行命令等，AI 可以做更多事情
  - 阶段4（智能时代）：AI Agent 自主驱动，自主规划步骤，它完全可以自己干活

#### Scenario: 困境与解决方案的详细描述
- **WHEN** 文章包含"现有流程的困境与 OpenSpec 的解决方案"章节
- **THEN** 应包含以下内容：
  - 现有流程的问题：`.cursorrules` 等文件规范 AI Agent 的方式不够；chat 模式我们会误导，AI Agent 会误解；每次修改都是黑盒，改错了要推倒重来；上下文会串台；超过上下文后信息丢失；共识无法复用（此问题只在此处完整表述，不应在其他地方重复出现）
  - 过去的工作方式及其局限：描述先让 AI Agent 给思路，OK 了再写的方式，但核心问题依然存在（避免重复"共识无法复用"的完整表述）
  - OpenSpec 的解决思路：每个改动都是提案，实施前可以完善补充，心里有底；保留的文件是可切换性和知识传承的重要资源
  - 角色的转变：从微观指导 AI Agent 到宏观放权，工作流程是：讲需求 → AI Agent 写设计文档（提案）→ review 提出问题 → AI Agent 修改提案 → OK 后出活

#### Scenario: OpenSpec 使用案例
- **WHEN** 文章包含"OpenSpec 的特点与使用流程"章节
- **THEN** 应包含以下内容（按顺序）：
  - 工具介绍：准确说明 spec-kit 和 OpenSpec 的区别
    - spec-kit 的优势：适合 greenfield/0→1（从零开始的项目）
    - OpenSpec 的优势：采用两文件夹模型（specs/ 存放当前规范，changes/ 存放提案），更适合修改现有功能或涉及多个 spec 的场景，可扩展性更好
    - 注意：不要说是"早期"工具，避免误导
  - OpenSpec 的安装方法：
    - 检查 Node.js 版本（需要 >= 20.19.0）
    - 全局安装命令：`npm install -g @fission-ai/openspec@latest`
    - 验证安装：`openspec --version`
  - OpenSpec 的初始化方法：
    - 进入项目目录
    - 运行 `openspec init`
    - 说明初始化过程（选择 AI 工具、配置 slash commands、创建 openspec/ 目录结构）
    - 初始化后的验证：`openspec list`
  - 参考 https://github.com/Fission-AI/OpenSpec 获取准确信息
  - 实际使用案例：使用 OpenSpec 完成这篇文章提案本身（详细描述，不能忽略对话示例和文件内容）
    - 详细描述对话过程：从提出需求到完善提案的完整对话示例
    - 展示 OpenSpec 产生的文件结构（proposal.md、tasks.md、specs/blog-content/spec.md）
    - 详细展示各文件的大概内容示例，说明每个文件的作用
    - 强调提案的价值：共识可持久化、知识可传承

#### Scenario: 个人实践心得
- **WHEN** 文章包含"个人实践心得"章节
- **THEN** 应包含以下内容：
  - 先接触 spec-kit 的经历：流程比较繁琐，看不懂
  - 转向 OpenSpec 的原因：更轻量，更适用于自己
  - 核心使用理念：不想花心思记住 OpenSpec 的指令，只需要记住如何正确初始化 OpenSpec
  - AI Agent 自动化的优势：可以让 AI Agent 自动根据 OpenSpec 规范使用对应指令（如创建提案、验证提案等），只需要关注提案内容是否与需求一致
  - 降低心智负担：切换使用时没有心智负担，最重要的是流程和规范
  - 工具的可切换性：工具选择变得不重要，因为只要 OpenSpec 相关文件还在，可以随时切换成别的 AI Agent 工具

