'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  Typography,
  Button,
  Form,
  Input,
  Space,
  Divider,
  Toast,
  Spin,
  Tabs,
  TabPane,
  Table,
  Tag,
  Modal
} from '@douyinfe/semi-ui';
import {
  IconSave,
  IconRefresh,
  IconLoading,
  IconSetting,
  IconCalendar,
  IconMail,
  IconLock,
  IconUpload,
  IconUser
} from '@douyinfe/semi-icons';
import { systemApi, SystemConfig, ConfigUpdateRequest, weeklyReportApi, resolveImageUrl } from '@/lib/api';
import { notifyPasswordPolicyUpdated } from '@/utils/password';

const { Title, Text } = Typography;

// 配置组映射
const CONFIG_GROUPS = {
  system: {
    title: '基本设置',
    description: '系统基本信息配置',
    icon: <IconSetting />,
    key: 'system'
  },
  auth: {
    title: '认证设置',
    description: '用户认证和安全策略配置',
    icon: <IconUser />,
    key: 'auth'
  },
  email: {
    title: '邮件设置',
    description: '邮件服务器和通知配置',
    icon: <IconMail />,
    key: 'email'
  },
  password: {
    title: '密码策略',
    description: '密码复杂度和安全策略',
    icon: <IconLock />,
    key: 'password'
  },
  upload: {
    title: '文件上传',
    description: '文件上传限制和类型配置',
    icon: <IconUpload />,
    key: 'upload'
  },
};

export default function SettingsPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [activeTab, setActiveTab] = useState('system');

  // 周报相关状态
  const [weeklyReports, setWeeklyReports] = useState<any[]>([]);
  const [weeklyReportLoading, setWeeklyReportLoading] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [weeklyReportPagination, setWeeklyReportPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0
  });

  // PDF预览相关状态
  const [pdfPreviewVisible, setPdfPreviewVisible] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState('');

  // 加载系统配置
  const loadConfigs = async () => {
    try {
      setLoading(true);
      const response = await systemApi.getConfigs();
      if (response.code === 200 && response.data) {
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

        // 特殊处理密码字段：只有在用户输入了新密码时才更新
        if (config.key === 'email.password') {
          if (newValue && newValue.trim() !== '') {
            const updateData: ConfigUpdateRequest = {
              value: newValue.trim(),
              description: config.description
            };
            return systemApi.updateConfig(config.key, updateData);
          }
          // 如果密码字段为空，跳过更新
          return null;
        }

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

      // 如果更新的是密码策略，通知相关组件刷新
      if (group === 'password') {
        notifyPasswordPolicyUpdated();
      }

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

  // 测试邮件配置
  const testEmailConfig = async () => {
    if (!testEmail) {
      Toast.error('请输入测试邮箱地址');
      return;
    }

    try {
      setTestingEmail(true);
      const response = await systemApi.testEmailConfig({ test_email: testEmail });

      if (response.code === 200) {
        Toast.success('测试邮件发送成功，请检查邮箱');
      } else {
        Toast.error(response.msg || '测试邮件发送失败');
      }
    } catch (error: any) {
      console.error('测试邮件失败:', error);
      Toast.error(error.response?.data?.msg || '测试邮件发送失败');
    } finally {
      setTestingEmail(false);
    }
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

    // 特殊处理密码字段
    if (config.key === 'email.password') {
      return (
        <Form.Input
          {...fieldProps}
          type="password"
          placeholder="请输入邮箱授权码（留空表示不修改）"
          initValue="" // 密码字段始终为空，不显示现有值
          suffix={
            <Text type="tertiary" size="small">
              {config.value === '********' ? '已设置' : '未设置'}
            </Text>
          }
        />
      );
    }

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
  const renderConfigGroup = (group: string, groupConfigs: SystemConfig[]) => {
    if (groupConfigs.length === 0) {
      return null;
    }

    return (
      <Form
        labelPosition="left"
        labelWidth="150px"
        onSubmit={(values) => saveConfigs(group, values)}
        key={`form-${group}`}
        style={{ maxWidth: '800px' }}
      >
        {groupConfigs.map(config => renderConfigField(config))}

        <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--semi-color-border)' }}>
          <Space>
            <Button
              htmlType="submit"
              theme="solid"
              type="primary"
              icon={saving ? <IconLoading /> : <IconSave />}
              loading={saving}
              disabled={saving}
            >
              保存配置
            </Button>

            {group === 'email' && (
              <Button
                type="secondary"
                icon={<IconRefresh />}
                onClick={resetConfigs}
                disabled={saving}
              >
                重置
              </Button>
            )}
            </Space>
          </div>

        {/* 邮件配置测试功能 */}
        {group === 'email' && (
          <>
            <Divider margin="32px 0" />

            {/* 配置说明 */}
            <div style={{ marginBottom: '24px' }}>
              <Title heading={5} style={{ marginBottom: '16px' }}>
                配置说明
              </Title>
              <div style={{
                background: 'var(--semi-color-fill-0)',
                padding: '20px',
                borderRadius: '8px',
                fontSize: '14px',
                lineHeight: '1.6',
                border: '1px solid var(--semi-color-border)'
              }}>
                <Text type="secondary">
                  <strong>常用邮箱配置：</strong><br/>
                  • <strong>QQ邮箱：</strong>smtp.qq.com:587，需要开启SMTP服务并使用授权码<br/>
                  • <strong>163邮箱：</strong>smtp.163.com:587，需要开启SMTP服务并使用授权码<br/>
                  • <strong>Gmail：</strong>smtp.gmail.com:587，需要使用应用专用密码<br/>
                  • <strong>企业邮箱：</strong>请联系IT管理员获取SMTP配置信息<br/><br/>
                  <strong>重要提醒：</strong><br/>
                  • 邮箱密码必须使用授权码，不是登录密码！<br/>
                  • 密码字段留空表示不修改现有密码<br/>
                  • 如果提示"用户被暂停"，请重新生成授权码<br/>
                  • 发送频率过高可能导致临时限制<br/>
                  • 建议使用企业邮箱以获得更好的稳定性
                </Text>
              </div>
            </div>

            <div style={{
              background: 'var(--semi-color-warning-light-default)',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid var(--semi-color-warning-light-active)'
            }}>
              <Title heading={5} style={{ marginBottom: '12px', color: 'var(--semi-color-warning-dark)' }}>
                邮件配置测试
              </Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                发送测试邮件以验证邮件配置是否正确
              </Text>

              <Space>
                <Input
                  placeholder="请输入测试邮箱地址"
                  value={testEmail}
                  onChange={setTestEmail}
                  style={{ width: '300px' }}
                  type="email"
                />
                <Button
                  theme="solid"
                  type="warning"
                  icon={testingEmail ? <IconLoading /> : <IconRefresh />}
                  loading={testingEmail}
                  disabled={testingEmail || !testEmail}
                  onClick={testEmailConfig}
                >
                  发送测试邮件
                </Button>
              </Space>
            </div>
          </>
        )}
      </Form>
    );
  };

  // 加载周报历史记录
  const loadWeeklyReports = async (page = 1, pageSize = 10) => {
    setWeeklyReportLoading(true);
    try {
      const response = await weeklyReportApi.getWeeklyReportHistory(page, pageSize);
      if (response.code === 200 && response.data) {
        setWeeklyReports(response.data.list);
        setWeeklyReportPagination({
          page: response.data.page,
          pageSize: response.data.pageSize,
          total: response.data.total
        });
      } else {
        Toast.error(response.msg || '加载周报历史失败');
      }
    } catch (error) {
      console.error('加载周报历史失败:', error);
      Toast.error('加载周报历史失败');
    } finally {
      setWeeklyReportLoading(false);
    }
  };

  // 预览周报
  const handlePreviewReport = async (fileName: string) => {
    try {
      // 构建后端API静态文件URL
      const pdfUrl = resolveImageUrl(`/uploads/weekly/${fileName}`);

      // 设置预览URL并打开模态框
      setPreviewPdfUrl(pdfUrl);
      setPdfPreviewVisible(true);
    } catch (error) {
      console.error('预览周报失败:', error);
      Toast.error('预览周报失败');
    }
  };

  // 关闭PDF预览
  const handleClosePdfPreview = () => {
    setPdfPreviewVisible(false);
    setPreviewPdfUrl('');
  };

  // 下载周报
  const handleDownloadReport = async (fileName: string) => {
    try {
      // 构建后端API静态文件URL
      const url = resolveImageUrl(`/uploads/weekly/${fileName}`);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('下载周报失败:', error);
      Toast.error('下载周报失败');
    }
  };

  // 手动生成周报
  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const response = await weeklyReportApi.generateWeeklyReport();
      if (response.code === 200) {
        Toast.success('周报生成并发送成功');
        // 重新加载周报列表
        loadWeeklyReports(weeklyReportPagination.page, weeklyReportPagination.pageSize);
      } else {
        Toast.error(response.msg || '生成周报失败');
      }
    } catch (error) {
      console.error('生成周报失败:', error);
      Toast.error('生成周报失败');
    } finally {
      setGeneratingReport(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  // 当切换到周报tab时加载数据
  useEffect(() => {
    if (activeTab === 'weekly-report') {
      loadWeeklyReports();
    }
  }, [activeTab]);

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

      <Card style={{ minHeight: '600px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          size="large"
        >
          {Object.entries(CONFIG_GROUPS).map(([groupKey, groupInfo]) => {
            const groupConfigs = configs.filter(config => config.group === groupKey);
            if (groupConfigs.length === 0) return null;

            return (
              <TabPane
                key={groupKey}
                tab={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {groupInfo.icon}
                    <span>{groupInfo.title}</span>
                  </div>
                }
                itemKey={groupKey}
              >
                <div style={{ padding: '20px 0' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <Title heading={4} style={{ margin: '0 0 8px 0' }}>
                      {groupInfo.title}
                    </Title>
                    <Text type="secondary">{groupInfo.description}</Text>
                  </div>
                  {renderConfigGroup(groupKey, groupConfigs)}
                </div>
              </TabPane>
            );
          })}

          {/* 周报管理Tab */}
          <TabPane tab={
            <span>
              <IconCalendar style={{ marginRight: '8px' }} />
              周报管理
            </span>
          } itemKey="weekly-report">
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                  <Title heading={4}>周报历史记录</Title>
                  <Text type="secondary">查看和管理系统自动生成的周报记录</Text>
                </div>
                <Button
                  theme="solid"
                  type="primary"
                  loading={generatingReport}
                  onClick={handleGenerateReport}
                  style={{ flexShrink: 0 }}
                >
                  {generatingReport ? '生成中...' : '立即生成周报'}
                </Button>
              </div>

              <Table
                dataSource={weeklyReports}
                loading={weeklyReportLoading}
                pagination={{
                  currentPage: weeklyReportPagination.page,
                  pageSize: weeklyReportPagination.pageSize,
                  total: weeklyReportPagination.total,
                  showSizeChanger: true,
                  pageSizeOpts: [10, 20, 50],
                  onPageChange: (page) => loadWeeklyReports(page, weeklyReportPagination.pageSize),
                  onPageSizeChange: (pageSize) => loadWeeklyReports(1, pageSize),
                }}
                columns={[
                  {
                    title: '周期',
                    dataIndex: 'week_start',
                    render: (_: string, record: any) => (
                      <div>
                        <Text strong>{record.week_start}</Text>
                        <br />
                        <Text type="secondary" size="small">至 {record.week_end}</Text>
                      </div>
                    ),
                  },
                  {
                    title: '统计数据',
                    render: (record: any) => (
                      <div>
                        <div style={{ marginBottom: '4px' }}>
                          <Text size="small">提交: {record.total_submitted} | 修复: {record.total_fixed}</Text>
                        </div>
                        <div>
                          <Text size="small" type="secondary">
                            修复中: {record.total_fixing} | 待复测: {record.total_retesting}
                          </Text>
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    render: (status: string) => {
                      const statusMap = {
                        'generated': { color: 'blue' as const, text: '已生成' },
                        'sent': { color: 'green' as const, text: '已发送' },
                        'failed': { color: 'red' as const, text: '发送失败' }
                      };
                      const statusInfo = statusMap[status as keyof typeof statusMap] || { color: 'grey' as const, text: status };
                      return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
                    },
                  },
                  {
                    title: '生成时间',
                    dataIndex: 'created_at',
                    render: (text: string) => new Date(text).toLocaleString('zh-CN'),
                  },
                  {
                    title: '发送时间',
                    dataIndex: 'sent_at',
                    render: (text: string | null) => text ? new Date(text).toLocaleString('zh-CN') : '-',
                  },
                  {
                    title: '文件大小',
                    dataIndex: 'file_size',
                    render: (size: number) => {
                      if (size < 1024) return `${size} B`;
                      if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
                      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
                    },
                  },
                  {
                    title: '操作',
                    render: (record: any) => (
                      <Space>
                        <Button
                          theme="borderless"
                          type="primary"
                          size="small"
                          onClick={() => handlePreviewReport(record.file_name)}
                        >
                          预览
                        </Button>
                        <Button
                          theme="borderless"
                          type="secondary"
                          size="small"
                          onClick={() => handleDownloadReport(record.file_name)}
                        >
                          下载
                        </Button>
                      </Space>
                    ),
                  },
                ]}
              />
            </div>
          </TabPane>
        </Tabs>
      </Card>

      {/* PDF预览模态框 */}
      <Modal
        title="周报预览"
        visible={pdfPreviewVisible}
        onCancel={handleClosePdfPreview}
        footer={null}
        width="90%"
        style={{ top: 20 }}
        bodyStyle={{ height: '80vh', padding: 0 }}
      >
        {previewPdfUrl && (
          <iframe
            src={previewPdfUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            title="PDF预览"
          />
        )}
      </Modal>
    </div>
  );
}