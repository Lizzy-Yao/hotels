import { getHotel, upsertHotel, type Hotel } from '@/services/localHotels';
import {
  PageContainer,
  ProForm,
  ProFormDatePicker,
  ProFormDigit,
  ProFormList,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { history, useModel, useParams } from '@umijs/max';
import { Card, message } from 'antd';
import { useEffect, useState } from 'react';

export default function HotelEditPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const { initialState } = useModel('@@initialState');
  const [initialValues, setInitialValues] = useState<Partial<Hotel>>({});
  const [form] = ProForm.useForm();

  useEffect(() => {
    if (isEdit && id) {
      getHotel(id)
        .then((data) => {
          setInitialValues(data);
          form.setFieldsValue(data);
        })
        .catch((e: any) => {
          message.error(e?.message || '未找到该酒店');
          history.push('/user-center/hotels');
        });
    }
  }, [id, isEdit, form]);

  const handleFinish = async (values: any) => {
    try {
      await upsertHotel({
        ...values,
        id: isEdit ? id : undefined,
        owner: initialState?.currentUser?.username || '',
      });
      message.success('保存成功');
      history.push('/user-center/hotels');
    } catch (e: any) {
      message.error(e.message);
    }
  };

  return (
    <PageContainer title={isEdit ? '编辑酒店' : '新建酒店'}>
      <Card>
        <ProForm
          form={form}
          initialValues={initialValues}
          onFinish={handleFinish}
          layout="vertical"
        >
          {/* --- 必填基础信息 --- */}
          <ProForm.Group title="基础信息">
            <ProFormText
              name="nameCn"
              label="酒店名(中文)"
              placeholder="请输入中文名称"
              rules={[{ required: true }]}
              width="md"
            />
            <ProFormText
              name="nameEn"
              label="酒店名(英文)"
              placeholder="请输入英文名称"
              rules={[{ required: true }]}
              width="md"
            />
            <ProFormText
              name="address"
              label="地址"
              placeholder="请输入详细地址"
              rules={[{ required: true }]}
              width="xl"
            />
          </ProForm.Group>

          <ProForm.Group>
            <ProFormDigit
              name="starRating"
              label="星级"
              min={1}
              max={5}
              rules={[{ required: true }]}
              width="xs"
            />
            <ProFormDatePicker
              name="openDate"
              label="开业时间"
              rules={[{ required: true }]}
              width="md"
            />
          </ProForm.Group>

          {/* --- 新增：可选维度信息 --- */}
          <ProForm.Group title="周边与交通（选填）">
            <ProFormSelect
              name="nearbyAttractions"
              label="周边热门景点"
              mode="tags"
              placeholder="输入景点后回车，可输入多个"
              width="lg"
              fieldProps={{ tokenSeparators: [',', '，'] }}
            />
            <ProFormSelect
              name="nearbyMalls"
              label="周边商场"
              mode="tags"
              placeholder="输入商场后回车，可输入多个"
              width="lg"
              fieldProps={{ tokenSeparators: [',', '，'] }}
            />
            <ProFormTextArea
              name="transportation"
              label="交通信息"
              placeholder="例如：距离地铁站500米，有机场大巴直达"
              width="xl"
            />
          </ProForm.Group>

          {/* --- 新增：优惠活动 --- */}
          <ProForm.Group title="营销与优惠（选填）" style={{ width: '100%' }}>
            <ProFormList
              name="discounts"
              label="优惠活动配置"
              creatorButtonProps={{
                position: 'bottom',
                creatorButtonText: '新增优惠活动',
              }}
              itemRender={({ listDom, action }, { index }) => (
                <Card
                  bordered
                  style={{ marginBottom: 8 }}
                  size="small"
                  extra={action}
                  title={`优惠活动 ${index + 1}`}
                >
                  {listDom}
                </Card>
              )}
            >
              <ProForm.Group>
                <ProFormText
                  name="name"
                  label="活动名称"
                  placeholder="如：节日特惠"
                  rules={[{ required: true }]}
                  width="sm"
                />
                <ProFormSelect
                  name="type"
                  label="类型"
                  valueEnum={{
                    discount: '打折',
                    reduction: '满减/直减',
                  }}
                  rules={[{ required: true }]}
                  width="xs"
                />
                <ProFormDigit
                  name="value"
                  label="数值"
                  placeholder="0.8或200"
                  rules={[{ required: true }]}
                  width="xs"
                  fieldProps={{ precision: 2 }}
                />
                <ProFormText
                  name="description"
                  label="详细描述"
                  placeholder="活动规则描述"
                  width="md"
                />
              </ProForm.Group>
            </ProFormList>
          </ProForm.Group>
          {/* --------------------------- */}

          <ProForm.Group title="房型设置">
            <ProFormList
              name="roomTypes"
              label="房型列表"
              rules={[
                {
                  validator: async (_, value) => {
                    if (!value || value.length < 1) {
                      throw new Error('至少需要填写一个房型');
                    }
                  },
                },
              ]}
              creatorButtonProps={{
                creatorButtonText: '添加新房型',
              }}
            >
              <ProForm.Group>
                <ProFormText
                  name="name"
                  label="房型名称"
                  rules={[{ required: true }]}
                />
                <ProFormDigit
                  name="basePriceCents"
                  label="价格(元)"
                  rules={[{ required: true }]}
                />
              </ProForm.Group>
            </ProFormList>
          </ProForm.Group>
        </ProForm>
      </Card>
    </PageContainer>
  );
}
