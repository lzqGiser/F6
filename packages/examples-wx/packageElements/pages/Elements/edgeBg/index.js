import F6 from '@antv/f6-wx';

import data from './data';
/**
 * edgeBg
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
    this.graph = new F6.Graph({
      context: this.ctx,
      renderer: this.renderer,
      width,
      height,
      pixelRatio,
      fitView: true,
      fitViewPadding: 60,
      // translate the graph to align the canvas's center, support by v3.5.1
      fitCenter: true,
      defaultNode: {
        type: 'circle',
        labelCfg: {
          position: 'bottom',
        },
      },
      defaultEdge: {
        labelCfg: {
          autoRotate: true,
          style: {
            fill: '#1890ff',
            fontSize: 14,
            background: {
              fill: '#ffffff',
              stroke: '#9EC9FF',
              padding: [2, 2, 2, 2],
              radius: 2,
            },
          },
        },
      },
      modes: {
        default: ['drag-canvas', 'drag-node'],
      },
      nodeStateStyles: {
        // style configurations for hover state
        hover: {
          fillOpacity: 0.8,
        },
        // style configurations for selected state
        selected: {
          lineWidth: 5,
        },
      },
    });
    this.graph.data(data);
    this.graph.render();
    this.graph.fitView();
  },
});
