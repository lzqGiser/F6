import { Canvas as GMobileCanvas } from '@antv/g-mobile';
import { IGroup } from '@antv/g-base';
import { mat3 } from '@antv/matrix-util';
import { clone, deepMix, each, isString, isNumber } from '@antv/util';
import { IGraph, DataUrlType } from '../interface/graph';
import { AbstractGraph, GraphOptions } from '@antv/f6-core';

import { WaterMarkerConfig } from '../types';
import Global from '../global';
import { LayoutController, EventController } from './controller';
import PluginBase from '../plugin/base';
import { createDom } from '@antv/dom-util';

export const registerGraph = (graphName: string, GraphFunction: any, G6: Object): Object => {
  if (G6[graphName]) {
    console.warn(`The graph with the name ${graphName} exists already, it will be overridden`);
  }
  G6[graphName] = GraphFunction(G6);
  return G6;
};
export default class Graph extends AbstractGraph implements IGraph {
  // private cfg: GraphOptions & { [key: string]: any };

  public destroyed: boolean;

  constructor(cfg: GraphOptions) {
    super(cfg);

    if (this.get('renderer').startsWith('mini')) {
      this.set('context', (cfg as any).context);
    }

    super.init();
    const defaultNode = this.get('defaultNode');
    if (!defaultNode) {
      this.set('defaultNode', { type: 'circle' });
    }
    if (!defaultNode.type) {
      defaultNode.type = 'circle';
      this.set('defaultNode', defaultNode);
    }
    this.destroyed = false;
  }

  // 这里是为了规避基类那个deepmix，等待架构调整
  protected init() {}

  public emitEvent(event) {
    const canvas: GMobileCanvas = this.get('canvas');
    event.type = event.type.toLowerCase();
    canvas.registerEventCallback(event);
  }

  protected initLayoutController() {
    const layoutController = new LayoutController(this);
    this.set({
      layoutController,
    });
  }

  protected initEventController() {
    const eventController = new EventController(this);
    this.set({
      eventController,
    });

    if (this.get('renderer').startsWith('mini')) {
      return;
    }

    const canvas: GMobileCanvas = this.get('canvas');
    const canvasDom = canvas.get('el');
    'touchstart touchmove touchend touchcancel'.split(' ').forEach((key) => {
      canvasDom.addEventListener(key, canvas.registerEventCallback.bind(canvas), false);
    });
  }

  protected initCanvas() {
    let container: string | HTMLElement | Element | null = this.get('container');
    if (container !== null && typeof container === 'string') {
      container = document.getElementById(container);
      this.set('container', container);
    }

    const renderer: string = this.get('renderer');

    if (!container && !renderer.startsWith('mini')) {
      throw new Error('invalid container');
    }

    const width: number = this.get('width');
    const height: number = this.get('height');
    const context: string = this.get('context');
    const fitView: boolean = this.get('fitView');

    const canvasCfg: any = {
      container, // native canvas 会传递 requestAnimationFrame, clearAnimationFrame 等函数进来
      context,
      width,
      height,
      renderer,
      fitView,
    };

    const pixelRatio = this.get('pixelRatio');

    if (pixelRatio) {
      canvasCfg.pixelRatio = pixelRatio;
    }

    const canvas = new GMobileCanvas(canvasCfg);

    this.set('canvas', canvas);
  }

  protected initPlugins(): void {
    const self = this;
    each(self.get('plugins'), (plugin) => {
      if (!plugin.destroyed && plugin.initPlugin) {
        plugin.initPlugin(self);
      }
    });
  }

  /**
   * 返回可见区域的图的 dataUrl，用于生成图片
   * @param {String} type 图片类型，可选值："image/png" | "image/jpeg" | "image/webp" | "image/bmp"
   * @param {string} backgroundColor 图片背景色
   * @return {string} 图片 dataURL
   */
  public toDataURL(type?: DataUrlType, backgroundColor?: string): string {
    const canvas: GMobileCanvas = this.get('canvas');
    const renderer = canvas.getRenderer();
    const canvasDom = canvas.get('el');

    if (!type) type = 'image/png';

    let dataURL = '';
    if (renderer === 'svg') {
      const cloneNode = canvasDom.cloneNode(true);
      const svgDocType = document.implementation.createDocumentType(
        'svg',
        '-//W3C//DTD SVG 1.1//EN',
        'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd',
      );
      const svgDoc = document.implementation.createDocument(
        'http://www.w3.org/2000/svg',
        'svg',
        svgDocType,
      );
      svgDoc.replaceChild(cloneNode, svgDoc.documentElement);
      const svgData = new XMLSerializer().serializeToString(svgDoc);
      dataURL = `data:image/svg+xml;charset=utf8,${encodeURIComponent(svgData)}`;
    } else {
      let imageData;
      const context = canvasDom.getContext('2d');
      const width = this.get('width');
      const height = this.get('height');
      let compositeOperation;
      if (backgroundColor) {
        const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
        imageData = context.getImageData(0, 0, width * pixelRatio, height * pixelRatio);
        compositeOperation = context.globalCompositeOperation;
        context.globalCompositeOperation = 'destination-over';
        context.fillStyle = backgroundColor;
        context.fillRect(0, 0, width, height);
      }
      dataURL = canvasDom.toDataURL(type);
      if (backgroundColor) {
        context.clearRect(0, 0, width, height);
        context.putImageData(imageData, 0, 0);
        context.globalCompositeOperation = compositeOperation;
      }
    }
    return dataURL;
  }

  /**
   * 返回整个图（包括超出可见区域的部分）的 dataUrl，用于生成图片
   * @param {Function} callback 异步生成 dataUrl 完成后的回调函数，在这里处理生成的 dataUrl 字符串
   * @param {String} type 图片类型，可选值："image/png" | "image/jpeg" | "image/webp" | "image/bmp"
   * @param {Object} imageConfig 图片配置项，包括背景色和上下左右的 padding
   */
  public toFullDataURL(
    callback: (res: string) => any,
    type?: DataUrlType,
    imageConfig?: { backgroundColor?: string; padding?: number | number[] },
  ) {
    const bbox = this.get('group').getCanvasBBox();
    const height = bbox.height;
    const width = bbox.width;
    const renderer = this.get('renderer');
    const vContainerDOM: HTMLDivElement = createDom('<id="virtual-image"></div>');

    const backgroundColor = imageConfig ? imageConfig.backgroundColor : undefined;
    let padding = imageConfig ? imageConfig.padding : undefined;
    if (!padding) padding = [0, 0, 0, 0];
    else if (isNumber(padding)) padding = [padding, padding, padding, padding];

    const vHeight = height + padding[0] + padding[2];
    const vWidth = width + padding[1] + padding[3];
    const canvasOptions = {
      container: vContainerDOM,
      height: vHeight,
      width: vWidth,
      quickHit: true,
    };

    const vCanvas = new GMobileCanvas(canvasOptions);

    const group = this.get('group');
    const vGroup = group.clone();

    let matrix = clone(vGroup.getMatrix());
    if (!matrix) matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    const centerX = (bbox.maxX + bbox.minX) / 2;
    const centerY = (bbox.maxY + bbox.minY) / 2;
    mat3.translate(matrix, matrix, [-centerX, -centerY]);
    mat3.translate(matrix, matrix, [width / 2 + padding[3], height / 2 + padding[0]]);

    vGroup.resetMatrix();
    vGroup.setMatrix(matrix);
    vCanvas.add(vGroup);

    const vCanvasEl = vCanvas.get('el');

    let dataURL = '';
    if (!type) type = 'image/png';

    setTimeout(() => {
      if (renderer === 'svg') {
        const cloneNode = vCanvasEl.cloneNode(true);
        const svgDocType = document.implementation.createDocumentType(
          'svg',
          '-//W3C//DTD SVG 1.1//EN',
          'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd',
        );
        const svgDoc = document.implementation.createDocument(
          'http://www.w3.org/2000/svg',
          'svg',
          svgDocType,
        );
        svgDoc.replaceChild(cloneNode, svgDoc.documentElement);
        const svgData = new XMLSerializer().serializeToString(svgDoc);
        dataURL = `data:image/svg+xml;charset=utf8,${encodeURIComponent(svgData)}`;
      } else {
        let imageData;
        const context = vCanvasEl.getContext('2d');
        let compositeOperation;
        if (backgroundColor) {
          const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
          imageData = context.getImageData(0, 0, vWidth * pixelRatio, vHeight * pixelRatio);
          compositeOperation = context.globalCompositeOperation;
          context.globalCompositeOperation = 'destination-over';
          context.fillStyle = backgroundColor;
          context.fillRect(0, 0, vWidth, vHeight);
        }
        dataURL = vCanvasEl.toDataURL(type);
        if (backgroundColor) {
          context.clearRect(0, 0, vWidth, vHeight);
          context.putImageData(imageData, 0, 0);
          context.globalCompositeOperation = compositeOperation;
        }
      }
      if (callback) callback(dataURL);
    }, 16);
  }

  /**
   * 导出包含全图的图片
   * @param {String} name 图片的名称
   * @param {String} type 图片类型，可选值："image/png" | "image/jpeg" | "image/webp" | "image/bmp"
   * @param {Object} imageConfig 图片配置项，包括背景色和上下左右的 padding
   */
  public downloadFullImage(
    name?: string,
    type?: DataUrlType,
    imageConfig?: { backgroundColor?: string; padding?: number | number[] },
  ): void {
    const bbox = this.get('group').getCanvasBBox();
    const height = bbox.height;
    const width = bbox.width;
    const renderer = this.get('renderer');
    const vContainerDOM: HTMLDivElement = createDom('<id="virtual-image"></div>');

    const backgroundColor = imageConfig ? imageConfig.backgroundColor : undefined;
    let padding = imageConfig ? imageConfig.padding : undefined;
    if (!padding) padding = [0, 0, 0, 0];
    else if (isNumber(padding)) padding = [padding, padding, padding, padding];

    const vHeight = height + padding[0] + padding[2];
    const vWidth = width + padding[1] + padding[3];
    const canvasOptions = {
      container: vContainerDOM,
      height: vHeight,
      width: vWidth,
    };
    const vCanvas = new GMobileCanvas(canvasOptions);

    const group = this.get('group');
    const vGroup = group.clone();

    let matrix = clone(vGroup.getMatrix());
    if (!matrix) matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    const centerX = (bbox.maxX + bbox.minX) / 2;
    const centerY = (bbox.maxY + bbox.minY) / 2;
    mat3.translate(matrix, matrix, [-centerX, -centerY]);
    mat3.translate(matrix, matrix, [width / 2 + padding[3], height / 2 + padding[0]]);

    vGroup.resetMatrix();
    vGroup.setMatrix(matrix);
    vCanvas.add(vGroup);

    const vCanvasEl = vCanvas.get('el');

    if (!type) type = 'image/png';
    setTimeout(() => {
      let dataURL = '';
      if (renderer === 'svg') {
        const cloneNode = vCanvasEl.cloneNode(true);
        const svgDocType = document.implementation.createDocumentType(
          'svg',
          '-//W3C//DTD SVG 1.1//EN',
          'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd',
        );
        const svgDoc = document.implementation.createDocument(
          'http://www.w3.org/2000/svg',
          'svg',
          svgDocType,
        );
        svgDoc.replaceChild(cloneNode, svgDoc.documentElement);
        const svgData = new XMLSerializer().serializeToString(svgDoc);
        dataURL = `data:image/svg+xml;charset=utf8,${encodeURIComponent(svgData)}`;
      } else {
        let imageData;
        const context = vCanvasEl.getContext('2d');
        let compositeOperation;
        if (backgroundColor) {
          const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
          imageData = context.getImageData(0, 0, vWidth * pixelRatio, vHeight * pixelRatio);
          compositeOperation = context.globalCompositeOperation;
          context.globalCompositeOperation = 'destination-over';
          context.fillStyle = backgroundColor;
          context.fillRect(0, 0, vWidth, vHeight);
        }
        dataURL = vCanvasEl.toDataURL(type);
        if (backgroundColor) {
          context.clearRect(0, 0, vWidth, vHeight);
          context.putImageData(imageData, 0, 0);
          context.globalCompositeOperation = compositeOperation;
        }
      }

      const link: HTMLAnchorElement = document.createElement('a');
      const fileName: string =
        (name || 'graph') + (renderer === 'svg' ? '.svg' : `.${type.split('/')[1]}`);

      this.dataURLToImage(dataURL, renderer, link, fileName);

      const e = document.createEvent('MouseEvents');
      e.initEvent('click', false, false);
      link.dispatchEvent(e);
    }, 16);
  }

  /**
   * 画布导出图片，图片仅包含画布可见区域部分内容
   * @param {String} name 图片的名称
   * @param {String} type 图片类型，可选值："image/png" | "image/jpeg" | "image/webp" | "image/bmp"
   * @param {string} backgroundColor 图片背景色
   */
  public downloadImage(name?: string, type?: DataUrlType, backgroundColor?: string): void {
    const self = this;

    if (self.isAnimating()) {
      self.stopAnimate();
    }

    const canvas = self.get('canvas');
    const renderer = canvas.getRenderer();
    if (!type) type = 'image/png';
    const fileName: string = (name || 'graph') + (renderer === 'svg' ? '.svg' : type.split('/')[1]);
    const link: HTMLAnchorElement = document.createElement('a');
    setTimeout(() => {
      const dataURL = self.toDataURL(type, backgroundColor);
      this.dataURLToImage(dataURL, renderer, link, fileName);

      const e = document.createEvent('MouseEvents');
      e.initEvent('click', false, false);
      link.dispatchEvent(e);
    }, 16);
  }

  private dataURLToImage(dataURL: string, renderer: string, link, fileName) {
    if (typeof window !== 'undefined') {
      if (window.Blob && window.URL && renderer !== 'svg') {
        const arr = dataURL.split(',');
        let mime = '';
        if (arr && arr.length > 0) {
          const match = arr[0].match(/:(.*?);/);
          // eslint-disable-next-line prefer-destructuring
          if (match && match.length >= 2) mime = match[1];
        }

        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);

        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }

        const blobObj = new Blob([u8arr], { type: mime });

        if (window.navigator.msSaveBlob) {
          window.navigator.msSaveBlob(blobObj, fileName);
        } else {
          link.addEventListener('click', () => {
            link.download = fileName;
            link.href = window.URL.createObjectURL(blobObj);
          });
        }
      } else {
        link.addEventListener('click', () => {
          link.download = fileName;
          link.href = dataURL;
        });
      }
    }
  }

  /**
   * 添加插件
   * @param {object} plugin 插件实例
   */
  public addPlugin(plugin: PluginBase): void {
    const self = this;
    if (plugin.destroyed) {
      return;
    }
    self.get('plugins').push(plugin);
    plugin.initPlugin(self);
  }

  /**
   * 添加插件
   * @param {object} plugin 插件实例
   */
  public removePlugin(plugin: PluginBase): void {
    const plugins = this.get('plugins');
    const index = plugins.indexOf(plugin);
    if (index >= 0) {
      plugin.destroyPlugin();
      plugins.splice(index, 1);
    }
  }

  private isMiniNative() {
      return this.get('renderer') === 'mini-native';
  }

  private isMini() {
      return this.get('renderer').startsWith('mini');
  }

  private isBrowser() {
      return this.get('renderer') === 'canvas';
  }
  
  /**
   * 设置图片水印
   * @param {string} imgURL 图片水印的url地址
   * @param {WaterMarkerConfig} config 文本水印的配置项
   * @param {any} waterCanvas 小程序canvas
   */
  public setImageWaterMarker(imgURL: string, config: WaterMarkerConfig, waterCanvas:any) {
      //水印的设置合并
      const waterMarkerConfig = deepMix({}, Global.imageWaterMarkerConfig, config)
      const { width, height, image} = waterMarkerConfig
      const { rotate, x, y, width: imgWidth, height: imgHeight} = image
      //mini
      if(this.isMini() && !this.isMiniNative()) {
        //设置属性为背景图
      }
      //mini-native
      if(this.isMiniNative()){
        //设定水印canvas的宽高
        waterCanvas.width = width ? width : this.get("width")
        waterCanvas.height = height ? height : this.get("height") 
        //获取context
        const waterCanvasContext = waterCanvas.getContext('2d')

        const { createImage } = this.get('extra')

        const img = createImage()
        img.crossOrigin = 'anonymous'
        img.src = imgURL
        img.onload = () => {
            //计算缩放比例
            const scaleX = imgWidth / img.width
            const scaleY = imgHeight / img.height

            //旋转
            waterCanvasContext.rotate(-(rotate * Math.PI) / 180)

            //循环重复绘制
            const pattern = waterCanvasContext.createPattern(img, "repeat")
            waterCanvasContext.fillStyle = pattern
            waterCanvasContext.scale(scaleX, scaleY)
            //调整位置
            waterCanvasContext.fillRect(-this.get("width") * 2, -this.get("height"), this.get("width") * 10, this.get("height") * 10)
            this.get('waterGroup').addShape('image', {
                attrs: {
                    img: waterCanvas
                }
            })
        }
      }
      //render
      if(this.isBrowser()) {
          const waterCanvas = document.createElement('canvas')
          
          //获取整个画布的宽高，以确定水印层的宽高
          waterCanvas.width = width ? width : this.get("width")
          waterCanvas.height = height ? height : this.get("height")
          const context = waterCanvas.getContext('2d')
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = imgURL
          img.onload = () => {
            //计算图片宽高的缩放比例
            const scaleX = imgWidth /img.width
            const scaleY = imgHeight /img.height

            //旋转
            context.rotate(-(rotate * Math.PI) / 180 )
            //循环重复绘制
            const pattern = context.createPattern(img, "repeat")
            context.fillStyle = pattern
            context.scale(scaleX, scaleY)
            //调整位置
            context.fillRect(-this.get("width") * 2, -this.get("height"), this.get('width') * 10, this.get("height") * 10)

            const water_img_url = waterCanvas.toDataURL()
            this.get('waterGroup').addShape('image', {
              attrs: {
                img: water_img_url
              }
            })
          }
      }
  }

  /**
   * 设置文本水印
   * @param {string[]} texts 水印的文本内容
   * @param {WaterMarkerConfig} config 文本水印的配置项
   */
  public setTextWaterMarker(texts: string[], config?: WaterMarkerConfig) {
    let container: string | HTMLElement | null = this.get('container');
    if (isString(container)) {
      container = document.getElementById(container);
    }

    if (!container.style.position) {
      container.style.position = 'relative';
    }

    let canvas = this.get('graphWaterMarker');

    const waterMarkerConfig: WaterMarkerConfig = deepMix({}, Global.textWaterMarkerConfig, config);
    const { width, height, compatible, text } = waterMarkerConfig;

    if (!canvas) {
      const canvasCfg: any = {
        container,
        width,
        height,
        capture: false,
      };
      const pixelRatio = this.get('pixelRatio');
      if (pixelRatio) {
        canvasCfg.pixelRatio = pixelRatio;
      }
      canvas = new GMobileCanvas(canvasCfg);
      this.set('graphWaterMarker', canvas);
    }
    canvas.get('el').style.display = 'none';
    const ctx = canvas.get('context');

    const { rotate, fill, fontFamily, fontSize, baseline, x, y, lineHeight } = text;
    // 旋转20度
    ctx.rotate((-rotate * Math.PI) / 180);

    // 设置文字样式
    ctx.font = `${fontSize}px ${fontFamily}`;

    // 设置文字颜色
    ctx.fillStyle = fill;

    ctx.textBaseline = baseline;

    for (let i = texts.length - 1; i >= 0; i--) {
      // 将文字绘制到画布
      ctx.fillText(texts[i], x, y + i * lineHeight);
    }

    // 恢复旋转角度
    ctx.rotate((rotate * Math.PI) / 180);

    // 默认按照现代浏览器处理
    if (!compatible) {
      let box = document.querySelector('.g6-graph-watermarker') as HTMLElement;
      if (!box) {
        box = document.createElement('div');
        box.className = 'g6-graph-watermarker';
      }
      box.style.cssText = `background-image: url(${canvas
        .get('el')
        .toDataURL(
          'image/png',
        )});background-repeat:repeat;position:absolute;top:0;bottom:0;left:0;right:0;pointer-events:none;z-index:99;`;
      container.appendChild(box);
    } else {
      // 当需要兼容不支持 pointer-events属性的浏览器时，将 compatible 设置为 true
      container.style.cssText = `background-image: url(${canvas
        .get('el')
        .toDataURL('image/png')});background-repeat:repeat;`;
    }
  }

  /**
   * 销毁画布
   */
  public destroy() {
    each(this.get('plugins'), (plugin) => {
      plugin.destroyPlugin();
    });

    // destroy tooltip doms, removed when upgrade G6 4.0
    const tooltipDOMs = this.get('tooltips');
    if (tooltipDOMs) {
      for (let i = 0; i < tooltipDOMs.length; i++) {
        const container = tooltipDOMs[i];
        if (!container) continue;
        const parent = container.parentElement;
        if (!parent) continue;
        parent.removeChild(container);
      }
    }

    this.get('eventController').destroy();
    this.get('layoutController').destroy();

    // this.get('eventController').destroy();
    // this.get('itemController').destroy();
    // this.get('modeController').destroy();
    // this.get('viewController').destroy();
    // this.get('stateController').destroy();
    // this.get('canvas').destroy();

    if (this.get('graphWaterMarker')) {
      this.get('graphWaterMarker').destroy();
    }
    if (document.querySelector('.g6-graph-watermarker')) {
      document.querySelector('.g6-graph-watermarker').remove();
    }

    super.destroy();
  }

  // 初始化所有 Group
  protected initGroups(): void {
    const canvas: GMobileCanvas = this.get('canvas');

    const group: IGroup = canvas.addGroup({
      id: 'root',
      className: Global.rootContainerClassName,
    });

    const waterGroup: IGroup = canvas.addGroup({
      id:'water',
      className: Global.waterContainerClassName
    })

    if (this.get('groupByTypes')) {
      const edgeGroup: IGroup = group.addGroup({
        id: 'edge',
        className: Global.edgeContainerClassName,
      });

      const nodeGroup: IGroup = group.addGroup({
        id: 'node',
        className: Global.nodeContainerClassName,
      });

      const comboGroup: IGroup = group.addGroup({
        id: 'combo',
        className: Global.comboContainerClassName,
      });

      // 用于存储自定义的群组
      comboGroup.toBack();

      this.set({ nodeGroup, edgeGroup, comboGroup });
    }

    const uiGroup: IGroup = canvas.addGroup({
      id: 'uiGroup',
      className: Global.uiContainerClassName,
    });

    const delegateGroup: IGroup = group.addGroup({
      id: 'delegate',
      className: Global.delegateContainerClassName,
    });
    this.set({ delegateGroup });
    this.set('group', group);
    this.set('uiGroup', uiGroup);
    this.set('waterGroup', waterGroup)
  }
}
