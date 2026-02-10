import { login, registerUser } from '@/services/localAuth';
import { history, useModel } from '@umijs/max';
import { Button, Card, Form, Input, Select, message } from 'antd';
import React from 'react';

const RegisterPage: React.FC = () => {
  const { initialState, setInitialState } = useModel('@@initialState');

  const onFinish = async (values: {
    username: string;
    password: string;
    confirmPassword: string;
    role: 'MERCHANT' | 'ADMIN';
  }) => {
    try {
      if (values.password !== values.confirmPassword) {
        message.error('两次密码不一致');
        return;
      }

      await registerUser({
        username: values.username,
        password: values.password,
        role: values.role,
      });
      const currentUser = await login({
        username: values.username,
        password: values.password,
      });
      await setInitialState?.({ ...initialState, currentUser });

      message.success('注册成功');
      history.push('/');
    } catch (e: any) {
      message.error(e?.message || '注册失败');
    }
  };

  return (
    <div style={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
      <Card title="注册" style={{ width: 360 }}>
        <Form
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ role: 'MERCHANT' }}
        >
          <Form.Item
            label="注册身份"
            name="role"
            rules={[{ required: true, message: '请选择注册身份' }]}
          >
            <Select
              options={[
                { label: '商户', value: 'MERCHANT' },
                { label: '管理员', value: 'ADMIN' },
              ]}
            />
          </Form.Item>

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
