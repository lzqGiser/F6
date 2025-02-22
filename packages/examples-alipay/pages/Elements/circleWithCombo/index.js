import F6 from '@antv/f6';
import { wrapContext } from '../../../common/utils/context';
import data from './data';
/**
 * circleWithCombo
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
    pixelRatio: 2,
    forceMini: false,
  },

  onLoad() {
    // 同步获取window的宽高
    const { windowWidth, windowHeight, pixelRatio } = my.getSystemInfoSync();

    this.setData({
      width: windowWidth,
      height: windowHeight,
      pixelRatio,
    });
  },

  /**
   * 初始化cnavas回调，缓存获得的context
   * @param {*} ctx 绘图context
   * @param {*} rect 宽高信息
   * @param {*} canvas canvas对象，在render为mini时为null
   * @param {*} renderer 使用canvas 1.0还是canvas 2.0，mini | mini-native
   */
  handleInit(ctx, rect, canvas, renderer) {
    this.isCanvasInit = true;
    this.ctx = wrapContext(ctx);
    this.renderer = renderer;
    this.canvas = canvas;
    this.updateChart();
  },

  /**
   * canvas派发的事件，转派给graph实例
   */
  handleTouch(e) {
    this.graph && this.graph.emitEvent(e);
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
      // Set groupByTypes to false to get rendering result with reasonable visual zIndex for combos
      groupByTypes: false,
      modes: {
        default: ['drag-canvas', 'drag-node', 'drag-combo', 'collapse-expand-combo'],
      },
      defaultCombo: {
        type: 'circle',
        /* style for the keyShape */
        // style: {
        //   lineWidth: 1,
        // },
        labelCfg: {
          /* label's offset to the keyShape */
          // refY: 10,
          /* label's position, options: center, top, bottom, left, right */
          position: 'top',
          /* label's style */
          // style: {
          //   fontSize: 18,
          // },
        },
      },
      /* styles for different states, there are built-in styles for states: active, inactive, selected, highlight, disable */
      /* you can extend it or override it as you want */
      // comboStateStyles: {
      //   active: {
      //     fill: '#f00',
      //     opacity: 0.5
      //   },
      // },
    });
    this.graph.data(data);
    this.graph.render();
    this.graph.fitView();

    // 监听
    this.graph.on('edge:tap', (evt) => {
      const { item } = evt;
      this.graph.setItemState(item, 'selected', true);
    });
    this.graph.on('canvas:tap', () => {
      this.graph.getEdges().forEach((edge) => {
        this.graph.clearItemStates(edge);
      });
    });
  },
});
