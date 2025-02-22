import { clone } from '@antv/util';
import { IG6GraphEvent, ShapeStyle, IAbstractGraph as IGraph, Util } from '@antv/f6-core';
import Base from '../base';

const { distance } = Util;

const DELTA = 0.05;

interface EdgeFilterLensConfig {
  trigger?: 'tab' | 'drag';
  r?: number;
  delegateStyle?: ShapeStyle;
  showLabel?: 'node' | 'edge' | 'both' | undefined;
  maxR?: number;
  minR?: number;
  type?: 'one' | 'both' | 'only-source' | 'only-target';
  shouldShow?: (d?: unknown) => boolean;
}

const lensDelegateStyle = {
  stroke: '#000',
  strokeOpacity: 0.8,
  lineWidth: 2,
  fillOpacity: 1,
  fill: '#fff',
};
export default class EdgeFilterLens extends Base {
  isUp = true;
  scaleTimer = null;
  constructor(config?: EdgeFilterLensConfig) {
    super(config);
  }

  public getDefaultCfgs(): EdgeFilterLensConfig {
    return {
      type: 'both',
      trigger: 'drag',
      r: 60,
      delegateStyle: clone(lensDelegateStyle),
      showLabel: 'edge',
    };
  }

  // class-methods-use-this
  public getEvents() {
    let events;
    switch ((this as any).get('trigger')) {
      case 'click':
        events = {
          tap: 'filter',
        };
        break;
      case 'drag':
        events = {
          drag: 'createDelegate',
        };
        break;
      default:
        events = {
          mousemove: 'filter',
        };
        break;
    }
    return events;
  }

  public init() {
    const self = this;
    const showLabel = self.get('showLabel');
    const showNodeLabel = showLabel === 'node' || showLabel === 'both';
    const showEdgeLabel = showLabel === 'edge' || showLabel === 'both';
    self.set('showNodeLabel', showNodeLabel);
    self.set('showEdgeLabel', showEdgeLabel);
    const shouldShow = self.get('shouldShow');
    if (!shouldShow) self.set('shouldShow', () => true);
  }

  // Create the delegate when the trigger is drag
  protected createDelegate(e: IG6GraphEvent) {
    const self = this;
    let lensDelegate = self.get('delegate');
    if (!lensDelegate || lensDelegate.destroyed) {
      const graph = this.get('graph');
      const pos = graph.getPointByClient(e.x, e.y);
      self.filter(pos);
      lensDelegate = self.get('delegate');

      // drag to move the lens
      lensDelegate.on('dragstart', (evt) => {});
      lensDelegate.on('drag', (e) => {
        const pos = graph.getPointByClient(e.x, e.y);
        self.filter(pos);
      });
    }
  }

  /**
   * Scale the range by wheel
   * @param e mouse wheel event
   */
  protected scaleRByWheel(e: IG6GraphEvent, isUp: boolean) {
    const self = this;
    if (!e) return;
    if (e.preventDefault) e.preventDefault();
    const graph: IGraph = self.get('graph');
    let ratio;
    const lensDelegate = self.get('delegate');
    const lensCenter = lensDelegate
      ? {
          x: lensDelegate.attr('x'),
          y: lensDelegate.attr('y'),
        }
      : undefined;
    const mousePos = lensCenter || graph.getPointByClient(e.clientX, e.clientY);
    if (isUp) {
      ratio = 1 / (1 - DELTA);
    } else {
      ratio = 1 - DELTA;
    }
    const maxR = self.get('maxR');
    const minR = self.get('minR');
    let r = self.get('r');
    if (
      (r > (maxR || graph.get('height')) && ratio > 1) ||
      (r < (minR || graph.get('height') * 0.05) && ratio < 1)
    ) {
      ratio = 1;
    }
    r *= ratio;
    self.set('r', r);
    self.filter(e);
  }

  /**
   * Response function for mousemove, click, or drag to filter out the edges
   * @param e mouse event
   */
  protected filter({ x, y }) {
    const self = this;
    const graph = self.get('graph');
    const nodes = graph.getNodes();
    const hitNodesMap = {};
    const r = self.get('r');
    const type = self.get('type');
    const fCenter = { x, y };
    self.updateDelegate(fCenter, r);
    const shouldShow = self.get('shouldShow');

    let vShapes = self.get('vShapes');
    if (vShapes) {
      vShapes.forEach((shape) => {
        shape.remove();
        shape.destroy();
      });
    }
    vShapes = [];

    nodes.forEach((node) => {
      const model = node.getModel();
      const { x, y } = model;
      if (distance({ x, y }, fCenter) < r) {
        hitNodesMap[model.id] = node;
      }
    });
    const edges = graph.getEdges();
    const hitEdges = [];
    edges.forEach((edge) => {
      const model = edge.getModel();
      const sourceId = model.source;
      const targetId = model.target;
      if (shouldShow(model)) {
        if (type === 'only-source' || type === 'one') {
          if (hitNodesMap[sourceId] && !hitNodesMap[targetId]) hitEdges.push(edge);
        } else if (type === 'only-target' || type === 'one') {
          if (hitNodesMap[targetId] && !hitNodesMap[sourceId]) hitEdges.push(edge);
        } else if (type === 'both' && hitNodesMap[sourceId] && hitNodesMap[targetId]) {
          hitEdges.push(edge);
        }
      }
    });

    const showNodeLabel = self.get('showNodeLabel');
    const showEdgeLabel = self.get('showEdgelabel');

    // copy the shapes in hitEdges
    const group = graph.get('group');
    hitEdges.forEach((edge) => {
      const shapes = edge.get('group').get('children');
      shapes.forEach((shape) => {
        const shapeType = shape.get('type');
        const vShape = group.addShape(shapeType, {
          attrs: shape.attr(),
        });
        vShapes.push(vShape);
        if (showNodeLabel && shapeType === 'text') {
          vShape.set('visible', true);
        }
      });
    });
    // copy the shape sof hitNodes
    Object.keys(hitNodesMap).forEach((key) => {
      const node = hitNodesMap[key];
      const clonedGroup = node.get('group').clone();
      group.add(clonedGroup);
      vShapes.push(clonedGroup);
      if (showEdgeLabel) {
        const shapes = clonedGroup.get('children');
        for (let j = 0; j < shapes.length; j++) {
          const shape = shapes[j];
          if (shape.get('type') === 'text') {
            shape.set('visible', true);
          }
        }
      }
    });

    self.set('vShapes', vShapes);
  }

  /**
   * Adjust part of the parameters, including trigger, type, r, maxR, minR, shouldShow, showLabel, and scaleRBy
   * @param {EdgeFilterLensConfig} cfg
   */
  public updateParams(cfg: EdgeFilterLensConfig) {
    const self = this;
    const { r, trigger, minR, maxR, showLabel, shouldShow } = cfg;
    if (!isNaN(cfg.r)) {
      self.set('r', r);
    }
    if (!isNaN(maxR)) {
      self.set('maxR', maxR);
    }
    if (!isNaN(minR)) {
      self.set('minR', minR);
    }
    if (trigger === 'tab') {
      self.set('trigger', trigger);
    }

    if (showLabel === 'node' || showLabel === 'both') {
      self.set('showNodeLabel', true);
    }
    if (showLabel === 'edge' || showLabel === 'both') {
      self.set('showEdgeLabel', true);
    }
    if (shouldShow) {
      self.set('shouldShow', shouldShow);
    }
  }

  /**
   * Update the delegate shape of the lens
   * @param {Point} mCenter the center of the shape
   * @param {number} r the radius of the shape
   */
  private updateDelegate(mCenter, r) {
    const self = this;
    const graph = self.get('graph');
    let lensDelegate = self.get('delegate');
    if (!lensDelegate || lensDelegate.destroyed) {
      // 拖动多个
      const parent = graph.get('group');
      const attrs = self.get('delegateStyle') || lensDelegateStyle;

      // model上的x, y是相对于图形中心的，delegateShape是g实例，x,y是绝对坐标
      lensDelegate = parent.addShape('circle', {
        attrs: {
          r,
          x: mCenter.x,
          y: mCenter.y,
          ...attrs,
        },
        name: 'lens-shape',
        draggable: true,
      });
    } else {
      lensDelegate.attr({
        x: mCenter.x,
        y: mCenter.y,
        r,
      });
    }

    self.set('delegate', lensDelegate);
  }

  /**
   * Clear the filtering
   */
  public clear() {
    const self = this;
    let vShapes = self.get('vShapes');
    if (vShapes) {
      vShapes.forEach((shape) => {
        shape.remove();
        shape.destroy();
      });
    }
    vShapes = [];
    self.set('vShapes', vShapes);
    const lensDelegate = self.get('delegate');
    if (lensDelegate && !lensDelegate.destroyed) {
      lensDelegate.remove();
      lensDelegate.destroy();
    }
  }

  /**
   * Destroy the component
   */
  public destroy() {
    this.clear();
  }
}
