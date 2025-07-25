'use client';

import { useEffect, useState } from 'react';
import { 
  Card, 
  Typography, 
  Button, 
  Form, 
  Switch, 
  Input, 
  Select, 
  Space, 
  Divider, 
  Toast, 
  Spin,
  InputNumber,
  TextArea
} from '@douyinfe/semi-ui';
import { IconSave, IconRefresh, IconLoading } from '@douyinfe/semi-icons';
import { systemApi, SystemConfig, ConfigUpdateRequest } from '@/lib/api';

const { Title, Text } = Typography;
const { Option } = Select;

// 配置组映射
const CONFIG_GROUPS = {
  system: { title: '基本设置', description: '系统基本信息配置' },
  auth: { title: '认证设置', description: '用户认证和安全策略配置' },
  email: { title: '邮件设置', description: '邮件服务器和通知配置' },
  password: { title: '密码策略', description: '密码复杂度和安全策略' },
  upload: { title: '文件上传', description: '文件上传限制和类型配置' },
};

export default function SettingsPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forms, setForms] = useState<{ [key: string]: any }>({});

  // 加载系统配置
  const loadConfigs = async () => {
    try {
      setLoading(true);
      const response = await systemApi.getConfigs();
      if (response.code === 200) {
        setConfigs(response.data);
        // 初始化表单数据
        const formData: { [key: string]: any } = {};
        Object.keys(CONFIG_GROUPS).forEach(group => {
          formData[group] = {};
        });
        
        response.data.forEach(config => {
          if (formData[config.group]) {
            formData[config.group][config.key] = convertConfigValue(config.value, config.type);
          }
        });
        
        setForms(formData);
      } else {
        Toast.error(response.msg || '加载配置失败');
      }
    } catch (error: any) {
      console.error('加载配置失败:', error);
      Toast.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 转换配置值类型
  const convertConfigValue = (value: string, type: string): any => {
    switch (type) {
      case 'bool':
        return value === 'true';
      case 'int':
        return parseInt(value) || 0;
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  };

  // 转换表单值为字符串
  const convertFormValue = (value: any, type: string): string => {
    switch (type) {
      case 'bool':
        return value ? 'true' : 'false';
      case 'int':
        return value.toString();
      case 'json':
        return typeof value === 'string' ? value : JSON.stringify(value);
      default:
        return value.toString();
    }
  };

  // 保存配置
  const saveConfigs = async (group: string, values: any) => {
    try {
      setSaving(true);
      
      // 获取该组的配置项
      const groupConfigs = configs.filter(config => config.group === group);
      
      // 批量更新配置
      const updatePromises = groupConfigs.map(async (config) => {
        // 使用转换后的字段名获取值
        const fieldName = config.key.replace(/\./g, '_');
        const newValue = values[fieldName];
        
        
        if (newValue !== undefined) {
          const stringValue = convertFormValue(newValue, config.type);
          const updateData: ConfigUpdateRequest = {
            value: stringValue,
            description: config.description
          };
          
          return systemApi.updateConfig(config.key, updateData);
        }
      });

      await Promise.all(updatePromises.filter(Boolean));
      
      Toast.success('配置保存成功');
      
      // 重新加载配置
      await loadConfigs();
      
    } catch (error: any) {
      console.error('保存配置失败:', error);
      Toast.error(error?.response?.data?.msg || '保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  // 重置配置
  const resetConfigs = () => {
    loadConfigs();
    Toast.info('配置已重置');
  };

  // 渲染配置字段
  const renderConfigField = (config: SystemConfig) => {
    // 将带点的key转换为下划线，避免Semi Design表单处理问题
    const fieldKey = config.key.replace(/\./g, '_');
    const fieldProps = {
      field: fieldKey,
      label: config.description || config.key,
      key: fieldKey,
    };

    switch (config.type) {
      case 'bool':
        return (
          <Form.Switch
            {...fieldProps}
            initValue={convertConfigValue(config.value, config.type)}
          />
        );
      
      case 'int':
        return (
          <Form.InputNumber
            {...fieldProps}
            initValue={convertConfigValue(config.value, config.type)}
            min={0}
            style={{ width: '200px' }}
          />
        );
      
      case 'text':
        return (
          <Form.TextArea
            {...fieldProps}
            initValue={convertConfigValue(config.value, config.type)}
            maxCount={500}
            autosize
          />
        );
      
      default:
        return (
          <Form.Input
            {...fieldProps}
            initValue={convertConfigValue(config.value, config.type)}
            placeholder={`请输入${config.description || config.key}`}
          />
        );
    }
  };

  // 渲染配置组
  const renderConfigGroup = (group: string, groupInfo: any) => {
    const groupConfigs = configs.filter(config => config.group === group);
    
    if (groupConfigs.length === 0) {
      return null;
    }

    return (
      <Card key={group} title={groupInfo.title}>
        <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
          {groupInfo.description}
        </Text>
        
        <Form
          labelPosition="left"
          labelWidth="150px"
          onSubmit={(values) => saveConfigs(group, values)}
          key={`form-${group}`}
        >
          {groupConfigs.map(config => renderConfigField(config))}
          
          <div style={{ marginTop: '24px' }}>
            <Space>
              <Button 
                htmlType="submit"
                theme="solid" 
                type="primary" 
                icon={saving ? <IconLoading /> : <IconSave />}
                loading={saving}
                disabled={saving}
              >
                保存{groupInfo.title}
              </Button>
            </Space>
          </div>
        </Form>
      </Card>
    );
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        padding: '24px', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title heading={3} style={{ margin: 0 }}>系统设置</Title>
        <Text type="secondary">配置系统参数和安全策略</Text>
        
        <div style={{ marginTop: '16px' }}>
          <Space>
            <Button 
              icon={<IconRefresh />}
              onClick={resetConfigs}
              disabled={saving}
            >
              重新加载配置
            </Button>
          </Space>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '24px' }}>
        {Object.entries(CONFIG_GROUPS).map(([group, groupInfo]) =>
          renderConfigGroup(group, groupInfo)
        )}
      </div>
    </div>
  );
} 