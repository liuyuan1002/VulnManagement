'use client';

import { useEffect, useState } from 'react';
import { Card, Typography, Button, Space, Table, Badge, Progress, List, Avatar } from '@douyinfe/semi-ui';
import { IconUser, IconCalendar, IconAt, IconArrowUp, IconSafe, IconBolt } from '@douyinfe/semi-icons';
import { authApi, authUtils, DashboardData, EngineerRankingItem, VulnListItem } from '@/lib/api';

const { Title, Text } = Typography;

interface User {
  id: number;
  username: string;
  email: string;
  real_name: string;
  phone: string;
  department: string;
  status: number;
  last_login_at: string;
  role_id: number;
}

export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查是否登录
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token) {
      // 未登录，跳转到登录页
      window.location.href = '/login';
      return;
    }

    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }

    setIsAuthenticated(true);
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await authApi.getDashboardData();
      if (response.code === 200 && response.data) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 正在验证登录状态
  if (isAuthenticated === null) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: 'var(--semi-color-text-1)'
      }}>
        正在验证登录状态...
      </div>
    );
  }

  // 未登录，显示跳转信息
  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: 'var(--semi-color-text-1)'
      }}>
        正在跳转到登录页...
      </div>
    );
  }

  // 获取角色显示名称
  const getRoleDisplayName = (roleId: number): string => {
    switch (roleId) {
      case 1:
        return '超级管理员';
      case 2:
        return '安全工程师';
      case 3:
        return '研发工程师';
      case 4:
        return '普通用户';
      default:
        return '未知角色';
    }
  };

  // 获取严重程度颜色
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return 'red';
      case 'high':
        return 'orange';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'blue';
      case 'info':
        return 'gray';
      default:
        return 'gray';
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'unfixed':
        return 'red';
      case 'fixing':
        return 'orange';
      case 'fixed':
        return 'green';
      case 'retesting':
        return 'blue';
      case 'completed':
        return 'green';
      case 'ignored':
        return 'gray';
      default:
        return 'gray';
    }
  };

  // 获取状态显示名称
  const getStatusDisplayName = (status: string): string => {
    switch (status) {
      case 'unfixed':
        return '未修复';
      case 'fixing':
        return '修复中';
      case 'fixed':
        return '已修复';
      case 'retesting':
        return '复测中';
      case 'completed':
        return '已完成';
      case 'ignored':
        return '已忽略';
      default:
        return status;
    }
  };

  // 统计卡片组件
  const StatCard = ({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) => (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {icon}
        <div>
          <Text type="secondary" size="small">{title}</Text>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>
            {value}
          </div>
        </div>
      </div>
    </Card>
  );

  // 渲染超级管理员仪表板
  const renderSuperAdminDashboard = () => {
    if (!dashboardData) return null;

    return (
      <div style={{ display: 'grid', gap: '24px' }}>
        {/* 统计卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <StatCard
            title="总漏洞数"
            value={dashboardData.total_vulns}
            icon={<IconBolt style={{ color: 'var(--semi-color-danger)', fontSize: '24px' }} />}
          />
          <StatCard
            title="总项目数"
            value={dashboardData.total_projects}
            icon={<IconSafe style={{ color: 'var(--semi-color-primary)', fontSize: '24px' }} />}
          />
          <StatCard
            title="即将到期漏洞"
            value={dashboardData.due_soon_vulns}
            icon={<IconAt style={{ color: 'var(--semi-color-warning)', fontSize: '24px' }} />}
          />
        </div>

        {/* 排行榜 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <Card title="安全工程师排行榜（当月提交漏洞数）" headerStyle={{ padding: '16px 24px' }}>
            <List
              dataSource={dashboardData.security_engineer_ranking || []}
              renderItem={(item: EngineerRankingItem, index: number) => (
                <List.Item
                  main={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Avatar size="small" style={{ backgroundColor: index < 3 ? 'var(--semi-color-warning)' : 'var(--semi-color-fill-1)' }}>
                        {index + 1}
                      </Avatar>
                      <div>
                        <Text strong>{item.real_name}</Text>
                        <br />
                        <Text type="secondary" size="small">{item.username}</Text>
                      </div>
                    </div>
                  }
                  extra={<Badge count={item.count} />}
                />
              )}
            />
          </Card>

          <Card title="研发工程师排行榜（当月修复完成漏洞数）" headerStyle={{ padding: '16px 24px' }}>
            <List
              dataSource={dashboardData.dev_engineer_ranking || []}
              renderItem={(item: EngineerRankingItem, index: number) => (
                <List.Item
                  main={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Avatar size="small" style={{ backgroundColor: index < 3 ? 'var(--semi-color-success)' : 'var(--semi-color-fill-1)' }}>
                        {index + 1}
                      </Avatar>
                      <div>
                        <Text strong>{item.real_name}</Text>
                        <br />
                        <Text type="secondary" size="small">{item.username}</Text>
                      </div>
                    </div>
                  }
                  extra={<Badge count={item.count} />}
                />
              )}
            />
          </Card>
        </div>

        {/* 最新漏洞列表 */}
        <Card title="最新漏洞" headerStyle={{ padding: '16px 24px' }}>
          <Table
            columns={[
              {
                title: '漏洞标题',
                dataIndex: 'title',
                key: 'title',
                render: (text: string) => <Text strong>{text}</Text>
              },
              {
                title: '严重程度',
                dataIndex: 'severity',
                key: 'severity',
                render: (severity: string) => (
                  <Badge dot type={getSeverityColor(severity) as any}>
                    {severity}
                  </Badge>
                )
              },
              {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                render: (status: string) => (
                  <Badge dot type={getStatusColor(status) as any}>
                    {getStatusDisplayName(status)}
                  </Badge>
                )
              },
              {
                title: '项目',
                dataIndex: 'project_name',
                key: 'project_name'
              },
              {
                title: '报告人',
                dataIndex: 'reporter_name',
                key: 'reporter_name'
              },
              {
                title: '提交时间',
                dataIndex: 'submitted_at',
                key: 'submitted_at',
                render: (time: string) => new Date(time).toLocaleDateString('zh-CN')
              }
            ]}
            dataSource={dashboardData.latest_vulns}
            pagination={false}
            size="small"
          />
        </Card>
      </div>
    );
  };

  // 渲染安全工程师仪表板
  const renderSecurityEngineerDashboard = () => {
    if (!dashboardData || !dashboardData.current_user_vulns) return null;

    const userStats = dashboardData.current_user_vulns;
    const statusEntries = Object.entries(userStats.status_stats);

    return (
      <div style={{ display: 'grid', gap: '24px' }}>
        {/* 个人统计卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <StatCard
            title="当月提交漏洞数"
            value={userStats.total_count}
            icon={<IconArrowUp style={{ color: 'var(--semi-color-primary)', fontSize: '24px' }} />}
          />
          <StatCard
            title="即将到期漏洞"
            value={userStats.due_soon_count}
            icon={<IconAt style={{ color: 'var(--semi-color-warning)', fontSize: '24px' }} />}
          />
        </div>

        {/* 漏洞状态统计 */}
        <Card title="我的漏洞状态分布" headerStyle={{ padding: '16px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px' }}>
            {statusEntries.map(([status, count]) => (
              <div key={status} style={{ textAlign: 'center' }}>
                <Badge dot type={getStatusColor(status) as any}>
                  <Text strong>{getStatusDisplayName(status)}</Text>
                </Badge>
                <div style={{ marginTop: '8px', fontSize: '20px', fontWeight: 'bold' }}>
                  {count}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 安全工程师排行榜 */}
        <Card title="安全工程师排行榜（当月提交漏洞数）" headerStyle={{ padding: '16px 24px' }}>
          <List
            dataSource={dashboardData.security_engineer_ranking || []}
            renderItem={(item: EngineerRankingItem, index: number) => (
              <List.Item
                main={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Avatar size="small" style={{ backgroundColor: index < 3 ? 'var(--semi-color-warning)' : 'var(--semi-color-fill-1)' }}>
                      {index + 1}
                    </Avatar>
                    <div>
                      <Text strong>{item.real_name}</Text>
                      <br />
                      <Text type="secondary" size="small">{item.username}</Text>
                    </div>
                  </div>
                }
                extra={<Badge count={item.count} />}
              />
            )}
          />
        </Card>

        {/* 项目最新漏洞 */}
        <Card title="项目最新漏洞" headerStyle={{ padding: '16px 24px' }}>
          <Table
            columns={[
              {
                title: '漏洞标题',
                dataIndex: 'title',
                key: 'title',
                render: (text: string) => <Text strong>{text}</Text>
              },
              {
                title: '严重程度',
                dataIndex: 'severity',
                key: 'severity',
                render: (severity: string) => (
                  <Badge dot type={getSeverityColor(severity) as any}>
                    {severity}
                  </Badge>
                )
              },
              {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                render: (status: string) => (
                  <Badge dot type={getStatusColor(status) as any}>
                    {getStatusDisplayName(status)}
                  </Badge>
                )
              },
              {
                title: '项目',
                dataIndex: 'project_name',
                key: 'project_name'
              },
              {
                title: '提交时间',
                dataIndex: 'submitted_at',
                key: 'submitted_at',
                render: (time: string) => new Date(time).toLocaleDateString('zh-CN')
              }
            ]}
            dataSource={dashboardData.latest_vulns}
            pagination={false}
            size="small"
          />
        </Card>
      </div>
    );
  };

  // 渲染研发工程师仪表板
  const renderDevEngineerDashboard = () => {
    if (!dashboardData || !dashboardData.current_user_vulns) return null;

    const userStats = dashboardData.current_user_vulns;
    const statusEntries = Object.entries(userStats.status_stats);

  return (
      <div style={{ display: 'grid', gap: '24px' }}>
        {/* 个人统计卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <StatCard
            title="分配给我的漏洞数"
            value={userStats.total_count}
            icon={<IconBolt style={{ color: 'var(--semi-color-primary)', fontSize: '24px' }} />}
          />
          <StatCard
            title="即将到期漏洞"
            value={userStats.due_soon_count}
            icon={<IconAt style={{ color: 'var(--semi-color-warning)', fontSize: '24px' }} />}
          />
        </div>

        {/* 漏洞状态统计 */}
        <Card title="我的漏洞状态分布" headerStyle={{ padding: '16px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px' }}>
            {statusEntries.map(([status, count]) => (
              <div key={status} style={{ textAlign: 'center' }}>
                <Badge dot type={getStatusColor(status) as any}>
                  <Text strong>{getStatusDisplayName(status)}</Text>
                </Badge>
                <div style={{ marginTop: '8px', fontSize: '20px', fontWeight: 'bold' }}>
                  {count}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 研发工程师排行榜 */}
        <Card title="研发工程师排行榜（当月修复完成漏洞数）" headerStyle={{ padding: '16px 24px' }}>
          <List
            dataSource={dashboardData.dev_engineer_ranking || []}
            renderItem={(item: EngineerRankingItem, index: number) => (
              <List.Item
                main={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Avatar size="small" style={{ backgroundColor: index < 3 ? 'var(--semi-color-success)' : 'var(--semi-color-fill-1)' }}>
                      {index + 1}
                    </Avatar>
                    <div>
                      <Text strong>{item.real_name}</Text>
                      <br />
                      <Text type="secondary" size="small">{item.username}</Text>
                    </div>
                  </div>
                }
                extra={<Badge count={item.count} />}
              />
            )}
          />
        </Card>

        {/* 项目最新漏洞 */}
        <Card title="项目最新漏洞" headerStyle={{ padding: '16px 24px' }}>
          <Table
            columns={[
              {
                title: '漏洞标题',
                dataIndex: 'title',
                key: 'title',
                render: (text: string) => <Text strong>{text}</Text>
              },
              {
                title: '严重程度',
                dataIndex: 'severity',
                key: 'severity',
                render: (severity: string) => (
                  <Badge dot type={getSeverityColor(severity) as any}>
                    {severity}
                  </Badge>
                )
              },
              {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                render: (status: string) => (
                  <Badge dot type={getStatusColor(status) as any}>
                    {getStatusDisplayName(status)}
                  </Badge>
                )
              },
              {
                title: '项目',
                dataIndex: 'project_name',
                key: 'project_name'
              },
              {
                title: '提交时间',
                dataIndex: 'submitted_at',
                key: 'submitted_at',
                render: (time: string) => new Date(time).toLocaleDateString('zh-CN')
              }
            ]}
            dataSource={dashboardData.latest_vulns}
            pagination={false}
            size="small"
          />
        </Card>
      </div>
    );
  };

  // 渲染默认仪表板（普通用户）
  const renderDefaultDashboard = () => {
    return (
      <Card
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          textAlign: 'center'
        }}
        bodyStyle={{
          padding: '40px 24px'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'var(--semi-color-success-light-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto'
          }}>
            <IconUser size="large" style={{ color: 'var(--semi-color-success)' }} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <Title heading={3} style={{ margin: '0 0 8px 0', color: 'var(--semi-color-success)' }}>
              欢迎使用漏洞管理系统！
            </Title>
            {user && (
              <Text style={{ color: 'var(--semi-color-text-0)', fontSize: '16px' }}>
                你好，{user.username}
              </Text>
            )}
          </div>
        </div>
      </Card>
    );
  };

  // 根据角色渲染不同的仪表板
  const renderRoleDashboard = () => {
    if (loading) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px',
          fontSize: '18px',
          color: 'var(--semi-color-text-1)'
        }}>
          正在加载仪表板数据...
        </div>
      );
    }

    if (!user) return renderDefaultDashboard();

    switch (user.role_id) {
      case 1: // 超级管理员
        return renderSuperAdminDashboard();
      case 2: // 安全工程师
        return renderSecurityEngineerDashboard();
      case 3: // 研发工程师
        return renderDevEngineerDashboard();
      default: // 普通用户
        return renderDefaultDashboard();
    }
  };

  // 已登录，显示首页内容
  return (
    <div style={{ 
      padding: '24px',
      height: '100%',
      backgroundColor: 'var(--semi-color-bg-1)'
    }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: '24px' }}>
        <Title heading={2} style={{ margin: 0 }}>
          首页
        </Title>
        <Text type="secondary" style={{ fontSize: '14px' }}>
          欢迎使用漏洞管理系统 - {user && getRoleDisplayName(user.role_id)}
        </Text>
      </div>

      {/* 根据角色渲染仪表板 */}
      {renderRoleDashboard()}

      {/* 页面底部提示 */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '40px',
        color: 'var(--semi-color-text-2)',
        fontSize: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
          <IconCalendar />
          <Text type="tertiary">
            今天是 {new Date().toLocaleDateString('zh-CN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </div>
      </div>
    </div>
  );
} 