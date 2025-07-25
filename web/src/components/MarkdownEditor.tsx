'use client';

import React, { useState, useRef } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Toast } from '@douyinfe/semi-ui';
import { userApi } from '@/lib/api';
import '@uiw/react-md-editor/markdown-editor.css';

interface MarkdownEditorProps {
  value?: string;
  onChange?: (value?: string) => void;
  placeholder?: string;
  height?: number;
  disabled?: boolean;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = '请输入内容...',
  height = 300,
  disabled = false
}: MarkdownEditorProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 图片上传处理
  const handleImageUpload = async (file: File): Promise<string> => {
    setUploading(true);
    try {
      const response = await userApi.uploadVulnImage(file);
      if (response.code === 200 && response.data) {
        Toast.success('图片上传成功');
        return response.data.image_url;
      } else {
        Toast.error(response.msg || '图片上传失败');
        throw new Error(response.msg || '图片上传失败');
      }
    } catch (error: any) {
      console.error('图片上传失败:', error);
      Toast.error(error?.response?.data?.msg || '图片上传失败');
      throw error;
    } finally {
      setUploading(false);
    }
  };



  // 处理文件选择
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      Toast.error('请选择图片文件');
      return;
    }

    // 检查文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      Toast.error('图片大小不能超过5MB');
      return;
    }

    try {
      const imageUrl = await handleImageUpload(file);
      
      // 插入markdown图片语法到编辑器
      const imageMarkdown = `\n![${file.name}](${imageUrl})\n`;
      const newValue = (value || '') + imageMarkdown;
      onChange?.(newValue);
      
    } catch (error) {
      console.error('插入图片失败:', error);
    }

    // 重置file input
    event.target.value = '';
  };

  return (
    <div style={{ position: 'relative' }}>
      <MDEditor
        value={value}
        onChange={onChange}
        height={height}
        preview="edit"
        data-color-mode="light"
        textareaProps={{
          placeholder,
          disabled,
          style: {
            fontSize: 14,
            lineHeight: 1.6,
            fontFamily: 'var(--semi-font-family-regular)',
          },
        }}
      />
      
      {/* 隐藏的文件选择器 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        disabled={uploading || disabled}
      />
      
      {/* 图片上传按钮 */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 100,
      }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || disabled}
          style={{
            padding: '6px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title="上传图片"
        >
          <svg viewBox="0 0 1024 1024" width="14" height="14" fill="currentColor">
            <path d="M928 160H96c-17.7 0-32 14.3-32 32v640c0 17.7 14.3 32 32 32h832c17.7 0 32-14.3 32-32V192c0-17.7-14.3-32-32-32zM338 304c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64zm513.9 437.1l-165.4-165.4c-3.1-3.1-8.2-3.1-11.3 0L580.7 671.2c-3.1 3.1-8.2 3.1-11.3 0L359.8 461.6c-3.1-3.1-8.2-3.1-11.3 0L146.3 663.8c-1.5 1.5-2.3 3.5-2.3 5.7V832c0 17.7 14.3 32 32 32h672c17.7 0 32-14.3 32-32v-97.8c0-2.1-0.8-4.1-2.1-5.6z"/>
          </svg>
          图片
        </button>
      </div>
      
      {uploading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '6px',
          fontSize: '14px',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid #fff',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          上传中...
        </div>
      )}
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
} 