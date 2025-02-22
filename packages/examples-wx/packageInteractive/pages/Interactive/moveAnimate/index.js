import F6 from '@antv/f6-wx';

import data from './data';

/**
 * moveAnimate
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
    const { ctx, rect, canvas, renderer } = event.detail
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
      defaultNode: {
        style: {
          fill: '#DEE9FF',
          stroke: '#5B8FF9',
        },
      },
      defaultEdge: {
        style: {
          stroke: '#b5b5b5',
        },
      },
      // The global configuration for graph animation also takes effect on the focusItem
      // animate: true,
      // animateCfg: {
      //   easing: 'easeCubic',
      //   duration: 500
      // }
    });

    this.graph.data(data);
    this.graph.render();
    this.graph.fitView();

    function handleNodeClick(event) {
      const { item } = event;
      // animately move the graph to focus on the item.
      // the second parameter controlls whether move with animation, the third parameter is the animate configuration
      this.graph.focusItem(item, true, {
        easing: 'easeCubic',
        duration: 500,
      });
    }

    // listen to the node click event
    this.graph.on('node:tap', handleNodeClick);
  },
});
