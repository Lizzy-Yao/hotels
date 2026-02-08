import { getHotel, submitHotel, upsertHotel } from '@/services/localHotels';
import {
  PageContainer,
  ProForm,
  ProFormDatePicker,
  ProFormDigit,
  ProFormList,
  ProFormText,
} from '@ant-design/pro-components';
import { history, useModel, useParams } from '@umijs/max';
import { Button, Card, Space, Tag, message } from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';

type Params = { id?: string };

const HotelEditPage: React.FC = () => {
  const params = useParams<Params>();
  const id = params?.id;

  const { initialState } = useModel('@@initialState');
  const owner = initialState?.currentUser?.username;

  const [loading, setLoading] = useState(false);
  const [hotelStatus, setHotelStatus] = useState<string>('draft');
  const [hotelNote, setHotelNote] = useState<string | undefined>(undefined);

  const initialValues = useMemo(() => {
    if (!id) {
      return {
        nameCn: '',
        nameEn: '',
        address: '',
        star: 5,
        openingDate: dayjs(),
        roomTypes: [{ name: '标准间', price: 399 }],
      };
    }

    const h = getHotel(id);
    if (!h) return undefined;

    return {
      nameCn: h.nameCn,
      nameEn: h.nameEn,
      address: h.address,
      star: h.star,
      openingDate: dayjs(h.openingDate),
      roomTypes: h.roomTypes,
    };
  }, [id]);

  useEffect(() => {
    if (!id) {
      setHotelStatus('draft');
      setHotelNote(undefined);
      return;
    }
    const h = getHotel(id);
    if (!h) return;
    setHotelStatus(h.status);
    setHotelNote(h.auditNote);
  }, [id]);

  useEffect(() => {
    if (!owner) {
      message.error('请先登录');
      history.push('/user/login');
      return;
    }
    if (!id) return;
    const h = getHotel(id);
    if (!h) {
      message.error('酒店不存在');
      history.push('/merchant/hotels');
      return;
    }
    if (owner && h.owner !== owner) {
      message.error('无权限');
      history.push('/merchant/hotels');
    }
  }, [id, owner]);

  const onSave = async (values: any, submitAfterSave: boolean) => {
    try {
      setLoading(true);
      const openingDate = values.openingDate?.format?.('YYYY-MM-DD') || '';
      const roomTypes = (values.roomTypes || []).map((x: any) => ({
        name: String(x?.name || '').trim(),
        price: Number(x?.price || 0),
      }));

      const saved = upsertHotel({
        id,
        owner: owner || '',
        nameCn: String(values.nameCn || '').trim(),
        nameEn: String(values.nameEn || '').trim(),
        address: String(values.address || '').trim(),
        star: Number(values.star),
        roomTypes,
        openingDate,
      });

      message.success('保存成功');

      if (submitAfterSave) {
        submitHotel({ id: saved.id, owner: owner || '' });
        message.success('已提交审核');
      }

      history.push('/merchant/hotels');
    } catch (e: any) {
      message.error(e?.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      header={{
        title: id ? '编辑酒店' : '新建酒店',
        extra: [
          <Button key="back" onClick={() => history.push('/merchant/hotels')}>
            返回
          </Button>,
        ],
      }}
    >
      <Card>
        <Space style={{ marginBottom: 12 }}>
          <Tag>{`当前状态：${hotelStatus}`}</Tag>
          {hotelNote ? (
            <Tag color="error">{`审核意见：${hotelNote}`}</Tag>
          ) : null}
        </Space>

        <ProForm
          submitter={{
            render: (_, dom) => (
              <Space>
                <Button
                  type="primary"
                  loading={loading}
                  onClick={() => _.form?.submit?.()}
                >
                  保存草稿
                </Button>
                <Button
                  loading={loading}
                  onClick={async () => {
                    const values = await _.form?.validateFields?.();
                    await onSave(values, true);
                  }}
                >
                  保存并提交审核
                </Button>
                {dom?.[1]}
              </Space>
            ),
          }}
          initialValues={initialValues}
          onFinish={async (values) => {
            await onSave(values, false);
            return true;
          }}
        >
          <ProFormText
            name="nameCn"
            label="酒店名（中文）"
            rules={[{ required: true, message: '必填' }]}
          />
          <ProFormText
            name="nameEn"
            label="酒店名（英文）"
            rules={[{ required: true, message: '必填' }]}
          />
          <ProFormText
            name="address"
            label="酒店地址"
            rules={[{ required: true, message: '必填' }]}
          />
          <ProFormDigit
            name="star"
            label="酒店星级"
            min={1}
            max={5}
            fieldProps={{ precision: 0 }}
            rules={[{ required: true, message: '必填' }]}
          />
          <ProFormDatePicker
            name="openingDate"
            label="酒店开业时间"
            rules={[{ required: true, message: '必填' }]}
          />

          <ProFormList
            name="roomTypes"
            label="酒店房型/价格"
            creatorButtonProps={{ creatorButtonText: '新增房型' }}
            min={1}
          >
            <ProFormText
              name="name"
              label="房型"
              rules={[{ required: true, message: '必填' }]}
            />
            <ProFormDigit
              name="price"
              label="价格（元）"
              min={0}
              fieldProps={{ precision: 2 }}
              rules={[{ required: true, message: '必填' }]}
            />
          </ProFormList>
        </ProForm>
      </Card>
    </PageContainer>
  );
};

export default HotelEditPage;
