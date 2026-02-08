// 运行时配置
import { getCurrentUser, logout, seedAdminUser } from '@/services/localAuth';
import type { RunTimeLayoutConfig } from '@umijs/max';
import { history } from '@umijs/max';
import { Button, Space, Typography } from 'antd';
import React from 'react';

type Role = 'merchant' | 'admin';
type CurrentUser = { username: string; role: Role };
// 全局初始化数据配置，用于 Layout 用户信息和权限初始化
// 更多信息见文档：https://umijs.org/docs/api/runtime-config#getinitialstate
export async function getInitialState(): Promise<{
  currentUser?: CurrentUser;
}> {
  seedAdminUser();
  return { currentUser: getCurrentUser() || undefined };
}

export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  return {
    rightContentRender: (_headerProps, dom) => {
      const user = initialState?.currentUser;
      if (!user) return dom;

      // NOTE: src/app.ts is not TSX; avoid JSX here.
      return React.createElement(
        Space,
        { size: 12 },
        React.createElement(
          Typography.Text,
          { type: 'secondary' },
          `${user.username}（${user.role === 'admin' ? '管理员' : '商户'}）`,
        ),
        React.createElement(
          Button,
          {
            size: 'small',
            onClick: () => {
              logout();
              setInitialState?.({ ...initialState, currentUser: undefined });
              history.push('/user/login');
            },
          },
          '退出登录',
        ),
      );
    },
    onPageChange: () => {
      const { pathname } = history.location;

      const user = initialState?.currentUser || getCurrentUser();
      const isAuthed = !!user;

      const isAuthPage =
        pathname === '/user/login' || pathname === '/user/register';
      const isProtected =
        pathname.startsWith('/merchant') || pathname.startsWith('/admin');

      if (!isAuthed && isProtected) {
        history.push('/user/login');
        return;
      }

      if (isAuthed && isAuthPage) {
        history.push(
          user!.role === 'admin' ? '/admin/audits' : '/merchant/hotels',
        );
        return;
      }

      if (isAuthed && pathname.startsWith('/admin') && user!.role !== 'admin') {
        history.push('/merchant/hotels');
        return;
      }

      if (
        isAuthed &&
        pathname.startsWith('/merchant') &&
        user!.role !== 'merchant'
      ) {
        history.push('/admin/audits');
        return;
      }

      if (isAuthed && pathname === '/') {
        history.push(
          user!.role === 'admin' ? '/admin/audits' : '/merchant/hotels',
        );
      }
    },
  };
};
