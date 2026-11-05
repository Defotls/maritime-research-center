# Supabase 云端配置与 PDF 私有存储

网站已经包含 Supabase 登录、复现进度云同步和个人 PDF 私有存储前端。启用跨设备同步需要你自己的 Supabase 项目。

1. 在 https://supabase.com/dashboard 创建项目。
2. 在 Project Settings → API 复制 Project URL 和 anon / publishable key。
3. 打开 SQL Editor，完整执行仓库中的 \`schema.sql\`。脚本会创建论文表、数据集表、复现进度表、私有 PDF 元数据表、私有 Storage bucket 和 RLS 策略。
4. 打开科研中心 → 复现进度管理，填写 Project URL 和 anon key，点击保存。
5. 注册邮箱账号并登录，点击“立即同步”。
6. 在另一台电脑打开同一网站，填写相同的项目 URL 和 anon key，使用同一账号登录即可同步。

## PDF 阅读

- 可公开访问的作者预印本或出版社 OA PDF 会在站内阅读器直接显示。
- 对没有公开直链的论文，登录后可在 PDF 阅读器上传自己有权保存的 PDF。
- PDF 存储在私有 bucket，文件路径以用户 ID 开头，RLS 限制只能由文件所有者访问；阅读时生成限时签名 URL。
- 论文详情页会区分预印本 PDF 与正式期刊 DOI，不把二者混为一谈。

## 安全

不要将 Supabase \`service_role\` key 放入网页，也不要发送给任何人。只使用 anon / publishable key；数据隔离依靠数据库和 Storage 的 RLS 策略。
