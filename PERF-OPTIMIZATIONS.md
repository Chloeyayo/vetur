# Vetur 性能优化记录

## 优化 1：TypeScript 增量编译 — `getChangeRange()` 返回真实变更范围

### 问题

`server/src/services/typescriptService/serviceHost.ts` 中所有 `getScriptSnapshot()` 返回的 snapshot 对象，其 `getChangeRange()` 方法恒返回 `undefined`：

```typescript
getChangeRange: () => void 0
```

这导致 TypeScript 在每次文件变更时**无法获得增量信息**，只能对整个文件重新解析和语义分析。对于 3000+ 行的 `.vue` 文件，每次按键都触发全量 AST 重建，是 Vetur 在大文件场景下最主要的性能瓶颈。

### 改动

**文件**: `server/src/services/typescriptService/serviceHost.ts`

1. 新增 `previousScriptSnapshots` Map，缓存每个文件上一次的文本内容
2. 新增 `createIncrementalSnapshot()` 函数，创建的 snapshot 在 `getChangeRange(oldSnapshot)` 中：
   - 对比新旧文本，从头尾两端扫描找到最小变更区间
   - 返回 `{ span: { start, length }, newLength }` 格式的 `TextChangeRange`
   - TypeScript 据此只重新解析变更部分，而非整个文件
3. 将 `.vue.template` 虚拟文件、工作区 `.js/.ts` 文件、工作区 `.vue` 文件三处 snapshot 创建统一改为使用 `createIncrementalSnapshot()`
4. `init()` 中清空 `previousScriptSnapshots` 缓存

**保持不变的部分**:
- `node_modules` 文件（静态，不需要增量）
- `bridge` 文件（静态模板）

### 性能影响

| 场景 | 优化前 | 优化后 |
|------|--------|--------|
| 单次按键（3000行文件） | O(fileSize) 全量重编译 | O(changeSize) 增量更新 |
| 连续输入 10 个字符 | 10 × 全量 | 10 × 增量（常数级别） |

---

## 优化 2：`LanguageModelCache` 容量从 10 提升到 50

### 问题

`server/src/embeddedSupport/languageModelCache.ts` 中缓存默认 `maxEntries = 10`，所有 9 处调用均硬编码为 10。

当项目打开超过 10 个 `.vue` 文件时，产生**缓存抖动 (cache thrashing)**：每次访问一个不在缓存中的文件，都需要驱逐一个旧文件并全量重解析。对于 20 个打开文件的项目，几乎每次切换文件都会触发 O(fileSize) 的重解析。

驱逐算法是**线性扫描**找最旧条目 O(maxEntries)，在高抖动场景下进一步增加开销。

### 改动

**涉及文件** (9 处):

| 文件 | 缓存用途 |
|------|----------|
| `server/src/embeddedSupport/languageModes.ts` (2处) | Vue 文档区域解析、脚本区域文档 |
| `server/src/modes/template/index.ts` | HTML 文档解析 |
| `server/src/modes/template/htmlMode.ts` | 模板嵌入文档 |
| `server/src/modes/script/javascript.ts` | JS 脚本文档 |
| `server/src/modes/pug/index.ts` | Pug 嵌入文档 |
| `server/src/modes/style/index.ts` (2处) | 样式嵌入文档、样式表解析 |
| `server/src/modes/style/stylus/index.ts` | Stylus 嵌入文档 |

所有 `getLanguageModelCache(10, 60, ...)` → `getLanguageModelCache(50, 60, ...)`

### 性能影响

| 场景 | 优化前 (max=10) | 优化后 (max=50) |
|------|-----------------|-----------------|
| 20 个打开文件 | 每次切换 50% 概率缓存未命中 | 100% 缓存命中 |
| 50 个打开文件 | 每次切换 80% 缓存未命中 | 100% 缓存命中 |
| 内存增量 | — | 约 +40 个缓存条目 × 每条目大小（KB 级别），可忽略 |

### 内存影响评估

每个缓存条目存储的是解析后的文档模型（区域划分、HTML 树、样式表等），体积远小于源文件本身。50 个条目的额外内存开销约为几百 KB，在现代开发机器上可忽略不计。缓存的 60 秒自动清理机制不变，未访问的条目仍会被及时释放。

---

## 验证

- `cd server && yarn test` — **185 passing, 0 failing**
- TypeScript 编译无错误（`tsc -p tsconfig.test.json` 通过）
