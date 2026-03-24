# 9-Patch Image Preview Tool

> 🎨 在线预览和编辑 Android 9-patch (.9.png) 图片的工具

## 📖 简介

这是一个**在线 9-patch 图片预览工具**，让你无需 Android Studio 就能快速查看和测试 9-patch 图片的拉伸效果。

### 什么是 9-patch 图片？

9-patch 是 Android 开发中的一种特殊图片格式，通过在图片边界标记黑色像素来定义：
- **哪些区域可以拉伸**（适应不同屏幕尺寸）
- **哪些区域是内容区域**（文字/内容显示的地方）

### 🚀 快速开始

👉 **[立即使用](https://funydesign.github.io/fundesign.github.io/)**

## 💡 使用方法

### 1️⃣ 上传图片
- 拖拽 `.9.png` 文件到工具中，或点击选择文件
- 支持编译版（带 npTc chunk）和源版（边界标记）两种格式

### 2️⃣ 预览拉伸效果
- 工具自动识别拉伸规则和内容区域
- 实时显示图片在不同尺寸下的效果

### 3️⃣ 添加文本测试
- 在文本框输入内容
- 调整文字颜色和字号
- 实时看到文本在 9-patch 图片中的显示效果

### 4️⃣ 查看详细信息
- 图片尺寸
- 拉伸规则（横向/纵向）
- 内容区域内边距
- 最小内部尺寸

## 🎯 功能特性

✅ **支持两种 9-patch 格式**
- 编译版：Android 编译后的 .9.png（含 npTc chunk）
- 源版：设计工具导出的源版本（边界黑色标记）

✅ **实时预览**
- 动态调整文本内容、颜色、字号
- 即时看到拉伸效果

✅ **详细信息展示**
- 自动解析 9-patch 数据
- 显示拉伸规则和内容区域

✅ **完全离线**
- 纯前端实现，无需后端
- 图片不上传到服务器

## 🛠️ 技术栈

- **HTML5** - 页面结构
- **CSS3** - 样式设计
- **Vanilla JavaScript** - 核心逻辑
- **Canvas API** - 图片处理和渲染

## 📝 项目结构

```
.
├── index.html          # 主页面
├── styles.css          # 样式文件
├── app.js              # 核心逻辑
├── .github/
│   └── workflows/
│       └── pages.yml   # GitHub Actions 自动部署配置
└── README.md           # 本文件
```

## 🔧 本地开发

1. 克隆仓库
```bash
git clone https://github.com/Funydesign/fundesign.github.io.git
cd fundesign.github.io
```

2. 启动本地服务器
```bash
# 使用 Python
python -m http.server 8000

# 或使用 Node.js
npx http-server
```

3. 打开浏览器访问 `http://localhost:8000`

## 📚 9-Patch 格式说明

### 源版本 (.9.png)
- 图片四周各有 1px 的黑色标记区域
- **上边界**：标记横向拉伸区域
- **左边界**：标记纵向拉伸区域
- **右边界**：标记内容区域右边界
- **下边界**：标记内容区域下边界

### 编译版本
- Android 编译后的二进制格式
- 包含 `npTc` chunk 存储拉伸和内容信息
- 移除了边界标记，图片更小

## 🐛 故障排除

**问题：上传后显示 "9-patch 数据解析异常"**
- 检查文件是否真的是 .9.png 格式
- 尝试用另一个 9-patch 文件测试
- 查看浏览器控制台的 Debug 信息

**问题：文本显示位置不对**
- 确认内容区域内边距是否正确
- 尝试调整文字大小

## 📄 许可证

MIT License - 自由使用和修改

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 反馈

有问题或建议？欢迎在 GitHub 上提 Issue：
https://github.com/Funydesign/fundesign.github.io/issues

---

**立即体验：** 👉 [https://funydesign.github.io/fundesign.github.io/](https://funydesign.github.io/fundesign.github.io/)
