import F6 from '@antv/f6-wx';
import TreeGraph from '@antv/f6-wx/extends/graph/treeGraph';


import data from './data';

/**
 * 缩进树-子节点两侧分布
 */

Page({
  canvas: null,
  ctx: null,
  renderer: '', // mini、mini-native等，F6需要，标记环境
  isCanvasInit: false, // canvas是否准备好了
  graph: null,

  data: {
    width: 375,
    height: 600,
    pixelRatio: 1,
    forceMini: false,
  },

  onLoad() {
    // 注册自定义树，节点等
    F6.registerGraph('TreeGraph', TreeGraph);

    // 同步获取window的宽高
    const { windowWidth, windowHeight, pixelRatio } = wx.getSystemInfoSync();

    this.setData({
      width: windowWidth,
      height: windowHeight,
      // pixelRatio,
    });
  },

  /**
   * 初始化cnavas回调，缓存获得的context
   * @param {*} ctx 绘图context
   * @param {*} rect 宽高信息
   * @param {*} canvas canvas对象，在render为mini时为null
   * @param {*} renderer 使用canvas 1.0还是canvas 2.0，mini | mini-native
   */
  handleInit(event) {
    const {ctx, rect, canvas, renderer} = event.detail
    this.isCanvasInit = true;
    this.ctx = ctx;
    this.renderer = renderer;
    this.canvas = canvas;
    this.updateChart();
  },

  /**
   * canvas派发的事件，转派给graph实例
   */
  handleTouch(e) {
    this.graph && this.graph.emitEvent(e.detail);
  },

  updateChart() {
    const { width, height, pixelRatio } = this.data;
    // 创建F6实例
    this.graph = new F6.TreeGraph({
      context: this.ctx,
      renderer: this.renderer,
      width,
      height,
      linkCenter: true,
      pixelRatio,
      fitView: true,
      modes: {
        default: ['drag-canvas'],
      },
      defaultNode: {
        size: 26,
        anchorPoints: [
          [0, 0.5],
          [1, 0.5],
        ],
      },
      defaultEdge: {
        type: 'cubic-horizontal',
      },
      layout: {
        type: 'indented',
        direction: 'H',
        indent: 80,
        getHeight: () => {
          return 10;
        },
        getWidth: () => {
          return 10;
        },
        getSide: (d) => {
          if (d.id === 'Regression' || d.id === 'Classification') return 'left';
          return 'right';
        },
      },
    });
    let centerX = 0;
    this.graph.node(function(node) {
      if (node.id === 'Modeling Methods') {
        centerX = node.x;
      }

      let pos = '';
      if (node.children && node.children.length > 0) {
        pos = 'left';
      } else if (node.x > centerX) pos = 'right';
      else pos = 'left';
      return {
        label: node.id,
        labelCfg: {
          position: pos,
          offset: 5,
        },
      };
    });
    this.graph.data(data);
    this.graph.render();
    this.graph.fitView();
  },
});
