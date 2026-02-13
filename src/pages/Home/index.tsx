import { PageContainer } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import { Button, Card, Col, Row, Typography } from 'antd';
import styles from './index.less';

const HomePage: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;

  const menuItems =
    currentUser?.role === 'ADMIN'
      ? [
          {
            title: '审核',
            desc: '审核用户提交的酒店信息，并进行发布、下线管理。',
            path: '/admin/audits',
            actionText: '进入审核页',
          },
          {
            title: '酒店管理',
            desc: '管理员酒店管理页（当前为占位页）。',
            path: '/admin/hotels',
            actionText: '进入管理页',
          },
        ]
      : [
          {
            title: '酒店信息',
            desc: '查看和维护商户自己的酒店信息，支持提交审核。',
            path: '/user-center/hotels',
            actionText: '进入酒店列表',
          },
          {
            title: '新建酒店',
            desc: '快速创建酒店信息并提交管理员审核。',
            path: '/user-center/hotels/new',
            actionText: '立即新建',
          },
        ];

  return (
    <PageContainer
      header={{
        title: '首页',
        subTitle: currentUser
          ? `当前身份：${currentUser.role === 'ADMIN' ? '管理员' : '商户'}`
          : undefined,
      }}
    >
      <div className={styles.container}>
        <Row gutter={[16, 16]}>
          {menuItems.map((item) => (
            <Col xs={24} md={12} key={item.path}>
              <Card title={item.title} className={styles.card}>
                <Typography.Paragraph type="secondary">
                  {item.desc}
                </Typography.Paragraph>
                <Button type="primary" onClick={() => history.push(item.path)}>
                  {item.actionText}
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </PageContainer>
  );
};

export default HomePage;
