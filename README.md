# 船舶多模态科研中心

面向船舶智能感知与多源数据融合的个人科研管理平台。

## 网站入口

- GitHub Pages 首页：https://defotls.github.io/maritime-research-center/
- 论文分类库：https://defotls.github.io/maritime-research-center/papers/
- 论文详情页模板：https://defotls.github.io/maritime-research-center/papers/detail.html?id=deepsorvf
- 数据集数据库：https://defotls.github.io/maritime-research-center/datasets/
- 复现进度管理：https://defotls.github.io/maritime-research-center/progress/
- 历史论文周报：https://defotls.github.io/maritime-research-center/reports/

## 研究方向

- AIS、航海雷达、可见光（RGB）、长波红外（LWIR）与毫米波雷达融合
- 船舶目标检测与小目标检测
- 多目标跟踪、遮挡鲁棒跟踪与身份恢复
- AIS-雷达、AIS-视觉跨模态轨迹关联
- 夜间、雾天与复杂海面环境感知
- 跨领域图像配准方法（例如卫星光学-SAR）单独标记，不与船载雷达混为一类

## 目录结构

- `index.html`：科研中心首页
- `papers/index.html`：可搜索、可筛选的论文分类库
- `papers/detail.html?id=...`：论文详情、方法、数据、指标、代码和复现建议
- `datasets/index.html`：数据集数据库
- `progress/index.html`：复现任务看板
- `reports/index.html`：按日期归档的周报入口
- `reports/YYYY-MM-DD.html`：每期独立周报

## 复现进度保存方式

复现进度由浏览器 localStorage 自动保存在当前设备和浏览器中。页面支持 JSON 导出与导入备份；静态 GitHub Pages 不会自动把个人进度同步到云端或其他设备。

## 文献与数据核验规则

论文状态（正式期刊/预印本）、DOI、数据集、实验指标、代码仓库和期刊分区应分别核验。未确认的信息标记为“未核实”，不得把预印本标记为正式期刊论文，也不得将不同数据集或测试协议的指标直接横向比较。数据集论文提及不等于数据已公开；只记录经核验的下载入口。


## PDF 阅读与云端同步（2026-11-05 更新）

- 论文库目前收录 7 篇：原有 3 篇 + 新增的 4 篇上传论文。
- `papers/pdf.html?id=...` 是站内 PDF 阅读器，优先加载公开作者预印本或出版社 OA PDF。
- 受限或无公开 PDF 直链的论文会显示出版社入口；用户可在 PDF 阅读页上传有权保存的 PDF 到自己的 Supabase 私有存储。
- `supabase/schema.sql` 初始化论文、数据集、复现进度、个人 PDF 元数据和私有 Storage bucket。
- `progress/index.html` 支持 Supabase 邮箱登录与复现进度跨设备同步。
- 需要用户创建自己的 Supabase 项目并执行 SQL；GitHub Pages 静态网站本身不提供数据库服务。
- 不要把 Supabase `service_role` key 放入前端。
