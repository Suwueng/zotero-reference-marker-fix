# Reference Marker Fix

[English](README.md) | 简体中文

面向 **Zotero** 的临时社区插件，修正引用悬停浮窗中参考文献标记的位置，并使其与目标条目的首行对齐。

[下载最新版](https://github.com/Suwueng/zotero-reference-marker-fix/releases/latest)

## 修复前后对比

**修复前**

![修复前：红点偏离目标参考文献](docs/images/reference-marker-before.png)

**修复后**

![修复后：红点与目标参考文献对齐](docs/images/reference-marker-after.png)

## 功能

- 修正裁掉页边空白后产生的红点坐标偏移。
- 将红点放在参考文献首行左侧，按可见字母主体居中，避免字体框留白和标点尾部影响对齐。
- 保留整页浮窗；绘制异常时回退 Zotero 原生预览。
- 停用时恢复原来的绘制方法。

## 安装

1. 在 [Releases](https://github.com/Suwueng/zotero-reference-marker-fix/releases/latest) 下载 `.xpi` 文件。GitHub 自动生成的 Source code 压缩包不能作为插件安装。
2. 打开 Zotero → **工具 → 插件 → 齿轮 → 从文件安装插件**。
3. 选择 `.xpi` 文件，安装完成后重启 Zotero。

## 兼容范围与撤销

- 已在 **macOS 的 Zotero 10.0.5** 上验证。同时兼容 **10.0.6**：其内置阅读器代码与 10.0.5 一致，回归测试通过。当前安装包支持 10.0.5–10.0.6；其他版本及 Windows、Linux 的兼容性尚未验证。
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

## 贡献说明

本插件由 Suwueng 在 OpenAI Codex 的协助下开发。Codex 协助完成坐标错位分析、临时修复与视觉对齐实现、测试编写与执行，以及发布准备。Suwueng 提出问题、确定功能和命名方向，在日常 Zotero 使用中测试插件，并确认最终显示效果。

## 许可证与来源

本项目按 [GNU Affero General Public License v3](COPYING) 分发。预览绘制方法改编自 [Zotero Reader](https://github.com/zotero/reader)，其版权归 Corporation for Digital Scholarship 所有。本项目的修改包括红点坐标修正、视觉对齐和插件生命周期处理。上游版权声明与完整许可证见 COPYING。
