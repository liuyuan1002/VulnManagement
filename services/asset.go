// 资产管理服务包
// 该包提供资产的创建、查询、更新、删除等业务逻辑处理
package services

import (
	"errors"             // 导入错误处理包
	Init "vulnmain/Init" // 导入初始化包，获取数据库连接
	"vulnmain/models"    // 导入模型包，使用资产相关模型
)

// AssetService结构体定义资产管理服务
// 提供资产相关的所有业务逻辑处理方法
type AssetService struct{}

// AssetCreateRequest结构体定义创建资产的请求参数
// 包含创建资产时需要的所有必要信息
type AssetCreateRequest struct {
	Name         string `json:"name" binding:"required"` // 资产名称，必填字段
	Type         string `json:"type" binding:"required"` // 资产类型，必填字段，如web应用、数据库等
	Category     string `json:"category"`                // 资产分类，选填字段
	URL          string `json:"url"`                     // 资产URL地址，选填字段
	IP           string `json:"ip"`                      // 资产IP地址，选填字段
	Port         string `json:"port"`                    // 资产端口，选填字段
	Domain       string `json:"domain"`                  // 资产域名，选填字段
	Description  string `json:"description"`             // 资产描述信息，选填字段
	OS           string `json:"os"`                      // 操作系统信息，选填字段
	Importance   string `json:"importance"`              // 重要性级别，选填字段
	Owner        string `json:"owner"`                   // 资产负责人，选填字段
	Department   string `json:"department"`              // 所属部门，选填字段
	Environment  string `json:"environment"`             // 所属环境，选填字段
	ProjectID    *uint  `json:"project_id"`              // 所属项目ID，可为空
	AssetGroupID *uint  `json:"asset_group_id"`          // 所属资产组ID，可为空
	Tags         string `json:"tags"`                    // 资产标签，用逗号分隔
}

// AssetUpdateRequest结构体定义更新资产的请求参数
// 所有字段都是可选的，只更新传入的非空字段
type AssetUpdateRequest struct {
	Name         string `json:"name"`           // 资产名称，选填字段
	Type         string `json:"type"`           // 资产类型，选填字段
	Category     string `json:"category"`       // 资产分类，选填字段
	URL          string `json:"url"`            // 资产URL地址，选填字段
	IP           string `json:"ip"`             // 资产IP地址，选填字段
	Port         string `json:"port"`           // 资产端口，选填字段
	Domain       string `json:"domain"`         // 资产域名，选填字段
	Description  string `json:"description"`    // 资产描述信息，选填字段
	OS           string `json:"os"`             // 操作系统信息，选填字段
	Status       string `json:"status"`         // 资产状态，选填字段
	Importance   string `json:"importance"`     // 重要性级别，选填字段
	Owner        string `json:"owner"`          // 资产负责人，选填字段
	Department   string `json:"department"`     // 所属部门，选填字段
	Environment  string `json:"environment"`    // 所属环境，选填字段
	AssetGroupID *uint  `json:"asset_group_id"` // 所属资产组ID，可为空
	Tags         string `json:"tags"`           // 资产标签，用逗号分隔
}

// AssetListRequest结构体定义获取资产列表的请求参数
// 支持分页、关键词搜索和多种过滤条件
type AssetListRequest struct {
	Page         int    `form:"page" binding:"min=1"`              // 页码，最小值为1
	PageSize     int    `form:"page_size" binding:"min=1,max=100"` // 每页数量，范围1-100
	Keyword      string `form:"keyword"`                           // 关键词搜索，在多个字段中模糊匹配
	Name         string `form:"name"`                              // 按资产名称过滤
	Type         string `form:"type"`                              // 按资产类型过滤
	Category     string `form:"category"`                          // 按资产分类过滤
	Status       string `form:"status"`                            // 按资产状态过滤
	Importance   string `form:"importance"`                        // 按重要性级别过滤
	Owner        string `form:"owner"`                             // 按负责人过滤
	Department   string `form:"department"`                        // 按部门过滤
	ProjectID    *uint  `form:"project_id"`                        // 按项目ID过滤，可为空
	AssetGroupID *uint  `form:"asset_group_id"`                    // 按资产组ID过滤，可为空
	// 权限控制字段
	CurrentUserID   uint   `form:"-"` // 当前用户ID，用于权限控制
	CurrentUserRole string `form:"-"` // 当前用户角色，用于权限控制
}

// AssetListResponse结构体定义资产列表的响应数据
// 包含资产数据和分页信息
type AssetListResponse struct {
	Assets      []models.Asset `json:"assets"`       // 资产列表数据
	Total       int64          `json:"total"`        // 总记录数
	Page        int            `json:"page"`         // 当前页码
	PageSize    int            `json:"page_size"`    // 每页数量
	CurrentPage int            `json:"current_page"` // 当前页码（冗余字段）
	TotalPages  int            `json:"total_pages"`  // 总页数
}

// CreateAsset方法创建新的资产记录
// 参数：req - 创建资产的请求参数，createdBy - 创建者用户ID
// 返回：创建的资产对象和可能的错误
func (s *AssetService) CreateAsset(req *AssetCreateRequest, createdBy uint) (*models.Asset, error) {
	// 获取数据库连接
	db := Init.GetDB()

	// 验证资产组是否存在（如果指定了资产组ID）
	if req.AssetGroupID != nil {
		var assetGroup models.AssetGroup
		if err := db.Where("id = ?", *req.AssetGroupID).First(&assetGroup).Error; err != nil {
			return nil, errors.New("资产组不存在")
		}
	}

	// 检查资产名称是否已存在，避免重复创建
	var existAsset models.Asset
	query := db.Where("name = ?", req.Name)
	// 如果指定了项目ID，则在项目范围内检查重名
	if req.ProjectID != nil {
		query = query.Where("project_id = ?", *req.ProjectID)
	}
	if err := query.First(&existAsset).Error; err == nil {
		if req.ProjectID != nil {
			return nil, errors.New("该项目下已存在同名资产")
		} else {
			return nil, errors.New("已存在同名资产")
		}
	}

	// 构建资产对象
	asset := models.Asset{
		Name:         req.Name,         // 资产名称
		Type:         req.Type,         // 资产类型
		IP:           req.IP,           // IP地址
		Port:         req.Port,         // 端口
		Domain:       req.Domain,       // 域名
		Description:  req.Description,  // 描述信息
		OS:           req.OS,           // 操作系统
		Status:       "active",         // 默认状态为活跃
		Importance:   req.Importance,   // 重要性级别
		Owner:        req.Owner,        // 负责人
		Department:   req.Department,   // 所属部门
		Environment:  req.Environment,  // 所属环境
		ProjectID:    0,                // 项目ID，暂时设为0，后续会根据req.ProjectID设置
		AssetGroupID: req.AssetGroupID, // 资产组ID
		CreatedBy:    createdBy,        // 创建者ID
		Tags:         req.Tags,         // 标签
	}

	// 设置项目ID（如果指定）
	if req.ProjectID != nil {
		asset.ProjectID = *req.ProjectID
	}

	// 保存资产到数据库
	if err := db.Create(&asset).Error; err != nil {
		return nil, errors.New("创建资产失败")
	}

	// 记录审计日志，追踪资产创建操作
	s.addAuditLog(asset.ID, "create", "", "", createdBy, "", "")

	// 重新查询资产信息，包含关联的项目、资产组、创建者等数据
	db.Preload("Project").Preload("AssetGroup").Preload("Creator").Where("id = ?", asset.ID).First(&asset)

	// 更新项目统计信息（如果资产属于某个项目）
	if asset.ProjectID != 0 {
		projectService := &ProjectService{}
		if err := projectService.UpdateProjectStats(asset.ProjectID); err != nil {
			// 统计更新失败不影响资产创建，只记录错误
			// 可以考虑添加日志记录
		}
	}

	return &asset, nil
}

// GetAssetByID 根据ID获取资产
func (s *AssetService) GetAssetByID(assetID uint) (*models.Asset, error) {
	db := Init.GetDB()

	var asset models.Asset
	if err := db.Preload("Project").Preload("AssetGroup").Preload("Creator").Where("id = ?", assetID).First(&asset).Error; err != nil {
		return nil, errors.New("资产不存在")
	}

	return &asset, nil
}

// UpdateAsset 更新资产信息
func (s *AssetService) UpdateAsset(assetID uint, req *AssetUpdateRequest, userID uint) (*models.Asset, error) {
	db := Init.GetDB()

	var asset models.Asset
	if err := db.Where("id = ?", assetID).First(&asset).Error; err != nil {
		return nil, errors.New("资产不存在")
	}

	// 记录变更前的数据
	_ = asset // 暂时记录变更前的数据，后续可用于审计日志

	// 检查资产名称是否已被其他资产使用
	if req.Name != "" && req.Name != asset.Name {
		var existAsset models.Asset
		if err := db.Where("name = ? AND id != ?", req.Name, assetID).First(&existAsset).Error; err == nil {
			return nil, errors.New("该项目下已存在同名资产")
		}
		asset.Name = req.Name
	}

	// 验证资产组是否存在(如果指定)
	if req.AssetGroupID != nil && (asset.AssetGroupID == nil || *asset.AssetGroupID != *req.AssetGroupID) {
		if *req.AssetGroupID != 0 {
			var assetGroup models.AssetGroup
			if err := db.Where("id = ?", *req.AssetGroupID).First(&assetGroup).Error; err != nil {
				return nil, errors.New("资产组不存在")
			}
			asset.AssetGroupID = req.AssetGroupID
		} else {
			asset.AssetGroupID = nil
		}
	}

	// 更新其他字段
	if req.Type != "" {
		asset.Type = req.Type
	}

	if req.IP != "" {
		asset.IP = req.IP
	}
	if req.Port != "" {
		asset.Port = req.Port
	}
	if req.Domain != "" {
		asset.Domain = req.Domain
	}
	if req.Description != "" {
		asset.Description = req.Description
	}
	if req.OS != "" {
		asset.OS = req.OS
	}
	if req.Status != "" {
		asset.Status = req.Status
	}
	if req.Importance != "" {
		asset.Importance = req.Importance
	}
	if req.Owner != "" {
		asset.Owner = req.Owner
	}
	if req.Department != "" {
		asset.Department = req.Department
	}
	if req.Environment != "" {
		asset.Environment = req.Environment
	}
	if req.Tags != "" {
		asset.Tags = req.Tags
	}

	if err := db.Save(&asset).Error; err != nil {
		return nil, errors.New("更新资产失败")
	}

	// 记录审计日志
	s.addAuditLog(asset.ID, "update", "", "", userID, "", "")

	// 重新查询资产信息
	db.Preload("Project").Preload("AssetGroup").Preload("Creator").Where("id = ?", asset.ID).First(&asset)

	return &asset, nil
}

// DeleteAsset 删除资产(软删除)
func (s *AssetService) DeleteAsset(assetID uint, userID uint, userRole string) error {
	db := Init.GetDB()

	// 权限检查：安全工程师不能删除资产
	if userRole == "security_engineer" {
		return errors.New("安全工程师无权删除资产")
	}

	var asset models.Asset
	if err := db.Where("id = ?", assetID).First(&asset).Error; err != nil {
		return errors.New("资产不存在")
	}

	// 检查是否有关联的漏洞
	var vulnCount int64
	db.Model(&models.Vulnerability{}).Where("asset_id = ?", assetID).Count(&vulnCount)
	if vulnCount > 0 {
		return errors.New("该资产下存在漏洞，无法删除")
	}

	// 记录项目ID用于后续更新统计
	projectID := asset.ProjectID

	if err := db.Delete(&asset).Error; err != nil {
		return errors.New("删除资产失败")
	}

	// 记录审计日志
	s.addAuditLog(assetID, "delete", "", "", userID, "", "")

	// 更新项目统计信息（如果资产属于某个项目）
	if projectID != 0 {
		projectService := &ProjectService{}
		if err := projectService.UpdateProjectStats(projectID); err != nil {
			// 统计更新失败不影响资产删除，只记录错误
			// 可以考虑添加日志记录
		}
	}

	return nil
}

// GetAssetList 获取资产列表
func (s *AssetService) GetAssetList(req *AssetListRequest) (*AssetListResponse, error) {
	db := Init.GetDB()

	// 设置默认值
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 10
	}

	query := db.Model(&models.Asset{}).Preload("Project").Preload("AssetGroup").Preload("Creator")

	// 基于角色的权限控制
	// 如果是查询特定项目的资产，需要先检查用户是否是项目成员
	if req.ProjectID != nil {
		// 检查用户是否是项目成员（管理员和项目成员都可以查看）
		if req.CurrentUserRole != "super_admin" {
			var memberCount int64
			db.Model(&models.ProjectMember{}).Where("project_id = ? AND user_id = ?", *req.ProjectID, req.CurrentUserID).Count(&memberCount)
			if memberCount == 0 {
				// 用户不是项目成员，不能查看项目资产
				return &AssetListResponse{
					Assets:      []models.Asset{},
					Total:       0,
					Page:        req.Page,
					PageSize:    req.PageSize,
					CurrentPage: req.Page,
					TotalPages:  0,
				}, nil
			}
		}
		// 如果用户是项目成员或管理员，可以查看项目内所有资产，不添加额外的用户限制
	} else {
		// 查询全局资产列表时，应用原有的权限控制
		switch req.CurrentUserRole {
		case "security_engineer":
			// 安全工程师只能看到自己创建的资产
			query = query.Where("created_by = ?", req.CurrentUserID)
		case "dev_engineer":
			// 研发工程师只能看到自己参与项目的资产
			query = query.Where("project_id IN (SELECT project_id FROM project_members WHERE user_id = ?)", req.CurrentUserID)
		case "super_admin":
			// 超级管理员能看到所有资产，不添加额外限制
		default:
			// 其他角色不能查看资产列表
			return &AssetListResponse{
				Assets:      []models.Asset{},
				Total:       0,
				Page:        req.Page,
				PageSize:    req.PageSize,
				CurrentPage: req.Page,
				TotalPages:  0,
			}, nil
		}
	}

	// 添加过滤条件
	if req.Keyword != "" {
		// 支持关键词搜索，在名称、描述、URL、IP、域名中搜索
		query = query.Where("name LIKE ? OR description LIKE ? OR url LIKE ? OR ip LIKE ? OR domain LIKE ?",
			"%"+req.Keyword+"%", "%"+req.Keyword+"%", "%"+req.Keyword+"%", "%"+req.Keyword+"%", "%"+req.Keyword+"%")
	}
	if req.Name != "" {
		query = query.Where("name LIKE ?", "%"+req.Name+"%")
	}
	if req.Type != "" {
		query = query.Where("type = ?", req.Type)
	}
	if req.Category != "" {
		query = query.Where("category = ?", req.Category)
	}
	if req.Status != "" {
		query = query.Where("status = ?", req.Status)
	}
	if req.Importance != "" {
		query = query.Where("importance = ?", req.Importance)
	}
	if req.Owner != "" {
		query = query.Where("owner LIKE ?", "%"+req.Owner+"%")
	}
	if req.Department != "" {
		query = query.Where("department LIKE ?", "%"+req.Department+"%")
	}
	if req.ProjectID != nil {
		query = query.Where("project_id = ?", *req.ProjectID)
	}
	if req.AssetGroupID != nil {
		query = query.Where("asset_group_id = ?", *req.AssetGroupID)
	}

	// 获取总数
	var total int64
	query.Count(&total)

	// 分页查询
	var assets []models.Asset
	offset := (req.Page - 1) * req.PageSize
	if err := query.Offset(offset).Limit(req.PageSize).Order("created_at DESC").Find(&assets).Error; err != nil {
		return nil, errors.New("查询资产列表失败")
	}

	// 计算总页数
	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	return &AssetListResponse{
		Assets:      assets,
		Total:       total,
		Page:        req.Page,
		PageSize:    req.PageSize,
		CurrentPage: req.Page,
		TotalPages:  totalPages,
	}, nil
}

// GetAssetStats 获取资产统计信息
func (s *AssetService) GetAssetStats() (map[string]interface{}, error) {
	db := Init.GetDB()

	var totalAssets int64
	var activeAssets int64
	var inactiveAssets int64
	var maintenanceAssets int64

	db.Model(&models.Asset{}).Count(&totalAssets)
	db.Model(&models.Asset{}).Where("status = ?", "active").Count(&activeAssets)
	db.Model(&models.Asset{}).Where("status = ?", "inactive").Count(&inactiveAssets)
	db.Model(&models.Asset{}).Where("status = ?", "maintenance").Count(&maintenanceAssets)

	// 按类型统计
	var typeStats []struct {
		Type  string `json:"type"`
		Count int64  `json:"count"`
	}
	db.Model(&models.Asset{}).Select("type, COUNT(*) as count").Group("type").Scan(&typeStats)

	// 按重要性统计
	var importanceStats []struct {
		Importance string `json:"importance"`
		Count      int64  `json:"count"`
	}
	db.Model(&models.Asset{}).Select("importance, COUNT(*) as count").Group("importance").Scan(&importanceStats)

	return map[string]interface{}{
		"total_assets":       totalAssets,
		"active_assets":      activeAssets,
		"inactive_assets":    inactiveAssets,
		"maintenance_assets": maintenanceAssets,
		"type_stats":         typeStats,
		"importance_stats":   importanceStats,
	}, nil
}

// CreateAssetGroup 创建资产组
func (s *AssetService) CreateAssetGroup(name, description string, parentID *uint, createdBy uint) (*models.AssetGroup, error) {
	db := Init.GetDB()

	// 检查名称是否已存在
	var existGroup models.AssetGroup
	if err := db.Where("name = ?", name).First(&existGroup).Error; err == nil {
		return nil, errors.New("资产组名称已存在")
	}

	// 验证父级资产组是否存在(如果指定)
	level := 1
	if parentID != nil {
		var parentGroup models.AssetGroup
		if err := db.Where("id = ?", *parentID).First(&parentGroup).Error; err != nil {
			return nil, errors.New("父级资产组不存在")
		}
		level = parentGroup.Level + 1
	}

	assetGroup := models.AssetGroup{
		Name:        name,
		Description: description,
		ParentID:    parentID,
		Level:       level,
		Status:      1,
		CreatedBy:   createdBy,
	}

	if err := db.Create(&assetGroup).Error; err != nil {
		return nil, errors.New("创建资产组失败")
	}

	return &assetGroup, nil
}

// GetAssetGroups 获取资产组列表
func (s *AssetService) GetAssetGroups() ([]models.AssetGroup, error) {
	db := Init.GetDB()

	var groups []models.AssetGroup
	if err := db.Preload("Parent").Preload("Children").Preload("Creator").Order("level, sort, id").Find(&groups).Error; err != nil {
		return nil, errors.New("查询资产组失败")
	}

	return groups, nil
}

// addAuditLog 添加审计日志
func (s *AssetService) addAuditLog(assetID uint, action, before, after string, userID uint, ip, userAgent string) {
	db := Init.GetDB()

	log := models.AssetAuditLog{
		AssetID:   assetID,
		Action:    action,
		Before:    before,
		After:     after,
		UserID:    userID,
		IP:        ip,
		UserAgent: userAgent,
	}

	db.Create(&log)
}
