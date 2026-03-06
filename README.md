# Visual Math

**Executable Mathematics 前导孵化项目** — 交互式数学可视化 demo 集合。

每个 demo 是独立的纯静态站（HTML + CSS + JS），无需构建工具，浏览器直接打开即可。

## Demos

| Demo | 描述 | 启动 |
|------|------|------|
| [TV Distance](demos/tv-distance/) | Total Variation Distance "两倍阴影面积"几何直觉可视化 | `open demos/tv-distance/index.html` |

## 项目结构

```
visual-math/
├── demos/           # 各独立 demo
│   └── tv-distance/ # TV Distance 可视化 (D3.js + MathJax)
└── shared/          # 未来公共引擎代码
```

## 技术栈

- **渲染**: D3.js v7 (CDN)
- **公式**: MathJax 3 (CDN)
- **样式**: Vanilla CSS (暗色科技主题)
- **构建**: 无 — 纯静态文件

## 路线图

参见 [Executable Mathematics](obsidian://open?vault=ObsidianLib&file=30-Area/Research/Ideas/Executable_Mathematics) 完整愿景。

- **Phase 0**: 单个高影响力 demo (✅ TV Distance)
- **Phase 1**: 每门课自然积累 3–5 个组件
- **Phase 2**: 从组件中抽象公共引擎
- **Phase 3**: 与研究和教材写作完整整合

---
*Built by Forge 🔨*
