import F6 from '@antv/f6';
import { wrapContext } from '../../../common/utils/context';
import { data, legendData } from './data';
import { Legend } from '@antv/f6-plugin'

import radialLayout from '@antv/f6/dist/extends/layout/radialLayout'

F6.registerLayout('radial', radialLayout);
/**
 * donutTransfer
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
    const legend = new Legend({
      width: 300,
      height: 80,
      offsetY: -2,
      offsetX: 0,
      data: legendData,
      align: 'center',
      layout: 'horizontal', // vertical
      position: 'top-left',
      padding:10,
      margin: 0,
      containerStyle: {
        fill: '#ccc',
        lineWidth: 1,
      },
    });

    // 创建F6实例
    this.graph = new F6.Graph({
      context: this.ctx,
      renderer: this.renderer,
      width,
      height,
      pixelRatio,
      fitView: true,
      fitCenter: false,
      plugins: [legend], // 这里的plugin不知道能不能用
      modes: {
        default: ['drag-canvas', 'drag-node'],
      },
      layout: {
        type: 'radial',
        focusNode: 'li',
        linkDistance: 200,
        unitRadius: 200,
      },
      defaultEdge: {
        style: {
          endArrow: true,
        },
        labelCfg: {
          autoRotate: true,
          style: {
            stroke: '#fff',
            lineWidth: 5,
          },
        },
      },
      defaultNode: {
        type: 'donut',
        style: {
          lineWidth: 0,
        },
        labelCfg: {
          position: 'bottom',
        },
      },
    });

    this.graph.data(data);
    this.graph.render();
    this.graph.get('canvas').set('localRefresh', false)

    this.graph.on('node:tap', (evt) => {
      const { item } = evt;
      this.graph.setItemState(item, 'selected', true);
    });
    this.graph.on('canvas:tap', () => {
      this.graph.getNodes().forEach((node) => {
        this.graph.clearItemStates(node);
      });
    });
  },
});
