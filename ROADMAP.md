# 🧚 AUI Phase 0 MVP — 开发路线图

> **版本**: v1.0  
> **状态**: 开始实施  
> **目标**: 完成"感知→推理→执行"最小闭环，验证核心链路可行

---

## 总体目标

构建一个 Chrome Extension，打开任意网站后：
1. 页面右下角出现小精灵角色
2. 小精灵自动分析页面，告诉用户"这个网站能做什么"
3. 用户可以用自然语言发出指令
4. Agent 理解指令后在页面上自动执行操作

---

## 任务分解

### Step 1: 项目脚手架搭建

**目标**: 创建可运行的 Chrome Extension 骨架

- [ ] 初始化 npm 项目，安装依赖（Vite + @crxjs/vite-plugin + Preact）
- [ ] 创建 `manifest.json`（Manifest V3）
- [ ] 创建 Content Script 入口文件
- [ ] 创建 Background Service Worker 入口文件
- [ ] 配置 Vite 构建
- [ ] 验证：在 Chrome 中加载扩展，Content Script 能打印 "AUI loaded"

**产出文件**:
```
package.json
vite.config.ts
tsconfig.json
src/manifest.json
src/background/index.ts
src/content/index.ts
```

---

### Step 2: 感知层 — DOM 提取模块

**目标**: Content Script 能提取页面的可交互元素

- [ ] 实现 `ElementExtractor`：遍历 a/button/input/select/textarea
- [ ] 实现可见性过滤（视口内 + 非隐藏 + 有尺寸）
- [ ] 实现唯一选择器生成（id → name → nth-child）
- [ ] 实现表单结构专项提取（label-input 关联）
- [ ] 实现页面内容摘要提取
- [ ] 验证：打开任意网站，Console 中能看到提取的元素列表

**产出文件**:
```
src/content/perception/ElementExtractor.ts
src/content/perception/FormExtractor.ts
src/content/perception/ContentExtractor.ts
src/content/perception/types.ts
```

---

### Step 3: 消息通信层

**目标**: Content Script 和 Background Worker 能双向通信

- [ ] 定义消息协议类型（`CSMessage` / `BGMessage`）
- [ ] Content Script 发送 `PAGE_LOADED` 消息（携带页面上下文）
- [ ] Background Worker 接收并打印页面上下文
- [ ] Background Worker 发送 `SPRITE_RESPONSE` 消息
- [ ] Content Script 接收并打印响应
- [ ] 验证：打开网页后，Background Console 能看到页面结构

**产出文件**:
```
src/shared/types.ts
src/shared/message-protocol.ts
```

---

### Step 4: LLM 客户端模块

**目标**: Background Worker 能调用 LLM API 分析页面

- [ ] 实现 `LLMClient`：封装 OpenAI 兼容 API 调用
- [ ] 实现 System Prompt 模板（角色定义 + 行为准则）
- [ ] 实现页面分析 Prompt（页面上下文 → 功能描述）
- [ ] 实现用户意图处理 Prompt（意图 + 页面 → 操作计划）
- [ ] 支持从 `.env` 或 `chrome.storage` 读取 API Key
- [ ] 验证：打开网页后，Background Console 能看到 LLM 返回的页面分析结果

**产出文件**:
```
src/background/LLMClient.ts
src/background/prompts.ts
```

---

### Step 5: 小精灵 UI 层

**目标**: 页面上出现可视化的精灵角色和对话气泡

- [ ] 实现 Shadow DOM 容器（样式隔离）
- [ ] 实现精灵角色组件（CSS 动画，5 种状态）
- [ ] 实现对话气泡组件
- [ ] 实现精灵状态机（IDLE → INTRODUCING → LISTENING → THINKING → RESPONDING）
- [ ] 实现可拖拽功能
- [ ] 验证：打开网页后，右下角出现精灵，显示"你好！这个网站可以..."

**产出文件**:
```
src/content/ui/SpriteContainer.ts
src/content/ui/SpriteCharacter.ts
src/content/ui/ChatBubble.ts
src/content/ui/styles.css
```

---

### Step 6: 端到端串联

**目标**: 完成"用户输入 → Agent 分析 → 精灵回复"的完整链路

- [ ] 用户点击精灵 → 弹出输入框
- [ ] 用户输入指令 → Content Script 发送给 Background
- [ ] Background 调用 LLM 分析意图 + 规划操作
- [ ] Background 返回结果给 Content Script
- [ ] 精灵显示回复
- [ ] 验证：打开 12306，精灵说"这是订票网站"，用户说"帮我查票"，精灵回复操作计划

---

### Step 7: 执行层 — 基础动作执行

**目标**: Agent 能在页面上执行 click 和 type 操作

- [ ] 实现 `ActionExecutor`：click / type / select / scroll
- [ ] 实现元素高亮（操作前闪烁目标元素）
- [ ] 实现操作结果验证
- [ ] 验证：Agent 能自动在搜索框中输入文字并点击搜索按钮

**产出文件**:
```
src/content/execution/ActionExecutor.ts
```

---

### Step 8: 测试与演示准备

**目标**: 准备 3 个 Demo 场景的演示

- [ ] 场景 1：12306 订票查询
- [ ] 场景 2：电商网站搜索
- [ ] 场景 3：表单自动填写
- [ ] 录制演示视频素材
- [ ] 编写演示脚本

---

## 当前进度

| Step | 状态 | 开始时间 | 完成时间 |
|------|------|---------|---------|
| Step 1: 项目脚手架 | ✅ 已完成 | 2026-05-01 | 2026-05-01 |
| Step 2: DOM 提取 | ✅ 已完成 | 2026-05-01 | 2026-05-01 |
| Step 3: 消息通信 | ✅ 已完成 | 2026-05-01 | 2026-05-01 |
| Step 4: LLM 客户端 | ✅ 已完成 | 2026-05-01 | 2026-05-01 |
| Step 5: 精灵 UI | ✅ 已完成 | 2026-05-01 | 2026-05-01 |
| Step 6: 端到端串联 | ✅ 已完成 | 2026-05-01 | 2026-05-01 |
| Step 7: 执行层 | ✅ 已完成 | 2026-05-01 | 2026-05-01 |
| Step 8: 测试演示 | 🔜 待开始 | - | - |

---

## 技术决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 构建工具 | Vite + @crxjs/vite-plugin | 快速 HMR，Extension 专用插件 |
| UI 框架 | Preact | 3KB 轻量，适合注入网页 |
| 精灵动画 | CSS Animation（Phase 0） | MVP 阶段不引入 Lottie，降低复杂度 |
| LLM Provider | OpenAI 兼容接口 | 支持多 Provider 切换 |
| 样式隔离 | Shadow DOM | 不污染宿主页面 |
| 选择器策略 | id → name → nth-child | 简单可靠，覆盖 90% 场景 |
