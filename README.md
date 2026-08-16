# Team Matchmaker (AI 极客智能组队与活动大屏系统)

<p align="center">
  <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80" alt="Team Matchmaker Banner" width="100%" style="border-radius: 12px; max-height: 380px; object-fit: cover;" />
</p>

<p align="center">
  <strong>基于 Google Gemini 多模态大模型与 WebRTC 点对点通信驱动的黑客松/线下技术活动智能组队与互动系统</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Gemini_API-@google/genai-4285F4?logo=google&logoColor=white" alt="Gemini API" />
  <img src="https://img.shields.io/badge/WebRTC-PeerJS-FF4081" alt="WebRTC PeerJS" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License MIT" />
</p>

---

## 📑 目录

- [1. 项目说明](#1-项目说明)
  - [1.1 项目背景与定位](#11-项目背景与定位)
  - [1.2 核心功能特性](#12-核心功能特性)
  - [1.3 系统技术亮点](#13-系统技术亮点)
- [2. 系统逻辑与核心架构](#2-系统逻辑与核心架构)
  - [2.1 整体架构设计](#21-整体架构设计)
  - [2.2 组队与匹配状态机逻辑](#22-组队与匹配状态机逻辑)
  - [2.3 Gemini 多模态 AI 驱动机制](#23-gemini-多模态-ai-驱动机制)
  - [2.4 WebRTC P2P 无服务器实时网络逻辑](#24-webrtc-p2p-无服务器实时网络逻辑)
  - [2.5 数据流与状态持久化架构](#25-数据流与状态持久化架构)
- [3. 使用指南 (操作手册)](#3-使用指南-操作手册)
  - [3.1 主机端 (Host / 大屏组织者) 操作流程](#31-主机端-host--大屏组织者-操作流程)
  - [3.2 参赛者端 (Participant / 手机移动端) 操作流程](#32-参赛者端-participant--手机移动端-操作流程)
  - [3.3 进阶功能操作 (TTS播报、海报导出、雷达分析、历史归档)](#33-进阶功能操作)
- [4. 开发与技术文档](#4-开发与技术文档)
  - [4.1 技术栈与依赖库](#41-技术栈与依赖库)
  - [4.2 项目目录结构说明](#42-项目目录结构说明)
  - [4.3 环境搭建与本地运行](#43-环境搭建与本地运行)
  - [4.4 环境变量配置](#44-环境变量配置)
  - [4.5 核心模块与 API 详解](#45-核心模块与-api-详解)
  - [4.6 数据结构与 TypeScript 类型定义](#46-数据结构与-typescript-类型定义)
  - [4.7 生产构建与部署方案](#47-生产构建与部署方案)
  - [4.8 常见问题与排错指南 (FAQ)](#48-常见问题与排错指南-faq)

---

## 1. 项目说明

### 1.1 项目背景与定位

在黑客松 (Hackathon)、AI Coding Challenge、技术沙龙、开发者训练营或团队破冰活动中，组织者通常面临以下痛点：
1. **组队流程繁琐**：手动统计名单、随机拉群分队效率低下，缺少趣味性。
2. **缺乏身份认同**：传统分组仅有“第 1 组”、“第 2 组”等单调编号，缺少队伍主题、口号与破冰话题。
3. **现场互动断层**：大屏幕与参与者手机端无法实时联动，缺少通知触达与即时交流通道。
4. **任务缺乏针对性**：队伍成立后不知道做什么，缺少结合活动主题的定制化选题。

**Team Matchmaker** 是一款专为技术竞赛与团队活动设计的 **AI 原生智能组队与互动大屏系统**。通过 Google Gemini 2.5/3 多模态模型结合 WebRTC 零配置点对点网络，实现了“大屏扫码即连 -> 随机智能分组 -> AI 赋予中英双语队名/口号/选题/破冰题 -> 全场语音合成现场播报 -> 分队频道实时同步 -> 战力雷达与海报生成”的完整闭环。

---

### 1.2 核心功能特性

| 功能模块 | 功能描述 |
| :--- | :--- |
| 📱 **无感扫码登记** | 大屏幕实时展示动态连接二维码，参与者手机扫码即可直接通过 WebRTC P2P 加入房间，无需注册登录。 |
| 🎲 **智能均衡分组** | 支持动态设定每队人数，通过 Fisher-Yates 洗牌算法配合容量桶分配，实现完全公平的随机分配。 |
| 🧠 **Gemini 双语身份生成** | 自动为每支队伍生成中英文队名、高燃口号 (Motto)、结合活动主题的研发任务 (Mission)、破冰思考题与专属 Emoji 吉祥物。 |
| 🎙️ **Gemini 语音现场广播** | 集成 `gemini-2.5-flash-preview-tts` 语音合成模型，自动生成主持人大赛风格的中英文双语现场播报，支持全场播报、单队播报与音频播放/暂停控制。 |
| 🎨 **AI 战队海报与 3D 头像** | 调用 `gemini-2.5-flash-image` 图像生成模型，自动为队伍生成专属 3D 视觉头像及赛博朋克/极客风格宣发海报，并支持 HTML5 Canvas 一键导出高清图片。 |
| 📊 **队伍战力雷达与胜率评估** | 采用 `gemini-3-pro-preview` 深度推理模型，对队伍的「创新度、技术难度、团队默契、答辩表现」进行四维雷达评分与胜率预测，并给出专家评审建议。 |
| 👤 **个人履历深度画像评估** | 录入成员 Bio/Resume 后，AI 自动评估其与队伍任务的匹配度评分（0-100分），并自动提取 3 项核心技能标签。 |
| 💬 **多频道实时互动聊天室** | 支持「大厅公共频道」与「队伍专属加密私密频道」，集成 **AI 虚拟主持人**，具备智能回复与闲置防冷场主动互动机制。 |
| 🎯 **活动主题与任务库管理** | 支持 AI 智能联想活动主题，支持创建/AI 批量生成任务题库，并在分组时自动将任务分配至各队伍。 |
| 💾 **历史记录与多端分享** | 支持本地历史归档、JSON 格式导入导出、独立会话隔离存储，以及基于 URL Base64 编码的一键结果分享。 |
| 🎨 **多套极客主题切换** | 内置 Default (Indigo)、Cyberpunk (Yellow)、Ocean (Cyan)、Forest (Emerald)、Sunset (Orange) 等动态主题系统。 |

---

### 1.3 系统技术亮点

1. **零后端依赖的 WebRTC P2P 通信**：利用 PeerJS 与 Google Public STUN 协议，大屏作为 Host 端，手机作为 Client 端建立直连数据通道（DataChannel），免去架设私有后端 WebSocket 服务器的运维成本。
2. **多模态 Gemini 模型矩阵融合**：
   - 文本生成与 JSON 结构化抽取：`gemini-2.5-flash`
   - 语音合成与现场广播：`gemini-2.5-flash-preview-tts` (Voice: `Fenrir`)
   - 图像生成（头像/海报视觉底图）：`gemini-2.5-flash-image`
   - 深度战力分析与评审推理：`gemini-3-pro-preview`
3. **原生 Web Audio API 流畅解码**：直接接收 Gemini TTS 返回的 Base64 PCM 原始音频流，通过 ArrayBuffer/Int16Array 动态转码至 Float32 规范化声道数据，实现低延迟即时播放与暂停/恢复控制。
4. **离线双模式容错降级 (Graceful Degradation)**：在无网络或未配置 API Key 时，系统自动无缝切换至内置的本地离线极客算法字典库，确保现场活动绝不冷场。

---

## 2. 系统逻辑与核心架构

### 2.1 整体架构设计

```
                                  +---------------------------------------+
                                  |         Google Gemini API             |
                                  |  - Flash 2.5 (Text, Tasks, Topics)    |
                                  |  - TTS Preview (Audio Broadcast)      |
                                  |  - Flash Image (Posters & Avatars)    |
                                  |  - Pro Preview (Strength & Radar)     |
                                  +-------------------+-------------------+
                                                      ^
                                                      | HTTPS / REST
                                                      v
+------------------------+      WebRTC DataChannel     +------------------------+
|   Host 端 (大屏幕)      | <=======================> |  Participant 端 (手机)  |
| - 房间管理 (PeerJS)    |       (Direct P2P)        | - 扫码免登加入房间     |
| - 参与者聚合与分队算法 |                           | - 昵称登记与大厅交流   |
| - Gemini 身份赋能引擎  |                           | - 实时接收分队卡片推送 |
| - Web Audio 广播控制   |                           | - 队伍专属私密聊天频道 |
| - 历史归档与主题切换   |                           |                        |
+------------------------+                           +------------------------+
            |                                                    |
            v                                                    v
   +-------------------+                                +-------------------+
   |  Browser Storage  |                                |  Browser Storage  |
   | - LocalStorage    |                                | - LocalStorage    |
   | - SessionStorage  |                                |   (Client State)  |
   +-------------------+                                +-------------------+
```

---

### 2.2 组队与匹配状态机逻辑

匹配过程遵循严格的状态机流转，确保现场大屏动画流畅与数据一致性：

```
[ idle ] 
   │  (组织者点击 "MATCH TEAMS / 开始极客匹配")
   ▼
[ shuffling ]
   │  1. 停止当前正在播放的音频
   │  2. 解析参与者列表并生成 UUID
   │  3. Fisher-Yates 洗牌算法打乱人员顺序
   │  4. 容量桶 (Bucket Distribution) 均匀划分队伍
   │  5. 绑定任务库 (Task Library) 预置任务
   ▼
[ enriching ]
   │  1. 渲染基础队伍卡片骨架 (Skeleton)
   │  2. 构建 JSON Payload 调用 Gemini 2.5 Flash
   │  3. 生成中英文队名、口号、破冰题、Emoji 与任务
   │  4. 异常自动重试 (指数退避 withRetry) 或降级为本地离线字典
   ▼
[ complete ]
   │  1. 更新大屏队伍状态并渲染动画卡片
   │  2. 遍历所有在线 WebRTC 连接，向对应成员推送 team_assignment 消息
   │  3. AI 虚拟主持人向公共大厅发送组队完成通报
   │  4. 自动同步数据至当前 SessionStorage
```

---

### 2.3 Gemini 多模态 AI 驱动机制

系统深度结合了 Google Gemini 系列模型的多项前沿能力：

```
                           ┌──────────────────────────────────────────────┐
                           │               Gemini API 调度层              │
                           └──────────────────────┬───────────────────────┘
                                                  │
         ┌───────────────────┬────────────────────┼───────────────────┬───────────────────┐
         │                   │                    │                   │                   │
         ▼                   ▼                    ▼                   ▼                   ▼
  【身份与任务赋能】    【现场语音播报】      【AI 图像与海报】   【战力与胜率评估】  【AI 互动与破冰】
  gemini-2.5-flash   gemini-2.5-flash-    gemini-2.5-flash-   gemini-3-pro-       gemini-2.5-flash
                     preview-tts          image               preview
  - 中英文双语队名   - 现场双语主持风格   - 3D 吉祥物头像     - 四维维度打分      - 频道智能回复
  - 高燃团队口号     - Fenrir 预置人声    - 极客无文字背景底图- 胜率预测 (0-100%) - 闲置 20s 自动
  - 主题定制化任务   - Raw PCM 原始音频   - HTML5 Canvas 叠   - 专家评审建议        防冷场互动发问
  - 破冰思考题         解码播放             加渲染高清海报
```

---

### 2.4 WebRTC P2P 无服务器实时网络逻辑

系统基于 WebRTC DataChannel 实现了无中心化实时互联体系：
- **STUN 穿透策略**：配置 Google Public STUN (`stun:stun.l.google.com:19302` 等 5 组节点) 及 OpenSTUN，支持复杂的 NAT / 移动蜂窝网络穿透。
- **信令初始化**：Host 端启动时向 PeerJS Cloud Signaling 获取全局唯一 `HostId`，并将链接编码为 URL 与二维码 (`?view=join&host=<HOST_ID>`)。
- **自动心跳与重连**：设置 `pingInterval: 5000` 维持 NAT 映射；捕获 `disconnected` 与 `network` 异常事件，2 秒内自动发起重新连接。
- **双向消息协议**：
  - `join`：参赛者向主机提交昵称并建立映射。
  - `chat`：广播公共大厅或指定 `channelId` 的聊天消息。
  - `chat_history`：新用户上线时，主机自动同步最近的历史消息。
  - `team_assignment`：分队完成后，主机定向向队伍成员推送分配通知与队伍完整元数据。

---

### 2.5 数据流与状态持久化架构

- **LocalStorage (全局持久化)**：存储历史比赛归档（`matchmaker_history`），支持跨窗口查看与批量导入导出。
- **SessionStorage (标签页隔离)**：存储当前正在进行的赛事草稿（`matchmaker_session`、`matchmaker_theme`），防止多开窗口或刷新页面导致活动数据丢失，同时互不干扰。
- **URL Base64 分享**：将当前匹配成功的队伍数据进行 UTF-8 安全 Base64 编码，生成形如 `?data=eyJ0ZWFtcyI6...` 的静态只读分享链接。

---

## 3. 使用指南 (操作手册)

### 3.1 主机端 (Host / 大屏组织者) 操作流程

#### 步骤一：创建活动与定制主题
1. 打开系统首页（大屏幕显示模式）。
2. 在 **Event Name (活动名称)** 输入本次活动标题（如 `AI Code Challenge 2026`）。
3. 点击 **Suggest (AI 推荐主题)**，Gemini 将根据活动名称自动联想 5 个创意主题（如 `Neural Nexus`、`Cyberpunk Hack` 等），点击即可一键填入。
4. （可选）展开 **Project Tasks (预设任务库)**，手动添加或点击 **Generate (AI 批量生成)** 5 个切合主题的项目任务。

#### 步骤二：参与者入场与登记
- **方式 A（扫码免登）**：点击界面右上角的 **QR Code** 图标，大屏将弹出高清入场二维码。现场开发者使用手机扫码即可直接进入参赛界面并输入昵称。
- **方式 B（链接复制）**：点击 **Copy Link** 将专属链接发送至微信群/Slack/Discord。
- **方式 C（手动输入）**：在参与者文本框中每行输入一个名字，支持从 Excel/表格直接批量粘贴。

#### 步骤三：一键开始智能分组
1. 设置 **Team Size (每队人数)**（支持 2~10 人）。
2. 点击 **MATCH TEAMS / 开始极客匹配** 按钮。
3. 大屏呈现炫酷的洗牌运算与 AI 生成动画。完成后，所有队伍卡片将呈现在大屏上，同时手机端参赛者将实时收到分配通知。

---

### 3.2 参赛者端 (Participant / 手机移动端) 操作流程

1. **扫码进入**：手机微信/浏览器扫描大屏二维码，自动跳转至 `?view=join&host=xxxx`。
2. **提交登记**：输入你的昵称/ID，点击 **Join Event (加入大厅)**。
3. **大厅交流**：在大厅聊天室中与其他开发者交流，或与 **AI 虚拟主持人** 互动提问。
4. **接收分配**：主机端完成分组瞬间，手机界面将弹出动态卡片：
   - 查看你所在的队伍名称（中英文）、队伍吉祥物。
   - 查看分配给你们队伍的口号、研发任务与破冰思考题。
   - 自动解锁 **Team Channel (队伍私密聊天频道)**，仅本队成员可在此沟通战术。

---

### 3.3 进阶功能操作

#### 🎙️ AI 语音现场广播播报
- **全场总播报**：点击顶栏控制台的 **Broadcast (双语广播)** 按钮，AI 主持人将使用标准播音腔依次介绍所有队伍、成员、口号与任务。
- **单队播报**：点击任意队伍卡片底部的 **Voice** 按钮，单独播报该队伍信息。
- **播放控制**：支持实时 **Pause (暂停)**、**Resume (继续)** 与 **Stop (停止)**。

#### 🎨 战队海报与 3D 头像生成
- **一键生成 3D 头像**：点击队伍卡片顶部的头像生成按钮，Gemini 将基于队名设计专属 3D 渲染图标。
- **生成高清宣发海报**：点击队伍卡片上的 **Poster (海报)** 按钮，AI 自动绘制艺术背景，并利用 HTML5 Canvas 叠加排版，点击 **Download Poster** 即可保存 PNG 图片用于社交媒体宣发。

#### 📊 战力雷达与成员画像评估
- **战力分析**：点击队伍卡片上的 **Radar (战力)** 按钮，Gemini Pro 将评估该队伍在「创新度、技术力、默契度、展示力」的得分与预测胜率，并附带专家评审建议。
- **成员画像 (Bio Profile)**：点击队伍中的成员头像，输入或粘贴成员的简历/个人简介（如 “熟悉 React 与 PyTorch，曾获全国算法赛一等奖”），AI 将自动计算适配度评分并提炼核心技能标签。

#### 💾 历史记录与导入导出
- 点击 **History (历史记录)** 随时查看过往比赛的分组结果。
- 支持点击 **Export JSON** 备份全部历史数据，或点击 **Import JSON** 恢复数据。

---

## 4. 开发与技术文档

### 4.1 技术栈与依赖库

| 类别 | 选用技术 / 依赖 | 用途与说明 |
| :--- | :--- | :--- |
| **前端核心** | React 19 + TypeScript 5.8 + Vite 6 | 现代化响应式前端框架与秒级开发构建工具 |
| **样式与动画** | Tailwind CSS + Framer Motion | 极客风原子化样式体系与高流畅度状态转场动效 |
| **多模态 AI** | `@google/genai` (v1.30.0) | Google 官方 Gemini SDK（支持 Text, TTS, Image, Reasoning） |
| **实时网络** | `peerjs` (v1.5.2) | WebRTC 点对点通信与信令穿透协议库 |
| **音频引擎** | Web Audio API (Native) | 浏览器底层 PCM 原始音频流解码与多通道播放 |
| **图像生成** | `html2canvas` (v1.4.1) | 客户端 DOM 节点高清 Canvas 栅格化与图片导出 |
| **图标库** | `lucide-react` | 统一规范的轻量化矢量图标库 |

---

### 4.2 项目目录结构说明

```
team-matchmaker/
├── components/                  # UI 组件库
│   ├── Background.tsx           # 动态网格背景与粒子光效组件
│   ├── ChatWidget.tsx           # 实时聊天室悬浮窗与消息流
│   ├── HistoryModal.tsx         # 比赛历史记录弹窗与 JSON 导入导出
│   ├── JoinScreen.tsx           # 手机端/参与者扫码交互界面
│   ├── ParticipantInput.tsx     # 主机端活动设置、名单录入与大屏控制台
│   └── TeamCard.tsx             # 队伍卡片 (包含海报/头像/雷达/成员Bio模态框)
├── services/                    # 业务与服务层
│   ├── geminiService.ts         # Gemini 多模态 SDK 封装与 Prompt 工程实现
│   └── peerConfig.ts            # WebRTC PeerJS STUN 节点与连接策略配置
├── types.ts                     # 全局 TypeScript 接口与类型定义
├── App.tsx                      # 根应用组件 (路由切换、状态机、WebRTC 集线器)
├── index.html                   # HTML 入口 (包含 Tailwind 主题变量与 Polyfills)
├── index.tsx                    # React DOM 渲染入口
├── package.json                 # 项目依赖与运行脚本
├── tsconfig.json                # TypeScript 编译配置
├── vite.config.ts               # Vite 构建与环境变量注入配置
├── metadata.json                # Google AI Studio 应用元数据
├── .env.example                 # 环境变量模板
└── README.md                    # 本项目核心文档
```

---

### 4.3 环境搭建与本地运行

#### 前置要求
- **Node.js**：v18.0.0 或更高版本
- **包管理器**：`npm` / `yarn` / `pnpm` / `bun`
- **Gemini API Key**：前往 [Google AI Studio](https://aistudio.google.com/) 免费获取。

#### 安装与启动步骤

1. **克隆项目到本地**：
   ```bash
   git clone https://github.com/your-username/team-matchmaker.git
   cd team-matchmaker
   ```

2. **安装依赖项**：
   ```bash
   npm install
   ```

3. **配置环境变量**：
   复制环境变量模板并填入你的 Gemini API Key：
   ```bash
   cp .env.example .env.local
   ```
   在 `.env.local` 文件中填入：
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

4. **启动开发服务器**：
   ```bash
   npm run dev
   ```
   开发服务器将启动在 `http://localhost:3000`。

---

### 4.4 环境变量配置

| 变量名 | 必填 | 默认值 | 作用说明 |
| :--- | :---: | :---: | :--- |
| `GEMINI_API_KEY` | 是 | 无 | Google Gemini API 密钥，用于驱动队名生成、TTS 语音播报、海报生成与战力雷达分析。 |

> **提示**：若未配置 `GEMINI_API_KEY`，系统将自动进入**离线演示模式**，队名与任务将使用内置的极客字典进行本地随机组合，确保基本功能可用。

---

### 4.5 核心模块与 API 详解

#### 4.5.1 Gemini API 服务层 (`services/geminiService.ts`)

| 函数名 | 使用模型 | 输入参数 | 输出与功能 |
| :--- | :--- | :--- | :--- |
| `enrichTeamsWithGemini` | `gemini-2.5-flash` | `teams: Team[], eventName, eventTheme` | 结构化输出 JSON，丰富队伍的中英文名称、口号、破冰题、任务和 Emoji。 |
| `generateTeamAnnouncement` | `gemini-2.5-flash-preview-tts` | `teams: Team[], eventName` | 输出 Base64 PCM 音频，生成全场中英双语主持播报。 |
| `generateSingleTeamAnnouncement` | `gemini-2.5-flash-preview-tts` | `team: Team, eventName` | 输出 Base64 PCM 音频，生成单支队伍专属登场播报。 |
| `generateTeamPoster` | `gemini-2.5-flash-image` | `team: Team, eventName, eventTheme` | 生成无文字的高清科幻/极客背景图像（Base64）。 |
| `generateTeamAvatar` | `gemini-2.5-flash-image` | `team: Team, eventName, eventTheme` | 生成 3D 渲染风格的战队吉祥物图标。 |
| `analyzeTeamStrength` | `gemini-3-pro-preview` | `team: Team, eventName, eventTheme` | 四维战力打分（0-100）、预测胜率、评审评语与改进建议。 |
| `evaluateParticipant` | `gemini-2.5-flash` | `participant: Participant, eventTheme` | 评估成员履历与任务的匹配度，提取 3 个核心技能标签。 |
| `generateAIChatResponse` | `gemini-2.5-flash` | `history, eventName, eventTheme, channel` | 针对聊天室最新消息进行智能幽默的短回复（<30词）。 |
| `generateAIProactiveMessage` | `gemini-2.5-flash` | `eventName, eventTheme` | 聊天室静默超过 20 秒时，生成趣味发问破冰。 |

#### 4.5.2 WebRTC PeerJS 网络配置 (`services/peerConfig.ts`)

```typescript
export const PEER_CONFIG: PeerJSOption = {
  debug: 0, // 静默非致命错误日志
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:stun.openstun.net:3478' },
      { urls: 'stun:stun.time4vps.com:3478' }
    ],
    iceCandidatePoolSize: 10,
  },
  pingInterval: 5000, // 5秒心跳包维持 NAT 映射有效性
};
```

#### 4.5.3 PCM 音频解码与 Web Audio API

Gemini TTS 模型输出的音频格式为 **24kHz / 1 Channel / 16-bit Linear PCM (Base64)**。系统通过以下原生解码函数将其转换为浏览器可播放的 `AudioBuffer`：

```typescript
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // 归一化 Int16 (-32768 ~ 32767) 到 Float32 (-1.0 ~ 1.0)
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
```

---

### 4.6 数据结构与 TypeScript 类型定义

在 `types.ts` 中定义的核心数据结构如下：

```typescript
// 参赛者画像
export interface Participant {
  id: string;
  name: string;
  role?: 'Frontend' | 'Backend' | 'AI' | 'Design' | 'Fullstack';
  avatar?: string;
  bio?: string;
  evaluation?: {
    score: number;       // 适配度评分 (0-100)
    reason: string;      // 评估理由
    tags: string[];      // 核心技能标签
  };
}

// 战力分析模型
export interface TeamAnalysis {
  winRate: number;       // 预测胜率 (0-100)
  overallScore: number;  // 综合得分 (0-100)
  dimensions: {
    innovation: number;   // 创新度
    technical: number;    // 技术难度
    chemistry: number;    // 团队默契
    presentation: number; // 答辩表现
  };
  comment: string;       // 专家简评
  suggestions: string[]; // 提升建议
}

// 完整队伍模型
export interface Team {
  id: string;
  name: string;
  nameZh?: string;
  members: Participant[];
  motto: string;
  mottoZh?: string;
  icebreaker: string;
  icebreakerZh?: string;
  mascotEmoji: string;
  mascotImageUrl?: string;
  topic?: string;
  topicZh?: string;
  posterUrl?: string;
  analysis?: TeamAnalysis;
}

// 聊天消息
export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  isHost: boolean;
  timestamp: number;
  isAi?: boolean;
  channelId?: string;    // 'lobby' 或具体队伍 ID
  isSystem?: boolean;
}
```

---

### 4.7 生产构建与部署方案

#### 方案一：标准静态网站构建 (SPA)
```bash
# 生产编译
npm run build

# 预览构建产物
npm run preview
```
构建产物将输出在 `dist/` 目录中，可直接部署至 **Vercel**, **Netlify**, **Cloudflare Pages**, **GitHub Pages** 或 **Nginx**。

#### 方案二：Docker 容器化部署
编写 `Dockerfile`：
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

### 4.8 常见问题与排错指南 (FAQ)

#### Q1: 手机扫码后提示 "Missing Host ID" 或无法连接？
- **原因**：大屏幕 Host 端网络发生波动，PeerJS 重新生成了新的 `HostId`，但手机端扫描的是旧二维码。
- **解决**：点击大屏右上角二维码重新刷新，手机扫描最新二维码即可。

#### Q2: 点击语音播报没有声音？
- **原因**：现代浏览器出于安全策略，禁止未与页面发生手势交互（Click / Touch）的情况下自动播放音频。
- **解决**：在页面任意位置点击一次，或在弹出提示时点击“允许音频播放”即可正常播放。

#### Q3: Gemini API 报错 `429 Too Many Requests` 或 `Quota Exceeded`？
- **机制**：代码内置了 `withRetry` 自动指数退避重试（最多 3 次）。若配额耗尽，系统将自动降级至内置的离线字典算法，保障现场活动不中断。

#### Q4: 生成的海报如何保存到手机？
- **操作**：在队伍卡片点击 **Poster**，海报生成后长按图片选择“保存图片”或点击底部的 **Download Poster** 按钮。

---

## 📄 开源许可证

本项目采用 [MIT License](LICENSE) 许可证开源，欢迎自由使用、修改与商业分发。

---

<p align="center">
  Made with ❤️ for Hackers, Creators, and Event Organizers worldwide.
</p>
