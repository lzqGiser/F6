import { 
  all_list,
  processed_treeGraphContainer as treeGraphContainer,
  processed_generalGraphContainer as generalGraphContainer,
  processed_basicElementContainer as basicElementContainer,
  processed_basicInteractiveContainer as basicInteractiveContainer,
  processed_aminationContainer as aminationContainer,
  processed_customizeTree as customizeTree,
  processed_classicCace as classicCace,
  processed_newsMapVisualize as newsMapVisualize,
} from '../../utils/index'

const basicComponentList = [
  {
    type: '树图',
    list: treeGraphContainer,
  },
  {
    type: '一般图',
    list: generalGraphContainer,
  },
  {
    type: '元素',
    list: basicElementContainer,
  },
  {
    type: '交互',
    list: basicInteractiveContainer,
  },
  {
    type: '动画',
    list: aminationContainer,
  },
  {
    type: '自定义树',
    list: customizeTree,
  },
  {
    type: '经典案例',
    list: classicCace,
  },
  {
    type: '新闻图可视化',
    list: newsMapVisualize,
  },
];

// // 这里控制拓展组件的盒子个数
// const extComponentList = [

// ];
Page({
  onShow() {
    wx.reportAnalytics('enter_home_programmatically', {})
  },
  onShareAppMessage() {
    return {
      title: '小程序官方组件展示',
      path: 'page/component/index'
    }
  },

  data: {
    all_list: basicComponentList, //展示列表
    theme: 'light' //日间夜间主题 'light', 'dark'
  },

  onLoad() {
    console.log('导入list', this.data.all_list)
    this.setData({
      theme: wx.getSystemInfoSync().theme || 'light'
    })

    if (wx.onThemeChange) {
      wx.onThemeChange(({ theme }) => {
        this.setData({ theme })
      })
    }
  },

  kindToggle(e) {
    const id = e.currentTarget.id
    const lists = this.data.all_list
    lists.forEach(component => {
      const { list } = component 
      list.forEach(obj => {
        console.log(obj.open)
        if(obj.id === id) {
          obj.open = !obj.open
        } else {
          obj.open = false
        }
      })
    })
    this.setData({
      all_list: lists
    })
  },

  testClick(e) {
    console.log(e)
  }
})
