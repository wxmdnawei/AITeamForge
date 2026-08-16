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

**Team Matchmaker (AITeamForge)** 是一款专为技术竞赛与团队活动设计的 **AI 原生智能组队与互动大屏系统**。通过 Google Gemini 2.5/3 多模态模型结合 WebRTC 零配置点对点网络，实现了“大屏扫码即连 -> 随机智能分组 -> AI 赋予中英双语队名/口号/选题/破冰题 -> 全场语音合成现场播报 -> 分队频道实时同步 -> 战力雷达与海报生成”的完整闭环。

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
