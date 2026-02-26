import { PageContainer } from '@ant-design/pro-components';
import {
  ApartmentOutlined,
  AuditOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Card, Col, Row, Space, Tag, Typography } from 'antd';
import styles from './index.less';

const { Title, Paragraph, Text } = Typography;

/**
 * 首页（纯展示版）
 * 说明：
 * 1. 不再根据角色做分支判断
 * 2. 不再提供功能跳转按钮
 * 3. 仅展示欢迎信息与平台能力说明
 */
const HomePage: React.FC = () => {
  /**
   * 首页展示的能力模块（纯静态展示）
   * 可根据实际业务继续扩展
   */
  const featureCards = [
    {
      key: 'hotel',
      title: '酒店信息管理',
      icon: <ApartmentOutlined className={styles.featureIcon} />,
      desc: '统一维护酒店基础信息、地址信息、房型配置与展示内容，提升录入效率与数据一致性。',
      tags: ['酒店档案', '房型信息', '数据规范'],
    },
    {
      key: 'audit',
      title: '审核流程管理',
      icon: <AuditOutlined className={styles.featureIcon} />,
      desc: '支持提交、审核、驳回、复审等流程状态管理，帮助管理员高效处理酒店资料审核任务。',
      tags: ['提交审核', '驳回意见', '流程追踪'],
    },
    {
      key: 'publish',
      title: '发布与上下线',
      icon: <ThunderboltOutlined className={styles.featureIcon} />,
      desc: '统一管理酒店的发布、下线与恢复状态，确保平台展示信息准确、可控、可追溯。',
      tags: ['发布管理', '下线控制', '状态切换'],
    },
    {
      key: 'security',
      title: '平台规范与可控性',
      icon: <SafetyCertificateOutlined className={styles.featureIcon} />,
      desc: '通过统一规则与权限边界，提升管理效率，降低误操作风险，保障平台数据稳定运行。',
      tags: ['权限控制', '规范流程', '稳定运营'],
    },
  ];

  return (
    <PageContainer
      header={{
        title: '首页',
        subTitle: '欢迎使用酒店管理平台',
      }}
    >
      <div className={styles.container}>
        {/* 顶部欢迎区域 */}
        <Card className={styles.heroCard} bordered={false}>
          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>HOTEL MANAGEMENT PLATFORM</div>

            <Title level={2} className={styles.heroTitle}>
              欢迎使用酒店管理平台
            </Title>

            <Paragraph className={styles.heroDesc}>
              本平台用于酒店信息的统一维护、审核流转与发布管理，让酒店数据管理更加规范、清晰、可控。
            </Paragraph>

            <Space wrap size={[8, 8]}>
              <Tag color="blue">信息维护</Tag>
              <Tag color="processing">审核流转</Tag>
              <Tag color="gold">发布管理</Tag>
            </Space>
          </div>
        </Card>

        <div className={styles.sectionHeader}>
          <Title level={4} className={styles.sectionTitle}>
            平台功能
          </Title>

        </div>

        <Row gutter={[16, 16]}>
          {featureCards.map((item) => (
            <Col xs={24} md={12} key={item.key}>
              <Card className={styles.featureCard} bordered={false}>
                <div className={styles.featureHeader}>
                  {item.icon}
                  <Title level={5} className={styles.featureTitle}>
                    {item.title}
                  </Title>
                </div>

                <Paragraph className={styles.featureDesc}>
                  {item.desc}
                </Paragraph>

                <Space wrap size={[8, 8]}>
                  {item.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </PageContainer>
  );
};

export default HomePage;