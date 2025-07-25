// 数据模型初始化包
// 该包负责数据库表结构的自动迁移和系统默认数据的初始化
package models

import (
	// 导入加密随机数包，用于生成安全随机数
	// 导入十六进制编码包
	"crypto/rand"
	"encoding/hex"
	"fmt"                // 导入格式化包，用于错误信息格式化
	Init "vulnmain/Init" // 导入初始化包，获取数据库连接
)

// AutoMigrate函数执行数据库表结构的自动迁移
// 该函数会根据结构体定义自动创建或更新数据表结构
func AutoMigrate() error {
	// 获取数据库连接实例
	db := Init.GetDB()

	// 按依赖顺序执行数据表迁移，确保外键约束正确
	if err := db.AutoMigrate(
		// 基础权限控制表，这些表之间有外键关联
		&Role{},           // 角色表，定义系统中的用户角色
		&Permission{},     // 权限表，定义系统中的操作权限
		&RolePermission{}, // 角色权限关联表，建立角色与权限的多对多关系
		&User{},           // 用户表，存储系统用户信息

		// 项目管理相关表
		&Project{},       // 项目表，存储安全项目信息
		&ProjectMember{}, // 项目成员关联表，管理项目与用户的关系
		&ProjectStats{},  // 项目统计表，缓存项目统计数据

		// 资产管理相关表
		&AssetGroup{},    // 资产组表，用于资产分组管理
		&Asset{},         // 资产表，存储网络资产信息
		&AssetTag{},      // 资产标签表，为资产添加标签分类
		&AssetAuditLog{}, // 资产审计日志表，记录资产操作历史

		// 漏洞管理相关表
		&VulnCategory{},   // 漏洞分类表，定义漏洞类型分类
		&Vulnerability{},  // 漏洞表，存储漏洞详细信息
		&VulnAttachment{}, // 漏洞附件表，存储漏洞相关文件
		&VulnComment{},    // 漏洞评论表，记录漏洞处理过程中的评论
		&VulnTimeline{},   // 漏洞时间线表，记录漏洞处理的时间节点

		// 系统管理相关表
		&SystemConfig{}, // 系统配置表，存储系统配置参数
		&OperationLog{}, // 操作日志表，记录用户操作行为
		&Notification{}, // 通知表，存储系统通知信息
		&FileStorage{},  // 文件存储表，记录上传文件信息
		&Dictionary{},   // 字典表，存储系统字典数据
	).Error; err != nil {
		// 如果迁移过程中出现错误，返回格式化的错误信息
		return fmt.Errorf("数据库迁移失败: %v", err)
	}

	// 迁移成功，返回nil
	return nil
}

// InitDefaultData函数初始化系统默认数据
// 该函数在系统首次启动时执行，创建默认的角色、权限、用户和系统配置
func InitDefaultData() error {
	// 获取数据库连接实例
	db := Init.GetDB()

	// 初始化系统默认角色
	// 定义三种基本角色，每种角色有不同的权限范围
	roles := []Role{
		{Name: "超级管理员", Code: "super_admin", Description: "系统超级管理员，拥有所有权限"},
		{Name: "安全工程师", Code: "security_engineer", Description: "安全工程师，负责漏洞管理和安全审计"},
		{Name: "研发工程师", Code: "dev_engineer", Description: "研发工程师，负责漏洞修复"},
	}

	// 遍历角色列表，检查每个角色是否已存在
	for _, role := range roles {
		var count int64
		// 根据角色代码查询数据库中是否已存在该角色
		db.Model(&Role{}).Where("code = ?", role.Code).Count(&count)
		// 如果角色不存在，则创建新角色
		if count == 0 {
			if err := db.Create(&role).Error; err != nil {
				// 创建角色失败，返回错误信息
				return fmt.Errorf("初始化角色失败: %v", err)
			}
		}
	}

	// 初始化系统权限列表
	// 权限采用模块化设计，每个权限包含模块、操作和描述信息
	permissions := []Permission{
		// 首页仪表板权限
		{Name: "查看首页", Code: "dashboard:view", Module: "dashboard", Action: "view", Description: "查看仪表板首页"},

		// 项目管理模块权限，管理安全项目相关功能
		{Name: "查看项目", Code: "project:view", Module: "project", Action: "view", Description: "查看项目列表和详情"},
		{Name: "创建项目", Code: "project:create", Module: "project", Action: "create", Description: "创建新项目"},
		{Name: "编辑项目", Code: "project:edit", Module: "project", Action: "edit", Description: "编辑项目信息"},
		{Name: "删除项目", Code: "project:delete", Module: "project", Action: "delete", Description: "删除项目"},

		// 用户管理模块权限，包含用户的增删改查操作
		{Name: "查看用户", Code: "user:view", Module: "user", Action: "view", Description: "查看用户列表和详情"},
		{Name: "创建用户", Code: "user:create", Module: "user", Action: "create", Description: "创建新用户"},
		{Name: "编辑用户", Code: "user:edit", Module: "user", Action: "edit", Description: "编辑用户信息"},
		{Name: "删除用户", Code: "user:delete", Module: "user", Action: "delete", Description: "删除用户"},
		{Name: "重置密码", Code: "user:reset_password", Module: "user", Action: "reset_password", Description: "重置用户密码"},

		// 漏洞管理模块权限，包含漏洞的完整生命周期管理
		{Name: "查看漏洞", Code: "vuln:view", Module: "vuln", Action: "view", Description: "查看漏洞列表和详情"},
		{Name: "创建漏洞", Code: "vuln:create", Module: "vuln", Action: "create", Description: "创建新漏洞"},
		{Name: "编辑漏洞", Code: "vuln:edit", Module: "vuln", Action: "edit", Description: "编辑漏洞信息"},
		{Name: "分配漏洞", Code: "vuln:assign", Module: "vuln", Action: "assign", Description: "分配漏洞给处理人"},
		{Name: "复测漏洞", Code: "vuln:retest", Module: "vuln", Action: "retest", Description: "复测已修复的漏洞"},
		{Name: "修复漏洞", Code: "vuln:fix", Module: "vuln", Action: "fix", Description: "标记漏洞为已修复"},
		{Name: "忽略漏洞", Code: "vuln:ignore", Module: "vuln", Action: "ignore", Description: "忽略漏洞"},
		{Name: "修改漏洞状态", Code: "vuln:change_status", Module: "vuln", Action: "change_status", Description: "修改漏洞状态"},

		// 资产管理模块权限，包含网络资产的管理操作
		{Name: "查看资产", Code: "asset:view", Module: "asset", Action: "view", Description: "查看资产列表和详情"},
		{Name: "创建资产", Code: "asset:create", Module: "asset", Action: "create", Description: "创建新资产"},
		{Name: "编辑资产", Code: "asset:edit", Module: "asset", Action: "edit", Description: "编辑资产信息"},
		{Name: "删除资产", Code: "asset:delete", Module: "asset", Action: "delete", Description: "删除资产"},

		// 系统管理模块权限，管理系统配置和监控
		{Name: "系统配置", Code: "system:config", Module: "system", Action: "config", Description: "管理系统配置"},
		{Name: "查看日志", Code: "system:log", Module: "system", Action: "log", Description: "查看系统日志"},
		{Name: "数据统计", Code: "system:stats", Module: "system", Action: "stats", Description: "查看数据统计"},
	}

	// 遍历权限列表，检查每个权限是否已存在
	for _, permission := range permissions {
		var count int64
		// 根据权限代码查询数据库中是否已存在该权限
		db.Model(&Permission{}).Where("code = ?", permission.Code).Count(&count)
		// 如果权限不存在，则创建新权限
		if count == 0 {
			if err := db.Create(&permission).Error; err != nil {
				// 创建权限失败，返回错误信息
				return fmt.Errorf("初始化权限失败: %v", err)
			}
		}
	}

	// 定义角色权限分配的内部函数
	// 该函数接收角色代码和权限代码列表，为指定角色分配权限
	assignRolePermissions := func(roleCode string, permissionCodes []string) {
		var role Role
		// 根据角色代码查找角色记录
		if err := db.Where("code = ?", roleCode).First(&role).Error; err == nil {
			// 遍历权限代码列表，为角色分配每个权限
			for _, permCode := range permissionCodes {
				var permission Permission
				// 根据权限代码查找权限记录
				if err := db.Where("code = ?", permCode).First(&permission).Error; err == nil {
					var count int64
					// 检查角色权限关联是否已存在
					db.Model(&RolePermission{}).Where("role_id = ? AND permission_id = ?", role.ID, permission.ID).Count(&count)
					// 如果关联不存在，则创建新的角色权限关联
					if count == 0 {
						db.Create(&RolePermission{
							RoleID:       role.ID,       // 角色ID
							PermissionID: permission.ID, // 权限ID
						})
					}
				}
			}
		}
	}

	// 为超级管理员分配所有权限
	// 超级管理员应该拥有系统中的所有权限
	var superAdminRole Role
	if err := db.Where("code = ?", "super_admin").First(&superAdminRole).Error; err == nil {
		var allPermissions []Permission
		// 获取系统中所有权限
		db.Find(&allPermissions)

		// 为超级管理员分配每个权限
		for _, permission := range allPermissions {
			var count int64
			// 检查角色权限关联是否已存在
			db.Model(&RolePermission{}).Where("role_id = ? AND permission_id = ?", superAdminRole.ID, permission.ID).Count(&count)
			// 如果关联不存在，则创建新的角色权限关联
			if count == 0 {
				db.Create(&RolePermission{
					RoleID:       superAdminRole.ID, // 超级管理员角色ID
					PermissionID: permission.ID,     // 权限ID
				})
			}
		}
	}

	// 为安全工程师分配权限
	// 安全工程师负责漏洞管理和安全审计，可以查看自己名下的项目
	securityEngineerPermissions := []string{
		"dashboard:view",                                                                            // 首页查看权限
		"project:view",                                                                              // 项目查看权限（查看自己名下的项目）
		"user:view",                                                                                 // 用户查看权限（查看研发工程师列表等）
		"vuln:view", "vuln:create", "vuln:edit", "vuln:assign", "vuln:retest", "vuln:change_status", // 漏洞管理权限
		"asset:view", "asset:create", "asset:edit", "asset:delete", // 资产管理权限（只能管理自己名下的资产）
	}
	assignRolePermissions("security_engineer", securityEngineerPermissions)

	// 为研发工程师分配权限
	// 研发工程师主要负责漏洞修复，权限相对受限
	devEngineerPermissions := []string{
		"dashboard:view",                                           // 首页查看权限
		"project:view",                                             // 项目查看权限（查看自己名下的项目）
		"vuln:view", "vuln:edit", "vuln:fix", "vuln:change_status", // 漏洞查看、编辑、修复权限（只能处理分配给自己的漏洞）
	}
	assignRolePermissions("dev_engineer", devEngineerPermissions)

	// 初始化默认管理员用户
	// 系统启动时自动创建超级管理员账户
	var adminCount int64
	// 检查是否已存在admin用户
	db.Model(&User{}).Where("username = ?", "admin").Count(&adminCount)
	if adminCount == 0 {
		var superAdminRole Role
		// 获取超级管理员角色
		db.Where("code = ?", "super_admin").First(&superAdminRole)

		// 创建默认管理员用户
		admin := User{
			Username: "admin",              // 用户名
			Email:    "admin@vulnmain.com", // 邮箱地址
			RealName: "系统管理员",              // 真实姓名
			Status:   1,                    // 用户状态（1=启用）
			RoleID:   superAdminRole.ID,    // 关联超级管理员角色
		}
		// 设置默认密码
		admin.SetPassword("admin123")

		// 保存用户到数据库
		if err := db.Create(&admin).Error; err != nil {
			return fmt.Errorf("初始化管理员用户失败: %v", err)
		}
	}

	// 生成32字节的随机密钥并转换为十六进制字符串
	randomBytes := make([]byte, 32)
	rand.Read(randomBytes)
	secret := hex.EncodeToString(randomBytes)
	// 初始化系统配置参数
	// 系统配置包含系统基本信息、认证配置、文件上传配置等
	configs := []SystemConfig{
		// 系统基本配置
		{Key: "system.name", Value: "VulnMain", Type: "string", Group: "system", Description: "系统名称", IsPublic: true},
		{Key: "system.company_name", Value: "xxxxxx科技有限公司", Type: "string", Group: "system", Description: "公司名称", IsPublic: true},
		{Key: "system.title", Value: "漏洞管理平台", Type: "string", Group: "system", Description: "系统标题", IsPublic: true},
		{Key: "system.version", Value: "1.0.0", Type: "string", Group: "system", Description: "系统版本", IsPublic: true},

		// 认证配置
		{Key: "auth.jwt.secret", Value: secret, Type: "string", Group: "auth", Description: "JWT密钥", IsPublic: false},
		{Key: "auth.jwt.expire", Value: "24", Type: "int", Group: "auth", Description: "JWT过期时间(小时)", IsPublic: false},

		// 邮件服务器配置
		{Key: "email.enabled", Value: "false", Type: "bool", Group: "email", Description: "启用邮件服务", IsPublic: false},
		{Key: "email.smtp_host", Value: "", Type: "string", Group: "email", Description: "SMTP服务器地址", IsPublic: false},
		{Key: "email.smtp_port", Value: "587", Type: "int", Group: "email", Description: "SMTP端口", IsPublic: false},
		{Key: "email.username", Value: "", Type: "string", Group: "email", Description: "邮箱用户名", IsPublic: false},
		{Key: "email.password", Value: "", Type: "string", Group: "email", Description: "邮箱密码", IsPublic: false},
		{Key: "email.from_name", Value: "漏洞管理系统", Type: "string", Group: "email", Description: "发件人名称", IsPublic: false},

		// 密码复杂度策略
		{Key: "password.min_length", Value: "8", Type: "int", Group: "password", Description: "密码最小长度", IsPublic: false},
		{Key: "password.require_uppercase", Value: "true", Type: "bool", Group: "password", Description: "密码需要包含大写字母", IsPublic: false},
		{Key: "password.require_lowercase", Value: "true", Type: "bool", Group: "password", Description: "密码需要包含小写字母", IsPublic: false},
		{Key: "password.require_number", Value: "true", Type: "bool", Group: "password", Description: "密码需要包含数字", IsPublic: false},
		{Key: "password.require_special", Value: "false", Type: "bool", Group: "password", Description: "密码需要包含特殊字符", IsPublic: false},
		{Key: "upload.max_size", Value: "10", Type: "int", Group: "upload", Description: "文件上传最大大小(MB)", IsPublic: true},
		{Key: "upload.allowed_types", Value: "jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,zip,rar", Type: "string", Group: "upload", Description: "允许上传的文件类型", IsPublic: true},
	}

	// 遍历配置列表，检查每个配置是否已存在
	for _, config := range configs {
		var existingConfig SystemConfig
		// 根据配置键查询数据库中是否已存在该配置
		result := db.Where("`key` = ?", config.Key).First(&existingConfig)
		if result.Error != nil {
			// 配置不存在，创建新配置记录
			if err := db.Create(&config).Error; err != nil {
				return fmt.Errorf("初始化系统配置失败: %v", err)
			}
		}
		// 如果配置已存在，跳过创建，保持现有配置不变
	}

	// 所有初始化完成，返回成功
	return nil
}
