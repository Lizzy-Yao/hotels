import { login, seedDefaultUsers } from '@/services/localAuth';
import { history, useModel } from '@umijs/max';
import {
  Button,
  Card,
  Divider,
  Form,
  Input,
  Select,
  Typography,
  message,
} from 'antd';
import React from 'react';

const LoginPage: React.FC = () => {
  const { initialState, setInitialState } = useModel('@@initialState');

  const onFinish = async (values: {
    username: string;
    password: string;
    role: 'user' | 'admin';
  }) => {
    try {
      seedDefaultUsers();
      const currentUser = login(values);
      await setInitialState?.({ ...initialState, currentUser });
      message.success('登录成功');
      history.push('/');
    } catch (e: any) {
      message.error(e?.message || '登录失败');
    }
  };

  return (
    <div style={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
      <Card title="登录" style={{ width: 360 }}>
        <Form
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ role: 'user' }}
        >
          <Form.Item
            label="登录身份"
            name="role"
            rules={[{ required: true, message: '请选择登录身份' }]}
          >
            <Select
              options={[
                { label: '用户', value: 'user' },
                { label: '管理员', value: 'admin' },
              ]}
            />
          </Form.Item>

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
          用户默认账号：user / user123
          <br />
          管理员默认账号：admin / admin123
        </Typography.Paragraph>
      </Card>
    </div>
  );
};

export default LoginPage;
