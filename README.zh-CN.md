# Reference Marker Fix

[English](README.md) | 简体中文

面向 **Zotero 10.0.5** 的临时社区插件，修正引用悬停浮窗中参考文献标记的位置，并使其与目标条目的首行对齐。

[下载最新版](https://github.com/Suwueng/zotero-reference-marker-fix/releases/latest)

## 修复前后对比

示例中的 **W22** 指向 **Wells & Norman (2022), ApJ, 932, 71**。原生浮窗中的红点偏到了其他条目附近；修复后，红点位于目标参考文献左侧。

| Zotero 原生效果 | 使用 Reference Marker Fix 后 |
| --- | --- |
| [![修复前：引用悬停浮窗中的红点偏离目标参考文献](docs/images/reference-marker-before.png)](docs/images/reference-marker-before.png) | [![修复后：红点对齐 Wells 与 Norman（2022）条目](docs/images/reference-marker-after.png)](docs/images/reference-marker-after.png) |

以上从论坛反馈截图中裁出同一组相邻条目，突出红点位置变化。右图包含坐标修正与视觉对齐改进；截图内容仅作裁剪。

<details>
<summary>展开查看完整原始截图</summary>

**修复前**

![修复前完整截图](https://s3.amazonaws.com/zotero.org/images/forums/u10691190/cxfzkrh5kg7q9ln4mkgs.png)

**修复后**

![修复后完整截图](https://s3.amazonaws.com/zotero.org/images/forums/u10691190/oxt6qoma83ego0b0di9d.png)

</details>

## 功能

- 修正裁掉页边空白后产生的红点坐标偏移。
- 将红点放在参考文献首行左侧，按可见字母主体居中，避免字体框留白和标点尾部影响对齐。
- 保留整页浮窗；绘制异常时回退 Zotero 原生预览。
- 停用时恢复原来的绘制方法。

## 安装与升级

1. 在 [Releases](https://github.com/Suwueng/zotero-reference-marker-fix/releases/latest) 下载 `.xpi` 文件。GitHub 自动生成的 Source code 压缩包不能作为插件安装。
2. 打开 Zotero → **工具 → 插件 → 齿轮 → 从文件安装插件**。
3. 选择 `.xpi` 文件，安装完成后重启 Zotero。
4. 打开 PDF，将鼠标停在正文引用上查看效果。

插件原名 **PDF Preview Dot Fix**。内部插件 ID 保持不变，安装新版即可覆盖升级。早期本地版本 0.1.0–0.1.5 使用占位更新地址，需要手动安装一次公开版本；0.1.6 起使用本仓库的更新清单。

## 兼容范围与撤销

- **仅支持 Zotero 10.0.5**。目前在 macOS 上确认可用，Windows 和 Linux 尚未验证。升级 Zotero 后请检查本项目是否发布兼容版本。
- 这是使用阅读器私有接口的临时社区修复。官方修复后建议停用。
- 对齐依据局部文字的位置关系进行判断。多行参考文献以首行为准；对文字无法识别、旋转页面或不支持的排版，保留已校正的链接锚点。
- 插件不修改 PDF、批注、文库数据库或 Zotero 程序文件。预览处理在本地完成；Zotero 的插件更新机制会访问 GitHub 更新清单。
- 在插件管理器停用或卸载，再重启 Zotero，即可撤销修复。

## 问题反馈

请到 [Issues](https://github.com/Suwueng/zotero-reference-marker-fix/issues) 提供 Zotero 版本、操作系统、插件版本、引用位置，以及可公开访问的示例 PDF 链接或 DOI。截图中请保留引用与目标条目的对应关系。

## 问题背景

Zotero 的内部链接预览会先裁掉页边空白，再绘制目标标记。在受影响的实现中，红点坐标没有转换到裁剪后的画布坐标系，因此向右下方偏移。

- [此前的相似问题反馈](https://forums.zotero.org/discussion/118062/highlights-of-cited-paper-on-consistently-wrong-place)：现象相似，但尚未确认该旧帖的问题根因。
- [技术分析（英文）](docs/diagnosis.md)：说明裁剪坐标错误，以及与之独立的视觉对齐改进。

## 开发

单元测试和打包无需安装 npm 依赖：

```sh
node test.cjs
python3 build.py
```

生成的 XPI 位于 `dist/`。`updates.json` 包含发布地址、精确兼容范围和 SHA-256 校验值。发布后续版本时，更新 `manifest.json`、构建安装包、重新生成更新条目，先发布对应安装包，再发布更新清单。

测试覆盖裁剪偏移、缩放、旋转回退、文字行选择、标点尾部、启停恢复、版本限制，以及保留后续其他补丁的行为。开发期间也在真实 PDF 阅读器中验证过绘制代码；自动测试使用合成数据，不会启动 Zotero 或打开浏览器。

## 贡献说明

本插件由 Suwueng 在 OpenAI Codex 的协助下开发。Codex 协助完成坐标错位分析、临时修复与视觉对齐实现、测试编写与执行，以及发布准备。Suwueng 提出问题、确定功能和命名方向，在日常 Zotero 使用中测试插件，并确认最终显示效果。

## 许可证与来源

本项目按 [GNU Affero General Public License v3](COPYING) 分发。预览绘制方法改编自 [Zotero Reader](https://github.com/zotero/reader)，其版权归 Corporation for Digital Scholarship 所有。本项目的修改包括红点坐标修正、视觉对齐和插件生命周期处理。上游版权声明与完整许可证见 COPYING。
