---
title: 子图布局
order: 3
---

## 子图布局

目前，子图布局独立与全局布局的思路，与 graph 不挂钩，直接使用实例化布局方法的方式，灌入子图数据，通过布局将位置写到相应数据中。这种机制还可供外部的全局布局使用，即使不用 F6 渲染，也可以计算节点布局后的位置。

**v4.3.0 新增流水线子图布局**，支持在 Graph.layout 中同时配置多个子图布局。详见[流水线子图布局教程](/zh/docs/manual/middle/layout/sub-layout-pipe)。

### 使用方法

```javascript
// 实例化布局
const subgraphLayout = new F6.Layout['force']({
  center: [500, 450],
});

// 初始化布局，灌入子图数据
subgraphLayout.init({
  nodes: subGraphNodes,
  edges: subGraphEdges,
});

// 执行布局
subgraphLayout.execute();

// 图实例根据数据更新节点位置
graph.positionsAnimate();
```
