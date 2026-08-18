# Case 自动分流与发布：安装和运维

## 1. 流程边界

源仓库的 Case 全部属于 `探索验证`。自动化执行两个阶段：

1. `Case Router` 使用 Copilot 和仓库级 Skill 生成 Storybook、Bug 或双产物草稿，并把草稿评论到源 Issue。
2. 维护者检查草稿，添加 `publish/approved`。确定性发布 Job 使用受限的 fine-grained PAT 创建或更新 `matrixorigin/matrixflow` Issue。

AI Job 只读，不接触发布 Token。发布 Job 不调用模型，也不执行 Issue 正文中的命令。

## 2. 外部前置条件

### 源仓库权限

执行安装的人需要 `matrixorigin/AI-Agent-Beta-Testing` 的 `write` 或 `maintain` 权限，用于：

- 推送初始化提交或创建 Pull Request。
- 设置 Actions Secrets。
- 运行 `Bootstrap automation labels`。
- 启用 GitHub Actions 和 Copilot Agentic Workflows。

### Copilot

- GitHub 组织需要允许 GitHub Copilot CLI / Agentic Workflows。
- 执行用户或组织需要可用的 Copilot 计划和 AI credits。
- 当前组织未启用 Copilot CLI 集中计费，使用个人账户拥有的 fine-grained PAT：Resource owner 必须是个人账户，Account permissions 只设置 `Copilot Requests: Read`，并保存为 Repository Secret `COPILOT_GITHUB_TOKEN`。
- `COPILOT_GITHUB_TOKEN` 只负责模型推理，与跨仓发布使用的 `MATRIXFLOW_AUTOMATION_TOKEN` 分离；Token 所属个人账户必须有有效 Copilot 许可。
- GitHub Agentic Workflows 当前为 Public Preview；升级 `gh-aw` 后必须重新编译 `.lock.yml` 并审查生成差异。

### Fine-grained PAT

创建一个仅供本流程使用的 fine-grained personal access token：

- Resource owner：`matrixorigin`
- Repository access：只选择 `AI-Agent-Beta-Testing` 和 `matrixflow`
- Repository permissions：`Metadata: Read-only`、`Issues: Read and write`
- Organization permissions：`Projects: Read and write`
- 建议设置 90 天有效期，并在到期前轮换

组织可能要求 Owner 审批 fine-grained PAT；审批完成前，Token 无法写入组织资源。

若不授予 Projects 权限，Storybook Issue 仍会创建，但源 Case 会被标记为 `publish/blocked` 并明确列出未加入 Project 的原因。

在源仓库添加两个职责分离的 Repository Secrets：

```text
MATRIXFLOW_AUTOMATION_TOKEN
COPILOT_GITHUB_TOKEN
```

发布 Issue 的作者会显示为 Token 所属用户 `WingWR`。不要把 Token 写入仓库文件、Issue、评论或日志；仅保存为 GitHub Actions Secret。

## 3. 拉取与初始化

```bash
git clone https://github.com/matrixorigin/AI-Agent-Beta-Testing.git
cd AI-Agent-Beta-Testing
git switch -c fix/storybook-automation

gh extension install github/gh-aw
gh aw compile .github/workflows/case-router.md
npm test
./scripts/validate.sh
```

`case-router.md` 是人类维护的源文件，`case-router.lock.yml` 是编译产物，两者都要提交。不要手工编辑 `.lock.yml`。

## 4. 首次启用

合并到 `main` 后：

1. 在仓库 Settings 中启用 Actions，并允许使用所需的已固定 SHA Actions。
2. 添加 `MATRIXFLOW_AUTOMATION_TOKEN` 和 `COPILOT_GITHUB_TOKEN` Secrets。
3. 手动运行 `Bootstrap automation labels`。
4. 创建一个无敏感信息的测试 Case。
5. 确认 Case Router 只生成草稿评论和路由 Label。
6. 审查草稿后添加 `publish/approved`。
7. 确认目标 Issue、源 Issue 回链和 Storybook Project 元数据完整。

## 5. 历史 Issue 回填

先预览：

```bash
./scripts/backfill.sh --from 2 --to 92
```

确认预算和并发后执行：

```bash
./scripts/backfill.sh --from 2 --to 92 --execute
```

建议分批执行，每批 10–20 条，避免 AI credits 和 GitHub API 瞬时消耗。

## 6. 审批语义

`publish/approved` 表示维护者确认最新 Bot 草稿中的：

- 目标标题和完整正文。
- Storybook 或 Bug 路由。
- Labels、Assignee 和 Project。
- Bug 为独立 Issue，不建立父子关系。
- 允许创建新目标 Issue，或更新此前由同一源 Case 发布的目标 Issue。

若发现同标题但尚未与源 Case 建立回链的 Open/Closed Issue，发布器会停止并添加 `publish/blocked`，不会擅自覆盖。

## 7. 样例文件限制

当前流程没有 IDC MinIO/S3 凭据，也不会自动下载 Issue 附件。Storybook 草稿必须如实记录样例状态：

- 没有样例：写“暂无”或“待测试补充”。
- 有样例但未保存：列出原文件名和未上传原因，不能写“已全部提供”。
- 需要形成完整 Storybook 时，仍需按 `moi-storybook` Skill 将获准使用的每个原文件逐个原样上传到独立 S3 目录并回填 Issue。

如后续自动化 S3 上传，必须使用独立的后置受控 Job；AI Job 不得取得 MinIO 凭据。

## 8. 故障处理

| 现象 | 处理 |
|---|---|
| 没有生成草稿 | 检查标题格式、作者 association、Copilot 策略和 AI credits |
| 草稿格式无法发布 | 编辑源 Case 后重新运行 Router，不手工伪造 Bot 草稿 |
| 发现重复 | 阅读目标正文，决定更新已有 Issue 或修改业务边界后重跑 |
| Token 无法写 matrixflow | 检查 Token 的组织审批、仓库选择及 Issues 权限 |
| Storybook 未加入 Project | 检查 Organization Projects 权限和 Project 标题 |
| 发布作者必须是 WingWR | 改走本机 Skill 提交流程；不要把个人 PAT 放进 Agent Job |
