// 密码验证工具
import { authApi } from '@/lib/api';

// 密码策略接口
export interface PasswordPolicy {
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_number: boolean;
  require_special: boolean;
}

// 密码验证结果接口
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
  score: number; // 0-100
}

// 缓存密码策略
let cachedPolicy: PasswordPolicy | null = null;
let cachedRequirements: string[] | null = null;

// 获取密码策略
export const getPasswordPolicy = async (): Promise<{ policy: PasswordPolicy; requirements: string[] }> => {
  if (cachedPolicy && cachedRequirements) {
    return { policy: cachedPolicy, requirements: cachedRequirements };
  }

  try {
    const response = await authApi.getPasswordPolicy();
    if (response.code === 200) {
      cachedPolicy = response.data.policy;
      cachedRequirements = response.data.requirements;
      return { policy: cachedPolicy, requirements: cachedRequirements };
    }
  } catch (error) {
    console.error('获取密码策略失败:', error);
  }

  // 返回默认策略
  const defaultPolicy: PasswordPolicy = {
    min_length: 8,
    require_uppercase: true,
    require_lowercase: true,
    require_number: true,
    require_special: false,
  };

  const defaultRequirements = [
    '密码长度至少 8 位',
    '包含至少一个大写字母 (A-Z)',
    '包含至少一个小写字母 (a-z)',
    '包含至少一个数字 (0-9)',
  ];

  return { policy: defaultPolicy, requirements: defaultRequirements };
};

// 验证密码
export const validatePassword = async (password: string): Promise<PasswordValidationResult> => {
  const { policy } = await getPasswordPolicy();
  const errors: string[] = [];
  let score = 0;

  // 检查长度
  if (password.length < policy.min_length) {
    errors.push(`密码长度不能少于 ${policy.min_length} 位`);
  } else {
    score += 20;
    // 长度加分
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;
  }

  // 检查大写字母
  if (policy.require_uppercase) {
    if (!/[A-Z]/.test(password)) {
      errors.push('密码必须包含至少一个大写字母');
    } else {
      score += 15;
    }
  }

  // 检查小写字母
  if (policy.require_lowercase) {
    if (!/[a-z]/.test(password)) {
      errors.push('密码必须包含至少一个小写字母');
    } else {
      score += 15;
    }
  }

  // 检查数字
  if (policy.require_number) {
    if (!/[0-9]/.test(password)) {
      errors.push('密码必须包含至少一个数字');
    } else {
      score += 15;
    }
  }

  // 检查特殊字符
  if (policy.require_special) {
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
      errors.push('密码必须包含至少一个特殊字符');
    } else {
      score += 15;
    }
  }

  // 额外的强度检查
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

  // 字符类型多样性加分
  const charTypes = [hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
  score += charTypes * 5;

  // 检查常见弱密码模式
  const weakPatterns = [
    /^(.)\1+$/, // 重复字符
    /123456|654321|abcdef|qwerty|password|admin/i, // 常见弱密码
    /^[a-z]+$|^[A-Z]+$|^[0-9]+$/, // 单一字符类型
  ];

  for (const pattern of weakPatterns) {
    if (pattern.test(password)) {
      score -= 20;
      break;
    }
  }

  // 确保分数在0-100范围内
  score = Math.max(0, Math.min(100, score));

  // 确定强度等级
  let strength: 'weak' | 'medium' | 'strong';
  if (score < 40) {
    strength = 'weak';
  } else if (score < 70) {
    strength = 'medium';
  } else {
    strength = 'strong';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score,
  };
};

// 获取密码强度颜色
export const getPasswordStrengthColor = (strength: 'weak' | 'medium' | 'strong'): string => {
  switch (strength) {
    case 'weak':
      return '#ff4d4f';
    case 'medium':
      return '#fa8c16';
    case 'strong':
      return '#52c41a';
    default:
      return '#d9d9d9';
  }
};

// 获取密码强度文本
export const getPasswordStrengthText = (strength: 'weak' | 'medium' | 'strong'): string => {
  switch (strength) {
    case 'weak':
      return '弱';
    case 'medium':
      return '中等';
    case 'strong':
      return '强';
    default:
      return '未知';
  }
};

// 清除缓存（用于系统设置更新后）
export const clearPasswordPolicyCache = (): void => {
  cachedPolicy = null;
  cachedRequirements = null;
};
