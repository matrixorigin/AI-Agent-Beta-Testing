# Storybook 样例数据存储规范

所有 Storybook 样例数据统一保存到 IDC MinIO。GitHub Issue 用于说明业务和记录文件位置，不作为大文件的唯一存储。

## 存储位置

- MinIO Console：`https://shanghai.idc.matrixorigin.cn:30003/browser/automation`
- Bucket：`automation`
- 账号：`qa-admin`
- 密码：只从受保护的运行时 Secret 或环境变量 `MOI_STORYBOOK_MINIO_PASSWORD` 读取，不写入技能、Issue、评论、日志或命令输出。
- Console 地址是浏览入口；上传前应确认实际可用的 S3 API Endpoint，不能未经验证把 `/browser/automation` 当作 S3 API 地址。

如果密码尚未配置到受保护的运行环境，可以向用户说明需要完成凭据配置；不得把用户给出的明文密码复制到长期文件或 GitHub。

## 独立目录

每个 Storybook 使用一个独立目录，不能与其他 Storybook 混放：

```text
s3://automation/storybook/#<Issue号>-<Issue名称>-样例数据/
```

- 目录名必须包含 Issue 编号、Issue 名称和“样例数据”，例如：`#14221-MOI-通过GitHub协作助手创建和跟进Issue-样例数据/`。
- `Issue名称` 默认使用 Storybook 标题去掉 `[Story Book]` 后的主体名称。
- 将 `/`、`\`、`:`、`*`、`?`、`"`、`<`、`>`、`|` 等不适合路径的字符替换为 `-`，连续空格和连接符合并为一个 `-`。
- 目录名应简洁且能对应 Issue；主体名称过长时可缩短，但不得省略 Issue 编号和“样例数据”。
- `#` 是对象名的一部分；生成浏览器链接时应正确 URL 编码为 `%23`，不能让它变成 URL Fragment。
- 更新已有 Storybook 时，优先复用 Issue 中已经记录的目录；没有目录时再创建一个。
- 目录创建后不要因 Issue 改名而迁移，避免已记录的链接失效。

新建 Storybook 必须先完成查重并创建 GitHub Issue，取得 Issue 编号后才能创建最终 S3 目录。不得使用没有 Issue 编号的日期目录、随机目录或临时目录作为最终交付位置。

## 构造样例文件命名

本节只适用于测试或自动化新构造的样例文件，不适用于用户上传的原始文件。

单个构造文件：

```text
#<Issue号>-<Issue名称>-样例数据.<扩展名>
```

多个构造文件：

```text
#<Issue号>-<Issue名称>-样例数据-<两位序号>-<内容说明>.<扩展名>
```

例如：

```text
#14221-MOI-通过GitHub协作助手创建和跟进Issue-样例数据-01-产品需求.txt
#14221-MOI-通过GitHub协作助手创建和跟进Issue-样例数据-02-市场计划.txt
```

- 序号从 `01` 开始，按 Storybook 中的使用顺序排列。
- `内容说明` 使用简短业务名称，不用 `test1`、`new`、`final-final` 等无法理解的名称。
- 文件扩展名必须与真实格式一致。
- 标准答案或期望输出使用同一前缀，并增加 `-标准答案` 或 `-期望输出`，不能与输入文件混淆。
- 文件内容必须明确标记为“合成测试数据”，不得伪装成客户原始材料。

## 文件处理

1. 上传前列出用户提供的全部原始文件，核对文件名、数量和大小。
2. 用户提供的原始文件保留原文件名和内容；可以保留原相对目录。遇到同名冲突时使用来源分组子目录，不改文件名。
3. 压缩包本身就是原始文件：原样上传，不擅自解压或重新压缩。
4. 所有原始样例都必须进入当前 Storybook 的 S3 目录，不因文件较小而省略。
5. GitHub 支持的较小文件可在 S3 保存后，再把同一原文件直接附到 Issue，方便查看。
6. 超过 GitHub 当前附件限制或直接附件上传失败的文件只引用 S3，不得压缩、拆分、转换或抽样规避限制。
7. 敏感数据只上传用户确认获准使用的版本；脱敏、裁剪或转换必须先获得用户明确授权。

## Issue 中的写法

在 `5.1 业务样例` 中至少记录：

- MinIO Console 入口；
- Bucket；
- 当前 Storybook 的完整目录；
- 每个原始文件的文件名和 `s3://` 对象位置；
- 小文件如另附 Issue，再补充附件链接；
- 访问权限或未上传阻塞。

示例：

```markdown
- MinIO Console：<https://shanghai.idc.matrixorigin.cn:30003/browser/automation>
- S3 目录：`s3://automation/storybook/#14221-MOI-通过GitHub协作助手创建和跟进Issue-样例数据/`
- 原始文件：
  - `sample.pdf` — `s3://automation/storybook/#14221-MOI-通过GitHub协作助手创建和跟进Issue-样例数据/sample.pdf`；[Issue 附件](<URL，如有>)
  - `documents.zip` — `s3://automation/storybook/#14221-MOI-通过GitHub协作助手创建和跟进Issue-样例数据/documents.zip`
```

不要在 Issue 中写账号、密码、Access Key、Secret Key、Cookie 或临时 Session。

## 上传与交付核对

- 新建 Storybook：先完成重复 Issue 检查并创建 Issue；获得编号后创建规范目录、上传样例，再回填并核对 Issue。
- 检查目录名包含正确的 Issue 编号、可识别的 Issue 名称和“样例数据”。
- 检查测试构造文件符合命名规则；用户提供的原始文件仍保持原名。
- 上传后重新列出目录，逐项核对原文件名、对象大小和对象数量；工具支持时校验内容哈希。
- 确认授权用户能够通过 Console 找到对应 Bucket、目录和文件。
- 逐项比对用户原始文件清单、S3 对象清单和 Issue 文件清单。
- 任一文件未成功保存时，明确记录文件名和阻塞原因，样例状态只能写“部分提供”或“上传受阻”。
- 命中重复 Issue 时，不新建目录、不上传数据；如需补充已有 Issue，先取得用户明确授权。
