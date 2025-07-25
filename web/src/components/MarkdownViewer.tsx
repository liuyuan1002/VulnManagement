'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Modal } from '@douyinfe/semi-ui';
import { IconClose } from '@douyinfe/semi-icons';
import { resolveImageUrl } from '@/lib/api';

interface MarkdownViewerProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function MarkdownViewer({ content, className, style }: MarkdownViewerProps) {
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string }>({ src: '', alt: '' });

  // 处理图片点击
  const handleImageClick = (src: string, alt: string) => {
    const resolvedSrc = resolveImageUrl(src);
    setSelectedImage({ src: resolvedSrc, alt });
    setImageModalVisible(true);
  };

  // 自定义图片渲染组件
  const ImageRenderer = ({ src, alt, ...props }: any) => {
    const resolvedSrc = resolveImageUrl(src || '');
    
    return (
      <img
        src={resolvedSrc}
        alt={alt}
        {...props}
        style={{
          maxWidth: '100%',
          height: 'auto',
          cursor: 'pointer',
          borderRadius: '4px',
          margin: '8px 0',
          transition: 'transform 0.2s ease',
        }}
        onClick={() => handleImageClick(src || '', alt || '')}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.02)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        title="点击查看大图"
      />
    );
  };

  // 自定义代码块渲染
  const CodeRenderer = ({ children, className, ...props }: any) => {
    const isInline = !className;
    
    if (isInline) {
      return (
        <code
          style={{
            background: '#f6f8fa',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '0.9em',
            color: '#d73a49',
          }}
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <pre
        style={{
          background: '#f6f8fa',
          padding: '16px',
          borderRadius: '6px',
          overflow: 'auto',
          fontSize: '0.9em',
          lineHeight: '1.45',
        }}
      >
        <code {...props}>{children}</code>
      </pre>
    );
  };

  // 自定义链接渲染
  const LinkRenderer = ({ href, children, ...props }: any) => {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#0366d6',
          textDecoration: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.textDecoration = 'underline';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.textDecoration = 'none';
        }}
        {...props}
      >
        {children}
      </a>
    );
  };

  // 自定义表格渲染
  const TableRenderer = ({ children, ...props }: any) => {
    return (
      <div style={{ overflow: 'auto', margin: '16px 0' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #d0d7de',
          }}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  };

  const TableHeaderRenderer = ({ children, ...props }: any) => {
    return (
      <th
        style={{
          padding: '8px 12px',
          border: '1px solid #d0d7de',
          background: '#f6f8fa',
          fontWeight: 'bold',
          textAlign: 'left',
        }}
        {...props}
      >
        {children}
      </th>
    );
  };

  const TableCellRenderer = ({ children, ...props }: any) => {
    return (
      <td
        style={{
          padding: '8px 12px',
          border: '1px solid #d0d7de',
        }}
        {...props}
      >
        {children}
      </td>
    );
  };

  return (
    <>
      <div
        className={className}
        style={{
          lineHeight: '1.6',
          color: '#24292e',
          fontSize: '14px',
          ...style,
        }}
      >
        <ReactMarkdown
          components={{
            img: ImageRenderer,
            code: CodeRenderer,
            a: LinkRenderer,
            table: TableRenderer,
            th: TableHeaderRenderer,
            td: TableCellRenderer,
            h1: ({ children, ...props }) => (
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '24px 0 16px 0', borderBottom: '1px solid #e1e4e8', paddingBottom: '8px' }} {...props}>
                {children}
              </h1>
            ),
            h2: ({ children, ...props }) => (
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '24px 0 16px 0', borderBottom: '1px solid #e1e4e8', paddingBottom: '8px' }} {...props}>
                {children}
              </h2>
            ),
            h3: ({ children, ...props }) => (
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: '20px 0 12px 0' }} {...props}>
                {children}
              </h3>
            ),
            p: ({ children, ...props }) => (
              <p style={{ margin: '0 0 16px 0' }} {...props}>
                {children}
              </p>
            ),
            blockquote: ({ children, ...props }) => (
              <blockquote
                style={{
                  margin: '0 0 16px 0',
                  padding: '0 16px',
                  borderLeft: '4px solid #dfe2e5',
                  color: '#6a737d',
                }}
                {...props}
              >
                {children}
              </blockquote>
            ),
            ul: ({ children, ...props }) => (
              <ul style={{ margin: '0 0 16px 0', paddingLeft: '24px' }} {...props}>
                {children}
              </ul>
            ),
            ol: ({ children, ...props }) => (
              <ol style={{ margin: '0 0 16px 0', paddingLeft: '24px' }} {...props}>
                {children}
              </ol>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {/* 图片预览弹窗 */}
      <Modal
        visible={imageModalVisible}
        onCancel={() => setImageModalVisible(false)}
        footer={null}
        width="auto"
        style={{ maxWidth: '90vw', maxHeight: '90vh' }}
        bodyStyle={{ padding: 0 }}
        closeIcon={
          <IconClose
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              fontSize: '24px',
              color: '#fff',
              background: 'rgba(0, 0, 0, 0.5)',
              borderRadius: '50%',
              padding: '8px',
              cursor: 'pointer',
              zIndex: 1001,
            }}
          />
        }
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#000',
            maxHeight: '90vh',
            overflow: 'hidden',
          }}
        >
          <img
            src={selectedImage.src}
            alt={selectedImage.alt}
            style={{
              maxWidth: '100%',
              maxHeight: '90vh',
              objectFit: 'contain',
            }}
          />
        </div>
        {selectedImage.alt && (
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0, 0, 0, 0.7)',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            {selectedImage.alt}
          </div>
        )}
      </Modal>
    </>
  );
} 