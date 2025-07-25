'use client';

import { useEffect, useState } from 'react';
import { 
  Card, 
  Typography, 
  Button, 
  Space, 
  Tag, 
  Modal, 
  Form, 
  Input, 
  Select, 
  DatePicker, 
  Switch, 
  Toast, 
  Empty, 
  Spin,
  Divider,
  Avatar,
  Badge
} from '@douyinfe/semi-ui';
import { 
  IconPlus, 
  IconEdit, 
  IconDelete, 
  IconMore, 
  IconCalendar, 
  IconUser, 
  IconSetting,
  IconSearch,
  IconRefresh
} from '@douyinfe/semi-icons';
import { 
  projectApi, 
  userApi, 
  authUtils, 
  Project, 
  User, 
  ProjectCreateRequest, 
  ProjectUpdateRequest,
  PROJECT_TYPES,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES
} from '@/lib/api';

const { Title, Text } = Typography;

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [securityEngineers, setSecurityEngineers] = useState<User[]>([]);
  const [allEngineers, setAllEngineers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [formRef, setFormRef] = useState<any>(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | undefined>();
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [refreshingStats, setRefreshingStats] = useState(false);

  // 当前用户信息状态
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const isAdmin = currentUser?.role_id === 1;
  const isSecurityEngineer = currentUser?.role_id === 2;
  const isDevEngineer = currentUser?.role_id === 3;

  useEffect(() => {
    // 在客户端获取当前用户信息
    setCurrentUser(authUtils.getCurrentUser());
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadProjects();
      if (isAdmin) {
        loadEngineers();
      }
    }
  }, [currentUser, isAdmin]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      let response;
      
      if (isAdmin) {
        // 管理员获取所有项目
        response = await projectApi.getProjectList({
          page: 1,
          page_size: 1000,
          keyword: searchKeyword || undefined,
          type: filterType || undefined,
          status: filterStatus || undefined,
        });
        setProjects(response.data?.projects || []);
      } else {
        // 安全工程师和研发工程师获取自己的项目
        response = await projectApi.getUserProjects();
        setProjects(response.data || []);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      Toast.error('加载项目列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadEngineers = async () => {
    try {
      // 加载安全工程师（用于项目负责人）
      const securityResponse = await userApi.getSecurityEngineers();
      
      // 规范化安全工程师数据（处理大小写字段名问题）
      const normalizedSecurityEngineers = (securityResponse.data || []).map((engineer: any) => ({
        id: engineer.id || engineer.ID,
        username: engineer.username,
        real_name: engineer.real_name || engineer.RealName || engineer.realName,
        email: engineer.email || engineer.Email,
        phone: engineer.phone || engineer.Phone,
        department: engineer.department || engineer.Department,
        role_id: engineer.role_id || engineer.RoleId || engineer.RoleID,
        status: engineer.status || engineer.Status,
        last_login_at: engineer.last_login_at || engineer.LastLoginAt,
        ...engineer
      }));
      
      // 过滤有效的工程师数据
      const validSecurityEngineers = normalizedSecurityEngineers.filter((engineer: User) => 
        engineer && engineer.id && engineer.username
      );
      setSecurityEngineers(validSecurityEngineers);
      
      // 加载所有工程师（用于项目成员）
      const allResponse = await userApi.getEngineers();
      
      // 规范化所有工程师数据
      const normalizedAllEngineers = (allResponse.data || []).map((engineer: any) => ({
        id: engineer.id || engineer.ID,
        username: engineer.username,
        real_name: engineer.real_name || engineer.RealName || engineer.realName,
        email: engineer.email || engineer.Email,
        phone: engineer.phone || engineer.Phone,
        department: engineer.department || engineer.Department,
        role_id: engineer.role_id || engineer.RoleId || engineer.RoleID,
        status: engineer.status || engineer.Status,
        last_login_at: engineer.last_login_at || engineer.LastLoginAt,
        ...engineer
      }));
      
      // 过滤有效的工程师数据
      const validAllEngineers = normalizedAllEngineers.filter((engineer: User) => 
        engineer && engineer.id && engineer.username
      );
      setAllEngineers(validAllEngineers);
      
    } catch (error) {
      console.error('Error loading engineers:', error);
      Toast.error('加载工程师列表失败');
    }
  };

  const handleCreateProject = () => {
    setEditingProject(null);
    setSelectedOwnerId(undefined);
    setSelectedMemberIds([]);
    if (formRef) {
      formRef.reset();
    }
    setModalVisible(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setModalVisible(true);
  };

  // 使用 useEffect 监听编辑项目的变化
  useEffect(() => {
    if (editingProject && modalVisible && formRef) {
      // 延迟设置确保表单完全渲染
      const timer = setTimeout(() => {
        try {
          const memberIds = editingProject.members?.map(m => m.user_id) || [];
          setSelectedOwnerId(editingProject.owner_id);
          setSelectedMemberIds(memberIds);
          
          formRef.setValues({
            name: editingProject.name,
            type: editingProject.type,
            priority: editingProject.priority,
            description: editingProject.description,
            start_date: editingProject.start_date ? new Date(editingProject.start_date) : undefined,
            end_date: editingProject.end_date ? new Date(editingProject.end_date) : undefined,
            is_public: editingProject.is_public,
          });
        } catch (error) {
          console.error('设置表单值失败:', error);
        }
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [editingProject, modalVisible, formRef]);

  const handleDeleteProject = async (project: Project) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除项目"${project.name}"吗？此操作无法撤销。`,
      onOk: async () => {
        try {
          await projectApi.deleteProject(project.id);
          Toast.success('删除成功');
          loadProjects();
        } catch (error) {
          console.error('Error deleting project:', error);
          Toast.error('删除失败');
        }
      },
    });
  };

  const handleSaveProject = async (values: any) => {
    try {
      if (!selectedOwnerId) {
        Toast.error('请选择项目负责人');
        return;
      }
      
      const projectData: ProjectCreateRequest | ProjectUpdateRequest = {
        name: values.name,
        type: values.type,
        priority: values.priority,
        description: values.description,
        owner_id: Number(selectedOwnerId),
        start_date: values.start_date ? values.start_date.toISOString().split('T')[0] : undefined,
        end_date: values.end_date ? values.end_date.toISOString().split('T')[0] : undefined,
        is_public: values.is_public,
        member_ids: selectedMemberIds.map(id => Number(id)),
      };
      

      if (editingProject) {
        await projectApi.updateProject(editingProject.id, projectData);
      } else {
        await projectApi.createProject(projectData as ProjectCreateRequest);
      }

      // 关闭弹窗并重置状态
      setModalVisible(false);
      setEditingProject(null);
      
      // 刷新项目列表
      await loadProjects();
      
      // 延迟执行Toast避免React 18兼容性问题
      setTimeout(() => {
        Toast.success(editingProject ? '更新成功' : '创建成功');
      }, 100);
      
    } catch (error) {
      console.error('保存项目失败:', error);
      // 延迟执行Toast避免React 18兼容性问题
      setTimeout(() => {
        Toast.error(editingProject ? '更新失败' : '创建失败');
      }, 100);
    }
  };

  const handleViewProject = (project: Project) => {
    // 跳转到项目详情页
    window.location.href = `/projects/detail?id=${project.id}`;
  };

  const handleRefreshStats = async () => {
    if (!isAdmin) {
      Toast.error('只有超级管理员可以刷新统计数据');
      return;
    }

    try {
      setRefreshingStats(true);
      const response = await projectApi.refreshStats();
      if (response.code === 200) {
        Toast.success(`统计数据刷新完成！更新了 ${response.data?.updated_count || 0} 个项目`);
        // 刷新项目列表以显示最新数据
        loadProjects();
      } else {
        Toast.error(response.msg || '刷新统计数据失败');
      }
    } catch (error) {
      console.error('Error refreshing stats:', error);
      Toast.error('刷新统计数据失败');
    } finally {
      setRefreshingStats(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const typeItem = PROJECT_TYPES.find(t => t.value === type);
    return typeItem?.label || type;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'blue';
      default:
        return 'grey';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'inactive':
        return 'grey';
      case 'completed':
        return 'blue';
      case 'archived':
        return 'grey';
      default:
        return 'grey';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusItem = PROJECT_STATUSES.find(s => s.value === status);
    return statusItem?.label || status;
  };

  const isProjectExpired = (project: Project) => {
    if (!project.end_date) return false;
    return new Date(project.end_date) < new Date();
  };

  const filteredProjects = projects.filter(project => {
    if (searchKeyword && !project.name.toLowerCase().includes(searchKeyword.toLowerCase())) {
      return false;
    }
    if (filterType && project.type !== filterType) {
      return false;
    }
    if (filterStatus && project.status !== filterStatus) {
      return false;
    }
    return true;
  });

  const renderProjectCard = (project: Project) => {
    const expired = isProjectExpired(project);
    
    return (
      <Card
        key={project.id}
        style={{ 
          marginBottom: '16px',
          border: expired ? '1px solid var(--semi-color-danger)' : undefined
        }}
        bodyStyle={{ padding: '20px' }}
        headerLine={false}
        footerLine={false}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Title heading={4} style={{ margin: 0 }}>
                {project.name}
              </Title>
              {expired && (
                <Badge dot type="danger">
                  <Text type="danger" size="small">已过期</Text>
                </Badge>
              )}
            </div>
            <Space>
              <Tag color={getPriorityColor(project.priority)}>
                {PROJECT_PRIORITIES.find(p => p.value === project.priority)?.label}
        </Tag>
              <Tag color={getStatusColor(project.status)}>
                {getStatusLabel(project.status)}
        </Tag>
            </Space>
          </div>
        }
      >
        <div style={{ marginBottom: '16px' }}>
          <Text type="secondary" size="small">项目类型：{getTypeLabel(project.type)}</Text>
          <br />
          <Text type="secondary" size="small">
            负责人：{project.owner?.real_name || project.owner?.username}
          </Text>
          {project.start_date && (
            <>
              <br />
              <Text type="secondary" size="small">
                开始时间：{new Date(project.start_date).toLocaleDateString('zh-CN')}
              </Text>
            </>
          )}
          {project.end_date && (
            <>
              <br />
              <Text type="secondary" size="small">
                结束时间：{new Date(project.end_date).toLocaleDateString('zh-CN')}
              </Text>
            </>
          )}
        </div>

        <Text style={{ color: 'var(--semi-color-text-1)', lineHeight: '1.5' }}>
          {project.description || '暂无描述'}
        </Text>

        <Divider margin="16px" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Text type="secondary" size="small">
              成员：{project.member_count || 0}
            </Text>
            <Text type="secondary" size="small">
              资产：{project.asset_count || 0}
            </Text>
            <Text type="secondary" size="small">
              漏洞：{project.vuln_count || 0}
            </Text>
          </div>

        <Space>
            <Button
              theme="borderless"
              icon={<IconMore />}
              size="small"
              onClick={() => handleViewProject(project)}
            >
              查看
            </Button>
            
            {isAdmin && (
              <>
          <Button 
            theme="borderless" 
            icon={<IconEdit />} 
            size="small"
                  onClick={() => handleEditProject(project)}
          >
            编辑
          </Button>
          <Button 
            theme="borderless" 
            type="danger" 
            icon={<IconDelete />} 
            size="small"
                  onClick={() => handleDeleteProject(project)}
          >
            删除
          </Button>
              </>
            )}
        </Space>
        </div>
      </Card>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面头部 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <Title heading={3} style={{ margin: 0 }}>项目管理</Title>
          <Text type="secondary">
            {isAdmin ? '管理和监控所有项目' : '查看我的项目列表'}
          </Text>
        </div>
        <Space>
          <Button
            theme="borderless"
            icon={<IconRefresh />}
            onClick={loadProjects}
            loading={loading}
          >
            刷新
          </Button>
          {isAdmin && (
            <>
              <Button
                theme="borderless"
                icon={<IconSetting />}
                onClick={handleRefreshStats}
                loading={refreshingStats}
              >
                刷新统计
              </Button>
              <Button 
                theme="solid" 
                type="primary" 
                icon={<IconPlus />}
                onClick={handleCreateProject}
              >
                新建项目
              </Button>
            </>
          )}
        </Space>
      </div>

      {/* 搜索和筛选 */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Input
            prefix={<IconSearch />}
            placeholder="搜索项目名称"
            value={searchKeyword}
            onChange={(value) => setSearchKeyword(value as string)}
            style={{ width: '200px' }}
          />
          <Select
            placeholder="项目类型"
            value={filterType}
            onChange={(value) => setFilterType(value as string)}
            style={{ width: '150px' }}
          >
            <Select.Option value="">全部类型</Select.Option>
            {PROJECT_TYPES.map(type => (
              <Select.Option key={`filter_type_${type.value}`} value={type.value}>
                {type.label}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="项目状态"
            value={filterStatus}
            onChange={(value) => setFilterStatus(value as string)}
            style={{ width: '150px' }}
          >
            <Select.Option value="">全部状态</Select.Option>
            {PROJECT_STATUSES.map(status => (
              <Select.Option key={`filter_status_${status.value}`} value={status.value}>
                {status.label}
              </Select.Option>
            ))}
          </Select>
          <Button
            onClick={loadProjects}
            loading={loading}
          >
            搜索
          </Button>
        </div>
      </Card>

      {/* 项目列表 */}
      <Spin spinning={loading}>
        {filteredProjects.length > 0 ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
            gap: '16px' 
          }}>
            {filteredProjects.map(renderProjectCard)}
          </div>
        ) : (
          <Card>
            <Empty
              image={<IconSetting size="extra-large" />}
              title="暂无项目"
              description={isAdmin ? '点击"新建项目"创建第一个项目' : '暂时没有分配给您的项目'}
            />
          </Card>
        )}
      </Spin>

      {/* 项目创建/编辑弹窗 */}
      <Modal
        title={editingProject ? '编辑项目' : '新建项目'}
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingProject(null);
        }}
        footer={null}
        width={600}
        destroyOnClose={true}
        maskClosable={false}
      >
        <Form
          getFormApi={(api) => setFormRef(api)}
          onSubmit={handleSaveProject}
          onSubmitFail={(errors) => {
            console.error('表单验证失败:', errors);
            Toast.error('请检查表单输入');
          }}
          labelPosition="left"
          labelAlign="left"
          labelWidth={100}
        >
          <Form.Input
            field="name"
            label="项目名称"
            placeholder="请输入项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
          />
          
          <Form.Select
            field="type"
            label="项目类型"
            placeholder="请选择项目类型"
            rules={[{ required: true, message: '请选择项目类型' }]}
          >
            {PROJECT_TYPES.map(type => (
              <Select.Option key={`type_${type.value}`} value={type.value}>
                {type.label}
              </Select.Option>
            ))}
          </Form.Select>

          <Form.Select
            field="priority"
            label="优先级"
            placeholder="请选择优先级"
            rules={[{ required: true, message: '请选择优先级' }]}
          >
            {PROJECT_PRIORITIES.map(priority => (
              <Select.Option key={`priority_${priority.value}`} value={priority.value}>
                {priority.label}
              </Select.Option>
            ))}
          </Form.Select>

          <Form.TextArea
            field="description"
            label="项目描述"
            placeholder="请输入项目描述"
            autosize={{ minRows: 3, maxRows: 6 }}
          />

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              项目负责人 <span style={{ color: 'red' }}>*</span>
            </label>
            {securityEngineers.length === 0 ? (
              <div style={{ color: '#999', padding: '8px' }}>正在加载安全工程师列表...</div>
            ) : (
              <Select
                placeholder="请选择项目负责人（安全工程师）"
                value={selectedOwnerId}
                onChange={(value) => {
                  setSelectedOwnerId(value as number);
                }}
                style={{ width: '100%' }}
              >
                              {securityEngineers.filter(engineer => engineer && engineer.id).map((engineer: User) => (
                <Select.Option key={`owner_${engineer.id}`} value={engineer.id}>
                  {engineer.real_name || engineer.username} ({engineer.username})
                </Select.Option>
              ))}
              </Select>
            )}
          </div>

          <Form.DatePicker
            field="start_date"
            label="开始日期"
            placeholder="请选择开始日期"
            type="date"
          />

          <Form.DatePicker
            field="end_date"
            label="结束日期"
            placeholder="请选择结束日期（可选）"
            type="date"
          />

          <Form.Switch
            field="is_public"
            label="公开项目"
            checkedText="是"
            uncheckedText="否"
          />

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              项目成员
            </label>
            {allEngineers.length === 0 ? (
              <div style={{ color: '#999', padding: '8px' }}>正在加载工程师列表...</div>
            ) : (
              <Select
                placeholder="请选择项目成员（安全工程师和研发工程师）"
                value={selectedMemberIds}
                onChange={(value) => {
                  setSelectedMemberIds(Array.isArray(value) ? value as number[] : []);
                }}
                multiple
                style={{ width: '100%' }}
              >
                {allEngineers.filter(engineer => engineer && engineer.id).map((engineer: User) => (
                  <Select.Option key={`member_${engineer.id}`} value={engineer.id}>
                    {engineer.real_name || engineer.username} ({engineer.username}) - {authUtils.getRoleDisplayName(engineer.role_id)}
                  </Select.Option>
                ))}
              </Select>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <Button onClick={() => setModalVisible(false)}>
              取消
            </Button>
            <Button theme="solid" type="primary" htmlType="submit">
              {editingProject ? '更新' : '创建'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
} 