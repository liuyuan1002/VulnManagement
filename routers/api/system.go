package api

import (
	"net/http"
	"strconv"
	"vulnmain/services"

	"vulnmain/models"

	"github.com/gin-gonic/gin"
)

var systemService = &services.SystemService{}

// GetPublicSystemInfo 获取公开的系统信息（无需认证）
func GetPublicSystemInfo(c *gin.Context) {
	// 获取公开的系统配置
	configs, err := systemService.GetSystemConfigs("", true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  err.Error(),
		})
		return
	}

	// 构建返回数据
	result := make(map[string]interface{})

	// 设置默认值
	result["system_name"] = "VulnMain"
	result["company_name"] = "漏洞管理平台"
	result["version"] = "1.0.0"

	// 从配置中获取实际值
	for _, config := range configs {
		switch config.Key {
		case "system.name":
			result["system_name"] = config.Value
		case "system.company_name":
			result["company_name"] = config.Value
		case "system.version":
			result["version"] = config.Value
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "获取成功",
		"data": result,
	})
}

// GetSystemConfigs 获取系统配置列表
func GetSystemConfigs(c *gin.Context) {
	group := c.Query("group")
	isPublicStr := c.Query("public")
	isPublic := isPublicStr == "true"

	configs, err := systemService.GetSystemConfigs(group, isPublic)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "获取成功",
		"data": configs,
	})
}

// GetSystemConfig 获取单个系统配置
func GetSystemConfig(c *gin.Context) {
	key := c.Param("key")

	config, err := systemService.GetSystemConfig(key)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code": 404,
			"msg":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "获取成功",
		"data": config,
	})
}

// UpdateSystemConfig 更新系统配置
func UpdateSystemConfig(c *gin.Context) {
	key := c.Param("key")

	type UpdateConfigRequest struct {
		Value       string `json:"value" binding:"required"`
		Description string `json:"description"`
	}

	var req UpdateConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "参数错误: " + err.Error(),
		})
		return
	}

	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code": 401,
			"msg":  "用户未认证",
		})
		return
	}

	err := systemService.UpdateSystemConfig(key, req.Value, req.Description)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "更新成功",
	})
}

// CreateSystemConfig 创建系统配置
func CreateSystemConfig(c *gin.Context) {
	type CreateConfigRequest struct {
		Key         string `json:"key" binding:"required"`
		Value       string `json:"value" binding:"required"`
		Type        string `json:"type" binding:"required"`
		Group       string `json:"group" binding:"required"`
		Description string `json:"description"`
		IsPublic    bool   `json:"is_public"`
	}

	var req CreateConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "参数错误: " + err.Error(),
		})
		return
	}

	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code": 401,
			"msg":  "用户未认证",
		})
		return
	}

	config := &models.SystemConfig{
		Key:         req.Key,
		Value:       req.Value,
		Type:        req.Type,
		Group:       req.Group,
		Description: req.Description,
		IsPublic:    req.IsPublic,
	}

	err := systemService.CreateSystemConfig(config)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "创建成功",
	})
}

// DeleteSystemConfig 删除系统配置
func DeleteSystemConfig(c *gin.Context) {
	key := c.Param("key")

	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code": 401,
			"msg":  "用户未认证",
		})
		return
	}

	err := systemService.DeleteSystemConfig(key)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "删除成功",
	})
}

// GetOperationLogs 获取操作日志列表
func GetOperationLogs(c *gin.Context) {
	var req services.LogListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "参数错误: " + err.Error(),
		})
		return
	}

	response, err := systemService.GetOperationLogs(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "获取成功",
		"data": response,
	})
}

// GetSystemStats 获取系统统计
func GetSystemStats(c *gin.Context) {
	stats, err := systemService.GetSystemStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "获取成功",
		"data": stats,
	})
}

// GetNotifications 获取用户通知
func GetNotifications(c *gin.Context) {
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("page_size", "20")

	page, _ := strconv.Atoi(pageStr)
	pageSize, _ := strconv.Atoi(pageSizeStr)

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code": 401,
			"msg":  "用户未认证",
		})
		return
	}

	notifications, total, err := systemService.GetNotifications(userID.(uint), page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "获取成功",
		"data": map[string]interface{}{
			"notifications": notifications,
			"total":         total,
			"page":          page,
			"page_size":     pageSize,
		},
	})
}

// MarkNotificationRead 标记通知已读
func MarkNotificationRead(c *gin.Context) {
	notificationIDStr := c.Param("id")
	notificationID, err := strconv.ParseUint(notificationIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "通知ID格式错误",
		})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code": 401,
			"msg":  "用户未认证",
		})
		return
	}

	err = systemService.MarkNotificationRead(uint(notificationID), userID.(uint))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "标记成功",
	})
}

// GetDictionaries 获取数据字典
func GetDictionaries(c *gin.Context) {
	dictType := c.Query("type")

	dictionaries, err := systemService.GetDictionaries(dictType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "获取成功",
		"data": dictionaries,
	})
}
