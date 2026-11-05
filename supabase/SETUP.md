# Supabase 云端配置

1. 在 https://supabase.com/dashboard 创建项目。
2. 在 Project Settings → API 复制 Project URL 和 anon / publishable key。
3. 在 SQL Editor 执行本目录的 `schema.sql`。
4. 打开科研中心 → 复现进度管理，填写 URL 和 anon key，保存后注册/登录。
5. 在其他电脑使用同一项目和账号登录，点击“立即同步”。

不要把 service_role key 放入网页。云端同步必须由你自己的 Supabase 项目启用；本次已提交前端代码和数据库初始化脚本，但尚未替你创建 Supabase 项目。