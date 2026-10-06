# Zotero PDF Preview Dot Fix

A temporary community plugin for **Zotero 10.0.5** that fixes the displaced red dot in PDF internal-link previews and aligns it with the target reference's first line.

[下载最新版 / Download latest release](https://github.com/Suwueng/zotero-pdf-preview-dot-fix/releases/latest)

## 中文

在 Zotero 中悬停引用链接时，预览红点有时会偏到相邻参考文献。这个插件修正裁掉页边空白后遗漏的坐标偏移，并把红点放到目标条目首行左侧，按可见字母主体居中。整页预览保持不变。

### 安装

1. 在 [Releases](https://github.com/Suwueng/zotero-pdf-preview-dot-fix/releases/latest) 下载 `.xpi` 文件。不要下载 GitHub 自动生成的 Source code 压缩包来安装。
2. 打开 Zotero → 工具 → 插件 → 齿轮 → 从文件安装插件。
3. 选择 `.xpi`，完成后重启 Zotero。
4. 打开 PDF，将鼠标停在正文引用上查看效果。

升级覆盖安装即可。早期本地版本 0.1.0–0.1.5 使用占位更新地址，需要手动安装一次公开版本；0.1.6 起配置了本仓库的更新清单。

### 兼容范围与撤销

- **仅支持 Zotero 10.0.5**。目前在 macOS 上确认可用，Windows/Linux 尚未验证。升级 Zotero 后请检查本项目是否发布兼容版本。
- 这是临时社区修复，使用阅读器私有接口；官方修复后建议停用。
- 多行参考文献以首行为准。对文字无法识别、旋转或不支持的排版，保留已校正的链接锚点；绘制异常时回退原生预览。
- 插件不修改 PDF、批注、文库数据库或 Zotero 程序文件。预览处理在本地完成；Zotero 的插件更新机制会访问 GitHub 更新清单。
- 在插件管理器停用或卸载，再重启 Zotero即可撤销。

### 反馈

请到 [Issues](https://github.com/Suwueng/zotero-pdf-preview-dot-fix/issues) 提供 Zotero 版本、操作系统、插件版本、引用位置，以及可公开访问的示例 PDF 链接或 DOI。截图中请保留引用与目标条目的关系。

## English

Zotero's internal-link preview trims the page margins before drawing the destination marker. In the affected implementation, the dot coordinates are not translated to the cropped canvas, so the marker shifts down and to the right.

This plugin:

- Corrects the crop-coordinate offset.
- Places the dot left of a nearby matching text line and centers it on the visible letter body, excluding sparse punctuation tails.
- Preserves the full-page preview and falls back to the native renderer if the replacement fails.
- Restores the original method when disabled.

Install the `.xpi` from [Releases](https://github.com/Suwueng/zotero-pdf-preview-dot-fix/releases/latest) through **Tools → Plugins → gear → Install Plugin From File**, then restart Zotero. Only Zotero **10.0.5** is supported; interactive use has been confirmed on macOS. Windows and Linux are unverified.

The alignment is a local geometric heuristic, not bibliographic identification. Multi-line references align to the first line. Unsupported text layouts retain the corrected destination anchor. This is a community workaround, not an official Zotero release.

## Background

- [Earlier report: Highlights of cited paper on consistently wrong place](https://forums.zotero.org/discussion/118062/highlights-of-cited-paper-on-consistently-wrong-place) — similar symptoms; the cause of that earlier report has not been confirmed.
- [Technical diagnosis](docs/diagnosis.md) — crop-coordinate bug and the separate visual-alignment enhancement.

## Development

No npm dependencies are needed for the unit tests or packaging:

```sh
node test.cjs
python3 build.py
```

The XPI is written to `dist/`. `updates.json` contains the release URL, exact compatibility range and SHA-256 digest. For a future release, update `manifest.json`, build, regenerate the update entry, publish the matching release asset, then publish the update manifest.

Tests cover crop offsets, zoom, rotation fallback, text-line selection, punctuation tails, startup/shutdown, version gating and preservation of subsequent patches. The rendering code was also exercised with a real PDF reader during development; automated tests use synthetic fixtures and do not start Zotero or open a browser.

## License and attribution

[GNU Affero General Public License v3](COPYING). The preview-rendering method is adapted from [Zotero Reader](https://github.com/zotero/reader), copyright Corporation for Digital Scholarship. Local modifications correct the dot coordinates, add visual alignment and provide plugin lifecycle handling. See the included upstream copyright and license text.
