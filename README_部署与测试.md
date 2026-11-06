# 简记 V1.1.1 · GitHub Pages 部署与 Android PWA 更新指南

> 当前目录是本地候选版本；通过验收之前不要覆盖线上正式版本。

## 已有部署

- GitHub 仓库：`fengruiwang/jianji-ledger`
- 主分支：`main`
- GitHub Pages 网站：`https://fengruiwang.github.io/jianji-ledger/`
- Source：Deploy from a branch → `main` → `/(root)`
- 数据仍保存在当前设备本地。这个发布包不提供云同步，也不把真实账本放入 GitHub。

## 本次更新的文件

- `index.html`：四栏目、快捷记账及页面底部信息精简；业务计算脚本不变
- `navigation.js`：新增弹窗优先处理 Android 返回键；有未保存输入时提示
- `sw.js`：新的 Service Worker 缓存版本，保证离线下载完整资源
- `version.json`：标识 V1.1.1
- 本说明文件：更新为 GitHub Pages 的发布及验证步骤

**保留 GitHub 上已有的 `icons/` 三张 PNG 文件；不要用本地候选目录中的图标覆盖。**
`pwa.js` 和 `manifest.webmanifest` 沿用原版，不需要提交。

## 发布流程

1. 手机先在旧版「备份与设置」导出 JSON，确认文件已保存到其他目录。
2. 将上述变更文件提交到 `main`，避免提交任何含真实账目的 JSON 文件。
3. 在 GitHub 仓库 Actions 中确认 `pages build and deployment` 成功。
4. 手机联网打开已安装的简记，进入「管理 → 安装与程序更新 → 检查程序更新」。
5. 发现更新后，先关闭未保存的记账弹窗，再点击「更新应用」。
6. 核对原有账目、拆分、退款、预算、模板；飞行模式下重新打开测试离线功能。
7. 更新后如有问题，优先使用先前导出的 JSON 备份恢复账目，避免贸然清空浏览器网站数据。

## 测试注意

- PWA 程序更新不会主动清空 `jianji.family-ledger.v5` 存储键。
- GitHub Pages 是公开站点，只上传应用源文件，不上传真实账目。
- Android Chrome 支持 PWA，仍须用手机验证浏览器版本和操作系统返回键的实际行为。
- 不要在修改表单时强制刷新页面；更新时先保存、关闭弹窗。
