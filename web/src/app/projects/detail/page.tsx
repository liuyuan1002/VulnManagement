'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Card, 
  Typography, 
  Button, 
  Space, 
  Tag, 
  Tabs, 
  Table, 
  Badge, 
  Empty,
  Spin,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Toast,
  Popconfirm,
  TextArea
} from '@douyinfe/semi-ui';
import MarkdownEditor from '@/components/MarkdownEditor';
import MarkdownViewer from '@/components/MarkdownViewer';
import { 
  IconArrowLeft, 
  IconBolt, 
  IconServer,
  IconEdit,
  IconDelete,
  IconPlus,
  IconUser,
  IconCalendar,
  IconRefresh,
  IconEyeOpened
} from '@douyinfe/semi-icons';
import { 
  projectApi, 
  vulnApi,
  assetApi,
  userApi,
  authUtils, 
  Project, 
  Vulnerability,
  Asset,
  User,
  PROJECT_TYPES,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  VULN_SEVERITIES,
  VULN_STATUSES,
  VULN_TYPES,
  ASSET_TYPES,
  OS_TYPES,
  ENVIRONMENT_TYPES,
  ASSET_IMPORTANCE_LEVELS,
  VulnCreateRequest,
  VulnUpdateRequest,
  AssetCreateRequest,
  AssetUpdateRequest
} from '@/lib/api';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

export default function ProjectDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 基础状态
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTabKey, setActiveTabKey] = useState('vulnerabilities');
  
  // 漏洞相关状态
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [vulnModalVisible, setVulnModalVisible] = useState(false);
  const [vulnLoading, setVulnLoading] = useState(false);
  const [editingVuln, setEditingVuln] = useState<Vulnerability | null>(null);
  const [vulnFormRef, setVulnFormRef] = useState<any>(null);
  
  // 漏洞详情相关状态
  const [vulnDetailModalVisible, setVulnDetailModalVisible] = useState(false);
  const [viewingVuln, setViewingVuln] = useState<Vulnerability | null>(null);
  const [vulnDetailLoading, setVulnDetailLoading] = useState(false);
  
  // 资产相关状态
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetModalVisible, setAssetModalVisible] = useState(false);
  const [assetLoading, setAssetLoading] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [assetFormRef, setAssetFormRef] = useState<any>(null);
  
  // 用户列表（用于指派）
  const [devEngineers, setDevEngineers] = useState<User[]>([]);
  
  // 当前用户信息状态
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // 漏洞描述内容状态（用于Markdown编辑器）
  const [vulnDescription, setVulnDescription] = useState<string>('');
  
  const projectId = searchParams.get('id') as string;
  const isAdmin = currentUser?.role_id === 1;
  const isSecurityEngineer = currentUser?.role_id === 2;
  const isDevEngineer = currentUser?.role_id === 3;

  useEffect(() => {
    // 在客户端获取当前用户信息
    setCurrentUser(authUtils.getCurrentUser());
    
    if (projectId) {
      loadProjectDetail();
      loadDevEngineers();
    }
  }, [projectId]);

  useEffect(() => {
    if (project && activeTabKey === 'vulnerabilities') {
      loadVulnerabilities();
    } else if (project && activeTabKey === 'assets') {
      loadAssets();
    }
  }, [project, activeTabKey]);

  // 监听 editingVuln 变化，自动填充表单
  useEffect(() => {
    if (editingVuln && vulnFormRef && vulnModalVisible) {
      const formValues = {
        title: editingVuln.title || '',
        vuln_url: editingVuln.vuln_url || '',
        description: editingVuln.description || '',
        vuln_type: editingVuln.vuln_type || '',
        severity: editingVuln.severity || '',
        status: editingVuln.status || 'unfixed',
        cve_id: editingVuln.cve_id || '',
        fix_suggestion: editingVuln.fix_suggestion || '',
        asset_id: editingVuln.asset_id,
        assignee_id: editingVuln.assignee_id || null,
        fix_deadline: editingVuln.fix_deadline ? new Date(editingVuln.fix_deadline) : null,
        tags: editingVuln.tags || '',
      };
      
      
      // 延迟设置表单值，确保表单完全渲染（包括动态显示的状态选择框）
      setTimeout(() => {
        try {
          vulnFormRef.setValues(formValues);
          
          // 对于研发工程师，额外确保状态字段被正确设置
          if (isDevEngineer && editingVuln.status) {
            setTimeout(() => {
              try {
                vulnFormRef.setValue('status', editingVuln.status);
              } catch (statusError) {
                console.error('Failed to set status field:', statusError);
              }
            }, 50);
          }
        } catch (error) {
          console.error('Failed to set form values:', error);
          // 如果第一次失败，再尝试一次
          setTimeout(() => {
            try {
              vulnFormRef.setValues(formValues);
            } catch (retryError) {
              console.error('Failed to set form values on retry:', retryError);
            }
          }, 200);
        }
      }, 150); // 增加延迟时间以确保动态表单字段已渲染
    }
  }, [editingVuln, vulnFormRef, vulnModalVisible, isDevEngineer]);

  // 加载项目详情
  const loadProjectDetail = async () => {
    try {
      setLoading(true);
      const response = await projectApi.getProject(parseInt(projectId));
      if (response.code === 200 && response.data) {
        setProject(response.data);
      }
    } catch (error) {
      console.error('Error loading project detail:', error);
      Toast.error('加载项目详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载研发工程师列表
  const loadDevEngineers = async () => {
    try {
      const response = await userApi.getDevEngineers();
      setDevEngineers(response.data || []);
    } catch (error) {
      console.error('Error loading dev engineers:', error);
    }
  };

  // 加载漏洞列表
  const loadVulnerabilities = async () => {
    try {
      setVulnLoading(true);
      const response = await vulnApi.getProjectVulns(parseInt(projectId));
      setVulnerabilities(response.data || []);
    } catch (error) {
      console.error('Error loading vulnerabilities:', error);
      Toast.error('加载漏洞列表失败');
    } finally {
      setVulnLoading(false);
    }
  };

  // 加载资产列表
  const loadAssets = async () => {
    try {
      setAssetLoading(true);
      const response = await assetApi.getProjectAssets(parseInt(projectId));
      setAssets(response.data || []);
    } catch (error) {
      console.error('Error loading assets:', error);
      Toast.error('加载资产列表失败');
    } finally {
      setAssetLoading(false);
    }
  };

  // 获取可用的资产列表（优先使用已加载的资产，其次是项目详情中的资产）
  const getAvailableAssets = () => {
    // 如果独立加载的资产列表不为空，使用它
    if (assets.length > 0) {
      return assets;
    }
    
    // 否则尝试使用项目详情中的资产数据
    if (project?.assets && project.assets.length > 0) {
      return project.assets;
    }
    
    // 都没有则返回空数组
    return [];
  };

  // 漏洞相关操作
  const handleCreateVuln = async () => {
    setEditingVuln(null);
    setVulnDescription(''); // 清空markdown内容
    if (vulnFormRef) {
      vulnFormRef.reset();
    }
    
    // 确保资产数据已加载，如果还没有加载就先加载
    const availableAssets = getAvailableAssets();
    if (availableAssets.length === 0) {
      try {
        await loadAssets();
      } catch (error) {
        console.error('加载资产数据失败:', error);
        Toast.warning('资产数据加载失败，您可能无法看到完整的资产列表');
      }
    }
    
    setVulnModalVisible(true);
  };

  const handleEditVuln = async (vuln: Vulnerability) => {
    // 确保资产数据已加载，如果还没有加载就先加载
    const availableAssets = getAvailableAssets();
    if (availableAssets.length === 0) {
      try {
        await loadAssets();
      } catch (error) {
        console.error('加载资产数据失败:', error);
        Toast.warning('资产数据加载失败，您可能无法看到完整的资产列表');
      }
    }
    
    setEditingVuln(vuln);
    setVulnDescription(vuln.description || ''); // 设置markdown内容
    setVulnModalVisible(true);
    // 表单值设置由 useEffect 处理
  };

  // 查看漏洞详情
  const handleViewVuln = async (vuln: Vulnerability) => {
    setVulnDetailLoading(true);
    try {
      // 获取完整的漏洞详情
      const response = await vulnApi.getVuln(vuln.id);
      if (response.code === 200 && response.data) {
        setViewingVuln(response.data);
        setVulnDetailModalVisible(true);
      } else {
        Toast.error('获取漏洞详情失败');
      }
    } catch (error) {
      console.error('获取漏洞详情失败:', error);
      Toast.error('获取漏洞详情失败');
    } finally {
      setVulnDetailLoading(false);
    }
  };

  const handleSaveVuln = async (values: any) => {
    try {
      
      // 验证markdown内容
      if (!vulnDescription.trim()) {
        Toast.error('请输入漏洞详情');
        return;
      }
      
      const vulnData: VulnCreateRequest | VulnUpdateRequest = {
        title: values.title,
        vuln_url: values.vuln_url,
        description: vulnDescription, // 使用markdown编辑器的内容
        vuln_type: values.vuln_type,
        severity: values.severity,
        cve_id: values.cve_id,
        fix_suggestion: values.fix_suggestion,
        asset_id: values.asset_id,
        assignee_id: values.assignee_id,
        fix_deadline: values.fix_deadline ? values.fix_deadline.toISOString().split('T')[0] : undefined,
        tags: values.tags,
      };

      // 如果是编辑模式，需要包含状态字段
      if (editingVuln) {
        // 对于研发工程师，如果选择了状态，使用选择的状态；否则保持原状态
        if (isDevEngineer && values.status) {
          vulnData.status = values.status;
        } else if (!isDevEngineer && values.status) {
          // 对于其他角色，直接使用表单的状态值
          vulnData.status = values.status;
        } else {
          // 如果没有明确的状态选择，保持原状态
          vulnData.status = editingVuln.status;
        }
      } else {
        // 创建新漏洞时，使用表单状态或默认状态
        vulnData.status = values.status || 'unfixed';
      }

      if (editingVuln) {
        await vulnApi.updateVuln(editingVuln.id, vulnData);
      } else {
        await vulnApi.createVuln({ ...vulnData, project_id: parseInt(projectId) } as VulnCreateRequest);
      }

      
      // 立即关闭弹窗并重置状态
      setVulnModalVisible(false);
      setEditingVuln(null);
      
      // 重置表单
      if (vulnFormRef) {
        vulnFormRef.reset();
      }
      
      // 刷新漏洞列表
      await loadVulnerabilities();
      
      // 延迟显示Toast消息以避免React 18兼容性问题
      setTimeout(() => {
        Toast.success(editingVuln ? '更新漏洞成功' : '创建漏洞成功');
      }, 100);
      
    } catch (error) {
      console.error('保存漏洞失败:', error);
      // 延迟显示错误Toast
      setTimeout(() => {
        Toast.error(editingVuln ? '更新漏洞失败' : '创建漏洞失败');
      }, 100);
    }
  };

  const handleDeleteVuln = async (vuln: Vulnerability) => {
    try {
      await vulnApi.deleteVuln(vuln.id);
      Toast.success('删除漏洞成功');
      loadVulnerabilities();
    } catch (error) {
      console.error('Error deleting vulnerability:', error);
      Toast.error('删除漏洞失败');
    }
  };

  const handleUpdateVulnStatus = async (vulnId: number, status: string, extraData?: any) => {
    try {
      await vulnApi.updateVuln(vulnId, { status, ...extraData });
      Toast.success('更新漏洞状态成功');
      loadVulnerabilities();
    } catch (error) {
      console.error('Error updating vulnerability status:', error);
      Toast.error('更新漏洞状态失败');
    }
  };

  // 资产相关操作
  const handleCreateAsset = () => {
    setEditingAsset(null);
    if (assetFormRef) {
      assetFormRef.reset();
    }
    setAssetModalVisible(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setAssetModalVisible(true);
    setTimeout(() => {
      if (assetFormRef) {
        assetFormRef.setValues({
          name: asset.name,
          type: asset.type,
          domain: asset.domain,
          ip: asset.ip,
          port: asset.port,
          os: asset.os,
          owner: asset.owner,
          environment: asset.environment,
          department: asset.department,
          importance: asset.importance,
          tags: asset.tags,
          description: asset.description,
        });
      }
    }, 200);
  };

  const handleSaveAsset = async (values: any) => {
    try {
      
      const assetData: AssetCreateRequest | AssetUpdateRequest = {
        name: values.name,
        type: values.type,
        domain: values.domain,
        ip: values.ip,
        port: values.port,
        os: values.os,
        owner: values.owner,
        environment: values.environment,
        department: values.department,
        importance: values.importance,
        tags: values.tags,
        description: values.description,
      };

      if (editingAsset) {
        await assetApi.updateAsset(editingAsset.id, assetData);
      } else {
        await assetApi.createAsset({ ...assetData, project_id: parseInt(projectId) } as AssetCreateRequest);
      }

      // 立即关闭弹窗并重置状态
      setAssetModalVisible(false);
      setEditingAsset(null);
      
      // 重置表单
      if (assetFormRef) {
        assetFormRef.reset();
      }
      
      // 刷新资产列表
      await loadAssets();
      
      // 延迟显示Toast消息以避免React 18兼容性问题
      setTimeout(() => {
        Toast.success(editingAsset ? '更新资产成功' : '创建资产成功');
      }, 100);
      
    } catch (error) {
      console.error('保存资产失败:', error);
      // 延迟显示错误Toast
      setTimeout(() => {
        Toast.error(editingAsset ? '更新资产失败' : '创建资产失败');
      }, 100);
    }
  };

  const handleDeleteAsset = async (asset: Asset) => {
    try {
      await assetApi.deleteAsset(asset.id);
      Toast.success('删除资产成功');
      loadAssets();
    } catch (error) {
      console.error('Error deleting asset:', error);
      Toast.error('删除资产失败');
    }
  };

  // 获取标签颜色
  const getSeverityColor = (severity: string): 'red' | 'orange' | 'yellow' | 'blue' | 'grey' | 'green' => {
    const severityItem = VULN_SEVERITIES.find(s => s.value === severity);
    return (severityItem?.color as any) || 'grey';
  };

  const getStatusColor = (status: string): 'red' | 'orange' | 'yellow' | 'blue' | 'grey' | 'green' => {
    const statusItem = VULN_STATUSES.find(s => s.value === status);
    return (statusItem?.color as any) || 'grey';
  };

  const getImportanceColor = (importance: string): 'red' | 'orange' | 'yellow' | 'blue' | 'grey' | 'green' => {
    const importanceItem = ASSET_IMPORTANCE_LEVELS.find(i => i.value === importance);
    return (importanceItem?.color as any) || 'grey';
  };

  // 检查操作权限
  const canEditVuln = (vuln: Vulnerability) => {
    // 管理员可以编辑任何状态的漏洞
    if (isAdmin) return true;
    
    // 已完成的漏洞只有管理员才能编辑
    if (vuln.status === 'completed') return false;
    
    const userId = currentUser?.id || currentUser?.ID;
    if (isSecurityEngineer && vuln.reporter_id === userId && vuln.status === 'unfixed') return true;
    if (isDevEngineer && vuln.assignee_id === userId) return true;
    return false;
  };

  const canDeleteVuln = (vuln: Vulnerability) => {
    // 管理员可以删除任何状态的漏洞
    if (isAdmin) return true;
    
    // 已完成的漏洞只有管理员才能删除
    if (vuln.status === 'completed') return false;
    
    const userId = currentUser?.id || currentUser?.ID;
    if (isSecurityEngineer && vuln.reporter_id === userId) return true;
    return false;
  };

  const canEditAsset = (asset: Asset) => {
    if (isAdmin) return true;
    if (isSecurityEngineer && asset.created_by === currentUser?.id) return true;
    return false;
  };

  const canDeleteAsset = (asset: Asset) => {
    if (isAdmin) return true;
    if (isSecurityEngineer && asset.created_by === currentUser?.id) return true;
    return false;
  };

  // 漏洞表格列定义
  const vulnColumns = [
    {
      title: '漏洞标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Vulnerability) => (
        <div>
          <Text strong>{text}</Text>
          {record.vuln_url && (
            <div>
              <Text type="secondary" size="small">{record.vuln_url}</Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => {
        const severityItem = VULN_SEVERITIES.find(s => s.value === severity);
        return <Tag color={getSeverityColor(severity)}>{severityItem?.label || severity}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusItem = VULN_STATUSES.find(s => s.value === status);
        return <Tag color={getStatusColor(status)}>{statusItem?.label || status}</Tag>;
      },
    },
    {
      title: '漏洞类型',
      dataIndex: 'vuln_type',
      key: 'vuln_type',
    },
    {
      title: '所属资产',
      dataIndex: 'asset',
      key: 'asset',
      render: (asset: Asset) => asset ? `${asset.name} (${asset.ip})` : '-',
    },
    {
      title: '提交人',
      dataIndex: 'reporter',
      key: 'reporter',
      render: (reporter: User) => reporter ? reporter.real_name : '未知',
    },
    {
      title: '指派人',
      dataIndex: 'assignee',
      key: 'assignee',
      render: (assignee: User) => assignee ? assignee.real_name : '未指派',
    },
    {
      title: '提交时间',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      render: (time: string) => new Date(time).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (text: string, record: Vulnerability) => (
        <Space>
          <Button
            theme="borderless"
            icon={<IconEyeOpened />}
            size="small"
            onClick={() => handleViewVuln(record)}
            loading={vulnDetailLoading}
          >
            查看详情
          </Button>
          
          {canEditVuln(record) && (
            <Button
              theme="borderless"
              icon={<IconEdit />}
              size="small"
              onClick={() => handleEditVuln(record)}
            >
              编辑
            </Button>
          )}
          
          {isSecurityEngineer && record.status === 'ignored' && (
            <Button
              theme="borderless"
              type="primary"
              size="small"
              onClick={() => handleUpdateVulnStatus(record.id, 'unfixed')}
            >
              重新激活
            </Button>
          )}
          
          {isSecurityEngineer && record.status === 'fixed' && (
            <Button
              theme="borderless"
              type="primary"
              size="small"
              onClick={() => handleUpdateVulnStatus(record.id, 'retesting', { retester_id: currentUser?.ID || currentUser?.id })}
            >
              复测
            </Button>
          )}
          
          {/* 研发工程师 - 分配给自己的漏洞操作 */}
          {isDevEngineer && record.assignee_id === (currentUser?.ID || currentUser?.id) && (
            <>
              {/* 未修复状态：可以开始修复或直接标记已修复 */}
              {record.status === 'unfixed' && (
                <>
                  <Button
                    theme="borderless"
                    type="primary"
                    size="small"
                    onClick={() => handleUpdateVulnStatus(record.id, 'fixing', { 
                      fix_started_at: new Date().toISOString(),
                      fixer_id: currentUser?.ID || currentUser?.id 
                    })}
                  >
                    开始修复
                  </Button>
                  <Button
                    theme="borderless"
                    type="secondary"
                    size="small"
                    onClick={() => handleUpdateVulnStatus(record.id, 'fixed', { 
                      fixed_at: new Date().toISOString(),
                      fixer_id: currentUser?.ID || currentUser?.id 
                    })}
                  >
                    标记已修复
                  </Button>
                </>
              )}
              
              {/* 修复中状态：可以标记已修复或忽略 */}
              {record.status === 'fixing' && (
                <>
                  <Button
                    theme="borderless"
                    type="secondary"
                    size="small"
                    onClick={() => handleUpdateVulnStatus(record.id, 'fixed', { 
                      fixed_at: new Date().toISOString(),
                      fixer_id: currentUser?.ID || currentUser?.id 
                    })}
                  >
                    标记已修复
                  </Button>
                  <Button
                    theme="borderless"
                    type="tertiary"
                    size="small"
                    onClick={() => {
                      Modal.confirm({
                        title: '忽略漏洞',
                        content: '请输入忽略原因：',
                        onOk: (reason) => {
                          const reasonText = prompt('请输入忽略原因：');
                          if (reasonText) {
                            handleUpdateVulnStatus(record.id, 'ignored', { ignore_reason: reasonText });
                          }
                        }
                      });
                    }}
                  >
                    忽略
                  </Button>
                </>
              )}
            </>
          )}
          
          {/* 安全工程师 - 复测完成操作 */}
          {isSecurityEngineer && record.status === 'retesting' && (
            <>
              <Button
                theme="borderless"
                type="secondary"
                size="small"
                onClick={() => handleUpdateVulnStatus(record.id, 'completed', { 
                  completed_at: new Date().toISOString() 
                })}
              >
                修复完成
              </Button>
              <Button
                theme="borderless"
                type="tertiary"
                size="small"
                onClick={() => {
                  const reason = prompt('复测不通过原因：');
                  if (reason) {
                    handleUpdateVulnStatus(record.id, 'unfixed', { 
                      retest_result: reason,
                      retest_at: new Date().toISOString() 
                    });
                  }
                }}
              >
                复测不通过
              </Button>
            </>
          )}
          
          {canDeleteVuln(record) && (
            <Popconfirm
              title="确认删除"
              content={`确定要删除漏洞"${record.title}"吗？`}
              onConfirm={() => handleDeleteVuln(record)}
            >
              <Button
                theme="borderless"
                type="danger"
                icon={<IconDelete />}
                size="small"
              >
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // 资产表格列定义
  const assetColumns = [
    {
      title: '资产名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Asset) => (
        <div>
          <Text strong>{text}</Text>
          <div>
            <Text type="secondary" size="small">{record.ip}:{record.port}</Text>
          </div>
        </div>
      ),
    },
    {
      title: '资产类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeItem = ASSET_TYPES.find(t => t.value === type);
        return typeItem?.label || type;
      },
    },
    {
      title: '环境',
      dataIndex: 'environment',
      key: 'environment',
      render: (environment: string) => {
        const envItem = ENVIRONMENT_TYPES.find(e => e.value === environment);
        return envItem?.label || environment;
      },
    },
    {
      title: '重要性',
      dataIndex: 'importance',
      key: 'importance',
      render: (importance: string) => {
        const importanceItem = ASSET_IMPORTANCE_LEVELS.find(i => i.value === importance);
        return <Tag color={getImportanceColor(importance)}>{importanceItem?.label || importance}</Tag>;
      },
    },
    {
      title: '负责人',
      dataIndex: 'owner',
      key: 'owner',
    },
    {
      title: '所属部门',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: '操作系统',
      dataIndex: 'os',
      key: 'os',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: string) => new Date(time).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (text: string, record: Asset) => (
        <Space>
          {canEditAsset(record) && (
            <Button
              theme="borderless"
              icon={<IconEdit />}
              size="small"
              onClick={() => handleEditAsset(record)}
            >
              编辑
            </Button>
          )}
          {canDeleteAsset(record) && (
            <Popconfirm
              title="确认删除"
              content={`确定要删除资产"${record.name}"吗？`}
              onConfirm={() => handleDeleteAsset(record)}
            >
              <Button
                theme="borderless"
                type="danger"
                icon={<IconDelete />}
                size="small"
              >
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if (loading) {
    return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', padding: '50px' }} />;
  }

  if (!project) {
    return <div>项目不存在</div>;
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 项目基本信息 */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <Space>
            <Button
              theme="borderless"
              icon={<IconArrowLeft />}
              onClick={() => router.back()}
            >
              返回
            </Button>
            <Title heading={3} style={{ margin: 0 }}>{project.name}</Title>
            <Tag color="blue">{PROJECT_TYPES.find(t => t.value === project.type)?.label}</Tag>
            <Tag color="green">{PROJECT_PRIORITIES.find(p => p.value === project.priority)?.label}</Tag>
          </Space>
          <Button
            icon={<IconRefresh />}
            onClick={() => {
              loadProjectDetail();
              if (activeTabKey === 'vulnerabilities') {
                loadVulnerabilities();
              } else {
                loadAssets();
              }
            }}
          >
            刷新
          </Button>
        </div>
        {project.description && (
          <Text type="secondary">{project.description}</Text>
        )}
      </Card>

      {/* 标签页 */}
      <Card>
        <Tabs 
          activeKey={activeTabKey}
          onChange={setActiveTabKey}
          type="line"
          size="large"
        >
          <TabPane 
            tab={
              <span>
                <IconBolt style={{ marginRight: '8px' }} />
                漏洞管理
              </span>
            } 
            itemKey="vulnerabilities"
          >
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              {(isAdmin || isSecurityEngineer) && (
                <Button
                  theme="solid"
                  type="primary"
                  icon={<IconPlus />}
                  onClick={handleCreateVuln}
                >
                  添加漏洞
                </Button>
              )}
            </div>
            <Table
              columns={vulnColumns}
              dataSource={vulnerabilities}
              loading={vulnLoading}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: true,
              }}
              empty={
                <Empty
                  image={<IconBolt size="extra-large" />}
                  title="暂无漏洞"
                  description="暂时没有漏洞记录"
                />
              }
            />
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <IconServer style={{ marginRight: '8px' }} />
                资产管理
              </span>
            } 
            itemKey="assets"
          >
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                {(isAdmin || isSecurityEngineer) && (
                  <Button
                    theme="solid"
                    type="primary"
                    icon={<IconPlus />}
                    onClick={handleCreateAsset}
                  >
                    添加资产
                  </Button>
                )}
              </div>
              <Table
                columns={assetColumns}
                dataSource={assets}
                loading={assetLoading}
                pagination={{
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: true,
                }}
                empty={
                  <Empty
                    image={<IconServer size="extra-large" />}
                    title="暂无资产"
                    description="暂时没有资产记录"
                  />
                }
              />
            </TabPane>
        </Tabs>
      </Card>

      {/* 漏洞创建/编辑弹窗 */}
      <Modal
        title={editingVuln ? '编辑漏洞' : '添加漏洞'}
        visible={vulnModalVisible}
        onCancel={() => {
          setVulnModalVisible(false);
          setEditingVuln(null);
          setVulnDescription(''); // 重置markdown内容
          if (vulnFormRef) {
            vulnFormRef.reset();
          }
        }}
        footer={null}
        width={800}
        maskClosable={false}
      >
        <Form
          getFormApi={(api) => setVulnFormRef(api)}
          onSubmit={handleSaveVuln}
          onSubmitFail={(errors) => {
            console.error('漏洞表单验证失败:', errors);
            Toast.error('请检查表单输入');
          }}
          labelPosition="left"
          labelAlign="left"
          labelWidth={120}
        >
          <Form.Input
            field="title"
            label="漏洞名称"
            placeholder="请输入漏洞名称"
            rules={[{ required: true, message: '请输入漏洞名称' }]}
            disabled={isDevEngineer && !!editingVuln}
          />
          
          <Form.Input
            field="vuln_url"
            label="漏洞地址"
            placeholder="请输入漏洞地址"
            disabled={isDevEngineer && !!editingVuln}
          />
          
          {/* 研发工程师编辑时显示状态选择 */}
          {isDevEngineer && editingVuln && (
            <Form.Select
              field="status"
              label="漏洞状态"
              placeholder="请选择漏洞状态"
              rules={[{ required: true, message: '请选择漏洞状态' }]}
            >
              {/* 研发工程师可选的状态 */}
              <Select.Option value="unfixed">未修复</Select.Option>
              <Select.Option value="fixing">修复中</Select.Option>
              <Select.Option value="fixed">已修复</Select.Option>
            </Form.Select>
          )}
          
          <Form.Select
            field="asset_id"
            label="所属资产"
            placeholder={getAvailableAssets().length === 0 ? "正在加载资产列表..." : "请选择所属资产"}
            rules={[{ required: true, message: '请选择所属资产' }]}
            loading={assetLoading}
            disabled={isDevEngineer && !!editingVuln}
            emptyContent={
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                {assetLoading ? '正在加载资产...' : '暂无可用资产，请先添加资产'}
              </div>
            }
          >
            {getAvailableAssets().map(asset => (
              <Select.Option key={asset.id} value={asset.id}>
                {asset.name} ({asset.ip})
              </Select.Option>
            ))}
          </Form.Select>
          
          <Form.Select
            field="severity"
            label="漏洞等级"
            placeholder="请选择漏洞等级"
            rules={[{ required: true, message: '请选择漏洞等级' }]}
            disabled={isDevEngineer && !!editingVuln}
          >
            {VULN_SEVERITIES.map(severity => (
              <Select.Option key={severity.value} value={severity.value}>
                {severity.label}
              </Select.Option>
            ))}
          </Form.Select>
          
          <Form.Select
            field="vuln_type"
            label="漏洞类型"
            placeholder="请选择漏洞类型"
            rules={[{ required: true, message: '请选择漏洞类型' }]}
            disabled={isDevEngineer && !!editingVuln}
          >
            {VULN_TYPES.map(type => (
              <Select.Option key={type} value={type}>
                {type}
              </Select.Option>
            ))}
          </Form.Select>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              marginBottom: '8px', 
              fontSize: '14px', 
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{ color: '#f56565', marginRight: '4px' }}>*</span>
              漏洞详情
            </div>
            <MarkdownEditor
              value={vulnDescription}
              onChange={(value) => setVulnDescription(value || '')}
              placeholder="请输入漏洞详情（支持Markdown格式和图片上传）"
              height={300}
              disabled={isDevEngineer && !!editingVuln}
            />
            {!vulnDescription.trim() && (
              <div style={{ 
                color: '#f56565', 
                fontSize: '12px', 
                marginTop: '4px',
                display: 'none' 
              }} 
              id="description-error">
                请输入漏洞详情
              </div>
            )}
          </div>
          
          <Form.Input
            field="cve_id"
            label="CVE编号"
            placeholder="请输入CVE编号（可选）"
            disabled={isDevEngineer && !!editingVuln}
          />
          
          <Form.TextArea
            field="fix_suggestion"
            label="修复建议"
            placeholder="请输入修复建议"
            autosize={{ minRows: 2, maxRows: 4 }}
            disabled={isDevEngineer && !!editingVuln}
          />
          
          <Form.Select
            field="assignee_id"
            label="指派给"
            placeholder="请选择研发工程师"
            disabled={isDevEngineer && !!editingVuln}
          >
            {devEngineers.map(engineer => (
              <Select.Option key={engineer.ID || engineer.id} value={engineer.ID || engineer.id}>
                {engineer.real_name} ({engineer.username})
              </Select.Option>
            ))}
          </Form.Select>
          
          <Form.DatePicker
            field="fix_deadline"
            label="修复期限"
            placeholder="请选择修复期限"
            format="yyyy-MM-dd"
            disabled={isDevEngineer && !!editingVuln}
          />
          
          <Form.Input
            field="tags"
            label="标签"
            placeholder="请输入标签，用逗号分隔"
            disabled={isDevEngineer && !!editingVuln}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <Button onClick={() => setVulnModalVisible(false)}>
              取消
            </Button>
            <Button theme="solid" type="primary" htmlType="submit">
              {editingVuln ? '更新' : '创建'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 漏洞详情查看弹窗 */}
      <Modal
        title="漏洞详情"
        visible={vulnDetailModalVisible}
        onCancel={() => {
          setVulnDetailModalVisible(false);
          setViewingVuln(null);
        }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setVulnDetailModalVisible(false)}>
              关闭
            </Button>
          </div>
        }
        width={800}
        maskClosable={true}
      >
        {viewingVuln && (
          <div style={{ lineHeight: '1.6' }}>
            {/* 基础信息 */}
            <div style={{ marginBottom: '24px' }}>
              <Title heading={5} style={{ marginBottom: '16px' }}>基础信息</Title>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <Text type="secondary">漏洞标题：</Text>
                  <Text strong>{viewingVuln.title}</Text>
                </div>
                <div>
                  <Text type="secondary">漏洞类型：</Text>
                  <Text>{viewingVuln.vuln_type}</Text>
                </div>
                <div>
                  <Text type="secondary">严重程度：</Text>
                  <Tag color={getSeverityColor(viewingVuln.severity)}>
                    {VULN_SEVERITIES.find(s => s.value === viewingVuln.severity)?.label || viewingVuln.severity}
                  </Tag>
                </div>
                <div>
                  <Text type="secondary">当前状态：</Text>
                  <Tag color={getStatusColor(viewingVuln.status)}>
                    {VULN_STATUSES.find(s => s.value === viewingVuln.status)?.label || viewingVuln.status}
                  </Tag>
                </div>
                {viewingVuln.vuln_url && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Text type="secondary">漏洞地址：</Text>
                    <Text>{viewingVuln.vuln_url}</Text>
                  </div>
                )}
                {viewingVuln.cve_id && (
                  <div>
                    <Text type="secondary">CVE编号：</Text>
                    <Text>{viewingVuln.cve_id}</Text>
                  </div>
                )}
                {viewingVuln.tags && (
                  <div>
                    <Text type="secondary">标签：</Text>
                    <Text>{viewingVuln.tags}</Text>
                  </div>
                )}
              </div>
            </div>

            {/* 关联信息 */}
            <div style={{ marginBottom: '24px' }}>
              <Title heading={5} style={{ marginBottom: '16px' }}>关联信息</Title>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <Text type="secondary">所属项目：</Text>
                  <Text>{viewingVuln.project?.name || '未知'}</Text>
                </div>
                <div>
                  <Text type="secondary">所属资产：</Text>
                  <Text>{viewingVuln.asset ? `${viewingVuln.asset.name} (${viewingVuln.asset.ip})` : '未知'}</Text>
                </div>
                <div>
                  <Text type="secondary">提交人：</Text>
                  <Text>{viewingVuln.reporter?.real_name || '未知'}</Text>
                </div>
                <div>
                  <Text type="secondary">指派人：</Text>
                  <Text>{viewingVuln.assignee?.real_name || '未指派'}</Text>
                </div>
                {viewingVuln.fixer && (
                  <div>
                    <Text type="secondary">修复人：</Text>
                    <Text>{viewingVuln.fixer.real_name}</Text>
                  </div>
                )}
                {viewingVuln.retester && (
                  <div>
                    <Text type="secondary">复测人：</Text>
                    <Text>{viewingVuln.retester.real_name}</Text>
                  </div>
                )}
              </div>
            </div>

            {/* 时间信息 */}
            <div style={{ marginBottom: '24px' }}>
              <Title heading={5} style={{ marginBottom: '16px' }}>时间信息</Title>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <Text type="secondary">提交时间：</Text>
                  <Text>{new Date(viewingVuln.submitted_at).toLocaleString()}</Text>
                </div>
                {viewingVuln.assigned_at && (
                  <div>
                    <Text type="secondary">分配时间：</Text>
                    <Text>{new Date(viewingVuln.assigned_at).toLocaleString()}</Text>
                  </div>
                )}
                {viewingVuln.fix_started_at && (
                  <div>
                    <Text type="secondary">开始修复时间：</Text>
                    <Text>{new Date(viewingVuln.fix_started_at).toLocaleString()}</Text>
                  </div>
                )}
                {viewingVuln.fixed_at && (
                  <div>
                    <Text type="secondary">修复完成时间：</Text>
                    <Text>{new Date(viewingVuln.fixed_at).toLocaleString()}</Text>
                  </div>
                )}
                {viewingVuln.retest_at && (
                  <div>
                    <Text type="secondary">复测时间：</Text>
                    <Text>{new Date(viewingVuln.retest_at).toLocaleString()}</Text>
                  </div>
                )}
                {viewingVuln.completed_at && (
                  <div>
                    <Text type="secondary">完成时间：</Text>
                    <Text>{new Date(viewingVuln.completed_at).toLocaleString()}</Text>
                  </div>
                )}
                {viewingVuln.fix_deadline && (
                  <div>
                    <Text type="secondary">修复期限：</Text>
                    <Text>{new Date(viewingVuln.fix_deadline).toLocaleDateString()}</Text>
                  </div>
                )}
              </div>
            </div>

            {/* 详细描述 */}
            {viewingVuln.description && (
              <div style={{ marginBottom: '24px' }}>
                <Title heading={5} style={{ marginBottom: '16px' }}>漏洞详情</Title>
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '6px',
                  border: '1px solid #e9ecef',
                }}>
                  <MarkdownViewer content={viewingVuln.description} />
                </div>
              </div>
            )}

            {/* 修复建议 */}
            {viewingVuln.fix_suggestion && (
              <div style={{ marginBottom: '24px' }}>
                <Title heading={5} style={{ marginBottom: '16px' }}>修复建议</Title>
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#f0f9ff', 
                  borderRadius: '6px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  <Text>{viewingVuln.fix_suggestion}</Text>
                </div>
              </div>
            )}

            {/* 忽略原因 */}
            {viewingVuln.ignore_reason && (
              <div style={{ marginBottom: '24px' }}>
                <Title heading={5} style={{ marginBottom: '16px' }}>忽略原因</Title>
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#fef2f2', 
                  borderRadius: '6px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  <Text>{viewingVuln.ignore_reason}</Text>
                </div>
              </div>
            )}

            {/* 复测结果 */}
            {viewingVuln.retest_result && (
              <div>
                <Title heading={5} style={{ marginBottom: '16px' }}>复测结果</Title>
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#f0fdf4', 
                  borderRadius: '6px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  <Text>{viewingVuln.retest_result}</Text>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 资产创建/编辑弹窗 */}
      <Modal
        title={editingAsset ? '编辑资产' : '添加资产'}
        visible={assetModalVisible}
        onCancel={() => {
          setAssetModalVisible(false);
          setEditingAsset(null);
          if (assetFormRef) {
            assetFormRef.reset();
          }
        }}
        footer={null}
        width={800}
        maskClosable={false}
      >
        <Form
          getFormApi={(api) => setAssetFormRef(api)}
          onSubmit={handleSaveAsset}
          onSubmitFail={(errors) => {
            console.error('资产表单验证失败:', errors);
            Toast.error('请检查表单输入');
          }}
          labelPosition="left"
          labelAlign="left"
          labelWidth={120}
        >
          <Form.Input
            field="name"
            label="资产名称"
            placeholder="请输入资产名称"
            rules={[{ required: true, message: '请输入资产名称' }]}
          />
          
          <Form.Select
            field="type"
            label="资产类型"
            placeholder="请选择资产类型"
            rules={[{ required: true, message: '请选择资产类型' }]}
          >
            {ASSET_TYPES.map(type => (
              <Select.Option key={type.value} value={type.value}>
                {type.label}
              </Select.Option>
            ))}
          </Form.Select>
          
          <Form.Input
            field="domain"
            label="域名"
            placeholder="请输入域名（可选，必须加http或https）"
          />
          
          <Form.Input
            field="ip"
            label="IP地址"
            placeholder="请输入IP地址"
            rules={[{ required: true, message: '请输入IP地址' }]}
          />
          
          <Form.Input
            field="port"
            label="端口"
            placeholder="请输入端口"
            rules={[{ required: true, message: '请输入端口' }]}
          />
          
          <Form.Select
            field="os"
            label="操作系统"
            placeholder="请选择操作系统"
          >
            {OS_TYPES.map(os => (
              <Select.Option key={os} value={os}>
                {os}
              </Select.Option>
            ))}
          </Form.Select>
          
          <Form.Input
            field="owner"
            label="资产负责人"
            placeholder="请输入资产负责人名字"
            rules={[{ required: true, message: '请输入资产负责人名字' }]}
          />
          
          <Form.Select
            field="environment"
            label="所属环境"
            placeholder="请选择所属环境"
            rules={[{ required: true, message: '请选择所属环境' }]}
          >
            {ENVIRONMENT_TYPES.map(env => (
              <Select.Option key={env.value} value={env.value}>
                {env.label}
              </Select.Option>
            ))}
          </Form.Select>
          
          <Form.Input
            field="department"
            label="所属部门"
            placeholder="请输入资产所属部门"
          />
          
          <Form.Select
            field="importance"
            label="资产重要性"
            placeholder="请选择资产重要性"
            rules={[{ required: true, message: '请选择资产重要性' }]}
          >
            {ASSET_IMPORTANCE_LEVELS.map(level => (
              <Select.Option key={level.value} value={level.value}>
                {level.label}
              </Select.Option>
            ))}
          </Form.Select>
          
          <Form.Input
            field="tags"
            label="资产标签"
            placeholder="请输入资产标签，用逗号分隔"
          />
          
          <Form.TextArea
            field="description"
            label="资产描述"
            placeholder="请输入资产描述"
            autosize={{ minRows: 2, maxRows: 4 }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <Button onClick={() => setAssetModalVisible(false)}>
              取消
            </Button>
            <Button theme="solid" type="primary" htmlType="submit">
              {editingAsset ? '更新' : '创建'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
} 