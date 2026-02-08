import { login, registerMerchant, seedAdminUser } from '@/services/localAuth';
import { history, useModel } from '@umijs/max';
import { Button, Card, Form, Input, message } from 'antd';
import React from 'react';

const RegisterPage: React.FC = () => {
  const { initialState, setInitialState } = useModel('@@initialState');

  const onFinish = async (values: {
    username: string;
    password: string;
    confirmPassword: string;
  }) => {
    try {
      if (values.password !== values.confirmPassword) {
        message.error('两次密码不一致');
        return;
      }

      seedAdminUser();
      registerMerchant({
        username: values.username,
        password: values.password,
      });
      const currentUser = login({
        username: values.username,
        password: values.password,
      });
      await setInitialState?.({ ...initialState, currentUser });

      message.success('注册成功');
      history.push('/merchant/hotels');
    } catch (e: any) {
      message.error(e?.message || '注册失败');
    }
  };

  return (
    <div style={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
      <Card title="注册（商户）" style={{ width: 360 }}>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input autoComplete="username" />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码（至少 6 位）' }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>

          <Form.Item
            label="确认密码"
            name="confirmPassword"
            rules={[{ required: true, message: '请再次输入密码' }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block>
            注册并登录
          </Button>

          <Button
            style={{ marginTop: 8 }}
            block
            onClick={() => history.push('/user/login')}
          >
            返回登录
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default RegisterPage;
