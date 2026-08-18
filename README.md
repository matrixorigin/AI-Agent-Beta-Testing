# AI Agent Beta Testing

本仓库收集 MOI 智能体平台的探索验证 Case，并自动把 Case 转换为可审核的 MatrixFlow Storybook 或 Bug 草稿。

## 自动分流

| Case 结果 | 草稿产物 |
|---|---|
| 完全完成且结果可直接使用 | Storybook |
| 未完成或结果不可用 | Bug |
| 部分完成或修改后可用 | Storybook + Bug |
| 信息冲突、缺失或重复 | 请求补充或返回重复候选 |

自动化不会在 Issue 创建时直接写入 `matrixorigin/matrixflow`。维护者检查草稿，并在源 Issue 上添加 `publish/approved` 后，发布流程才会执行。

## 目录

- `.agents/skills/`：`moi-storybook` 和 `matrixflow-bug-report` 的仓库级 Skill。
- `.github/workflows/case-router.md`：Copilot Agentic Workflow 源文件。
- `.github/workflows/publish-approved.yml`：批准后的确定性跨仓发布流程。
- `.github/workflows/bootstrap-labels.yml`：初始化自动化 Labels。
- `.github/ISSUE_TEMPLATE/moi-case.yml`：后续内测 Case 的结构化 Issue Form。
- `docs/automation-setup.md`：权限、Secrets、安装和运维说明。

## 本地验证

```bash
npm test
gh aw compile .github/workflows/case-router.md
./scripts/validate.sh
```

完整启用步骤见 [`docs/automation-setup.md`](docs/automation-setup.md)。
