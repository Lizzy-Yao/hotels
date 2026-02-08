import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: {
    title: '酒店后台',
  },
  routes: [
    {
      path: '/',
      redirect: '/user/login',
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
      path: '/merchant',
      name: '商户中心',
      icon: 'ShopOutlined',
      access: 'canAccessMerchant',
      routes: [
        {
          path: '/merchant/hotels',
          name: '酒店信息',
          icon: 'HomeOutlined',
          component: './merchant/Hotels',
          access: 'canAccessMerchant',
        },
        {
          path: '/merchant/hotels/new',
          component: './merchant/Hotels/Edit',
          hideInMenu: true,
          access: 'canAccessMerchant',
        },
        {
          path: '/merchant/hotels/edit/:id',
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
          name: '审核/发布/下线',
          icon: 'CheckCircleOutlined',
          component: './admin/Audits',
          access: 'canAccessAdmin',
        },
      ],
    },

    // 保留脚手架示例页（不走权限限制）
    { name: '首页(示例)', path: '/home', component: './Home' },
    { name: '权限演示(示例)', path: '/access', component: './Access' },
    { name: 'CRUD 示例(示例)', path: '/table', component: './Table' },
  ],
  npmClient: 'pnpm',
});
