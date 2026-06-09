export default defineAppConfig({
  pages: [
    'pages/search/index',
    'pages/calendar/index',
    'pages/attractions/index',
    'pages/expense/index',
    'pages/memo/index',
    'pages/attraction-detail/index',
    'pages/trip-edit/index',
    'pages/hotel-edit/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#2563eb',
    navigationBarTitleText: '旅行规划',
    navigationBarTextStyle: 'white',
    backgroundColor: '#f0f9ff'
  },
  tabBar: {
    color: '#64748b',
    selectedColor: '#2563eb',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/search/index',
        text: '搜索'
      },
      {
        pagePath: 'pages/attractions/index',
        text: '景点'
      },
      {
        pagePath: 'pages/calendar/index',
        text: '日历'
      },
      {
        pagePath: 'pages/expense/index',
        text: '费用'
      },
      {
        pagePath: 'pages/memo/index',
        text: '备忘'
      }
    ]
  }
})
