import F6 from '@antv/f6-wx';

import data from './data';

/**
 * fixItem:缩放画布时固定元素
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
    fixSelectedItems: {
      fixAll: true,
      fixLabel: false,
      fixLineWidth: false,
      fixState: 'yourStateName', // 'selected' by default
    },
  },

  tapButton: function(event) {
    console.log(event)
    const { mode } = event.target.dataset
    console.log(mode)
    this.graph.setMode(mode)
    // 添加模式
    switch (mode) {
    case 'all':
      this.setData({
        fixSelectedItems: {
          fixAll: true,
          fixLabel: false,
          fixLineWidth: false,
          fixState: 'yourStateName',
        },
      });
      break;
    case 'font':
      this.setData({
        fixSelectedItems: {
          fixAll: false,
          fixLabel: true,
          fixLineWidth: false,
          fixState: 'yourStateName',
        },
      });
      break;
    case 'lineWidth':
      this.setData({
        fixSelectedItems: {
          fixAll: false,
          fixLabel: false,
          fixLineWidth: true,
          fixState: 'yourStateName',
        },
      });
      break;
    }
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
    const { width, height, pixelRatio, fixSelectedItems } = this.data;
    console.log('update', fixSelectedItems);

    // 创建F6实例
    this.graph = new F6.Graph({
      context: this.ctx,
      renderer: this.renderer,
      width,
      height,
      pixelRatio,
      fitView: true,
      fitViewPadding: 60,
      modes: {
        default: [
          'drag-canvas',
          'drag-node',
          {
            type: 'zoom-canvas',
            fixSelectedItems,
          },
        ],
      },
      defaultNode: {
        size: [10, 10],
        style: {
          lineWidth: 2,
          fill: '#DEE9FF',
          stroke: '#5B8FF9',
        },
      },
      defaultEdge: {
        size: 1,
        style: {
          stroke: '#e2e2e2',
          lineAppendWidth: 2,
        },
      },
      nodeStateStyles: {
        yourStateName: {
          stroke: '#f00',
          lineWidth: 3,
        },
      },
      edgeStateStyles: {
        yourStateName: {
          stroke: '#f00',
          lineWidth: 3,
        },
      },
    });

    // 监听
    this.graph.on('node:tap', (e) => {
      this.graph.setItemState(e.item, 'yourStateName', true);
    });
    this.graph.on('edge:tap', (e) => {
      this.graph.setItemState(e.item, 'yourStateName', true);
    });

    this.graph.on('canvas:tap', () => {
      this.graph.findAllByState('node', 'yourStateName').forEach((node) => {
        this.graph.setItemState(node, 'yourStateName', false);
      });
      this.graph.findAllByState('edge', 'yourStateName').forEach((edge) => {
        this.graph.setItemState(edge, 'yourStateName', false);
      });
    });

    this.graph.data(data);
    this.graph.render();
    this.graph.fitView();
  },
});
