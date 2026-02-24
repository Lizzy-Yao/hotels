import { login } from '@/services/localAuth';
import { history, useModel } from '@umijs/max';
import { Button, Card, Divider, Form, Input, Typography, message } from 'antd';
import React from 'react';

const LoginPage: React.FC = () => {
  const { setInitialState } = useModel('@@initialState');

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      const currentUser = await login(values);
      await setInitialState?.((prev: any) => ({
        ...(prev || {}),
        currentUser,
      }));
      message.success('登录成功');
      history.replace('/');
    } catch (e: any) {
      message.error(e?.message || '登录失败');
    }
  };

  return (
    <div style={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
      <Card title="登录" style={{ width: 360 }}>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password />
          </Form.Item>

          <Button type="primary" htmlType="submit" block>
            登录
          </Button>

          <Button
            style={{ marginTop: 8 }}
            block
            onClick={() => history.push('/user/register')}
          >
            去注册
          </Button>
        </Form>

        <Divider />
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          登录后会根据后端返回的角色自动进入对应权限。
        </Typography.Paragraph>
      </Card>
    </div>
  );
};

export default LoginPage;
