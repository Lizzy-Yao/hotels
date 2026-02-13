import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
  layout: {
    title: '酒店后台',
  },
  routes: [
    {
      path: '/',
      name: '首页',
      icon: 'HomeOutlined',
      component: './Home',
      access: 'isLoggedIn',
    },
    {
      path: '/user',
      layout: false, // 关闭 ProLayout，不显示侧边栏
      routes: [
        { path: '/user/login', component: './user/Login' },
        { path: '/user/register', component: './user/Register' },
      ],
    },

    {
      path: '/user-center',
      name: '商户中心',
      icon: 'ShopOutlined',
      access: 'canAccessMerchant',
      routes: [
        {
          path: '/user-center/hotels',
          name: '酒店信息',
          icon: 'HomeOutlined',
          component: './merchant/Hotels',
          access: 'canAccessMerchant',
        },
        {
          path: '/user-center/hotels/new',
          component: './merchant/Hotels/Edit',
          hideInMenu: true,
          access: 'canAccessMerchant',
        },
        {
          path: '/user-center/hotels/edit/:id',
          component: './merchant/Hotels/Edit',
          hideInMenu: true,
          access: 'canAccessMerchant',
        },
      ],
    },

    {
      path: '/admin',
      name: '管理后台',
      icon: 'SettingOutlined',
      access: 'canAccessAdmin',
      routes: [
        {
          path: '/admin/audits',
          name: '商户审核',
          icon: 'CheckCircleOutlined',
          component: './admin/Audits',
          access: 'canAccessAdmin',
        },
        {
          path: '/admin/hotels',
          name: '酒店管理',
          icon: 'ApartmentOutlined',
          component: './admin/Hotels',
          access: 'canAccessAdmin',
        },
      ],
    },
  ],
  npmClient: 'pnpm',
});
