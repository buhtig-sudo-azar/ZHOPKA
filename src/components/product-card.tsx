'use client'

import React from 'react'

interface ProductCardProps {
  productImage: string | null // base64 data URL of the product photo
  title: string
  subtitle: string
  features: string[]
  style: string
  badge?: string
}

const STYLE_CONFIGS: Record<string, {
  bg: string
  cardBg: string
  titleColor: string
  subtitleColor: string
  accentColor: string
  badgeBg: string
  badgeColor: string
  featureBg: string
  featureColor: string
  featureBorder: string
  separatorColor: string
  imageShadow: string
  imageRadius: string
  imageBorder: string
}> = {
  minimalism: {
    bg: 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)',
    cardBg: '#ffffff',
    titleColor: '#1a1a1a',
    subtitleColor: '#666666',
    accentColor: '#1a1a1a',
    badgeBg: '#1a1a1a',
    badgeColor: '#ffffff',
    featureBg: '#f5f5f5',
    featureColor: '#333333',
    featureBorder: '#e0e0e0',
    separatorColor: '#e0e0e0',
    imageShadow: '0 8px 32px rgba(0,0,0,0.08)',
    imageRadius: '8px',
    imageBorder: '1px solid #eee',
  },
  premium: {
    bg: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    cardBg: '#1a1a2e',
    titleColor: '#f0e6d3',
    subtitleColor: '#b8a88a',
    accentColor: '#d4a853',
    badgeBg: 'linear-gradient(135deg, #d4a853, #f0c674)',
    badgeColor: '#1a1a2e',
    featureBg: 'rgba(212,168,83,0.15)',
    featureColor: '#f0e6d3',
    featureBorder: 'rgba(212,168,83,0.4)',
    separatorColor: 'rgba(212,168,83,0.3)',
    imageShadow: '0 12px 40px rgba(212,168,83,0.2)',
    imageRadius: '12px',
    imageBorder: '2px solid rgba(212,168,83,0.3)',
  },
  fun: {
    bg: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 50%, #48dbfb 100%)',
    cardBg: '#ffffff',
    titleColor: '#2d3436',
    subtitleColor: '#636e72',
    accentColor: '#e17055',
    badgeBg: 'linear-gradient(135deg, #e17055, #ff6b6b)',
    badgeColor: '#ffffff',
    featureBg: '#fff3e0',
    featureColor: '#e17055',
    featureBorder: '#ffccbc',
    separatorColor: '#ffccbc',
    imageShadow: '0 8px 24px rgba(225,112,85,0.2)',
    imageRadius: '16px',
    imageBorder: '3px solid #ffccbc',
  },
  elegant: {
    bg: 'linear-gradient(180deg, #faf8f5 0%, #f0ece4 100%)',
    cardBg: '#faf8f5',
    titleColor: '#3d3d3d',
    subtitleColor: '#8a7e72',
    accentColor: '#a68b6b',
    badgeBg: '#a68b6b',
    badgeColor: '#faf8f5',
    featureBg: 'rgba(166,139,107,0.1)',
    featureColor: '#6b5d4f',
    featureBorder: 'rgba(166,139,107,0.3)',
    separatorColor: 'rgba(166,139,107,0.25)',
    imageShadow: '0 6px 24px rgba(166,139,107,0.15)',
    imageRadius: '4px',
    imageBorder: '1px solid rgba(166,139,107,0.2)',
  },
  sporty: {
    bg: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 50%, #2d2d2d 100%)',
    cardBg: '#0c0c0c',
    titleColor: '#ffffff',
    subtitleColor: '#aaaaaa',
    accentColor: '#00ff88',
    badgeBg: '#00ff88',
    badgeColor: '#0c0c0c',
    featureBg: 'rgba(0,255,136,0.1)',
    featureColor: '#00ff88',
    featureBorder: 'rgba(0,255,136,0.3)',
    separatorColor: 'rgba(0,255,136,0.2)',
    imageShadow: '0 8px 32px rgba(0,255,136,0.15)',
    imageRadius: '8px',
    imageBorder: '2px solid rgba(0,255,136,0.2)',
  },
  strict: {
    bg: 'linear-gradient(180deg, #f5f5f5 0%, #e8e8e8 100%)',
    cardBg: '#ffffff',
    titleColor: '#1a1a1a',
    subtitleColor: '#555555',
    accentColor: '#0066cc',
    badgeBg: '#0066cc',
    badgeColor: '#ffffff',
    featureBg: '#eef4fb',
    featureColor: '#004499',
    featureBorder: '#b3d4fc',
    separatorColor: '#cccccc',
    imageShadow: '0 4px 16px rgba(0,0,0,0.1)',
    imageRadius: '4px',
    imageBorder: '1px solid #ddd',
  },
}

export default function ProductCard({ productImage, title, subtitle, features, style, badge }: ProductCardProps) {
  const s = STYLE_CONFIGS[style] || STYLE_CONFIGS.minimalism

  return (
    <div
      style={{
        width: '900px',
        height: '1200px',
        background: s.bg,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Top accent line */}
      <div style={{
        height: '4px',
        background: typeof s.accentColor === 'string' && !s.accentColor.includes('gradient')
          ? s.accentColor
          : '#333',
        flexShrink: 0,
      }} />

      {/* Badge */}
      {badge && (
        <div style={{
          position: 'absolute',
          top: '24px',
          right: '32px',
          background: s.badgeBg,
          color: s.badgeColor,
          padding: '8px 20px',
          borderRadius: '6px',
          fontSize: '18px',
          fontWeight: 700,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          {badge}
        </div>
      )}

      {/* Product Image Area */}
      <div style={{
        flex: '1 1 60%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 48px 24px',
        minHeight: 0,
      }}>
        {productImage ? (
          <img
            src={productImage}
            alt={title}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: s.imageRadius,
              boxShadow: s.imageShadow,
              border: s.imageBorder,
            }}
          />
        ) : (
          <div style={{
            width: '80%',
            height: '80%',
            background: 'rgba(128,128,128,0.1)',
            borderRadius: s.imageRadius,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: '24px',
          }}>
            Фото товара
          </div>
        )}
      </div>

      {/* Separator */}
      <div style={{
        margin: '0 48px',
        height: '2px',
        background: s.separatorColor,
        flexShrink: 0,
      }} />

      {/* Text Content Area */}
      <div style={{
        flex: '0 0 auto',
        padding: '28px 48px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {/* Title */}
        <div style={{
          fontSize: '36px',
          fontWeight: 800,
          color: s.titleColor,
          lineHeight: 1.2,
          letterSpacing: '-0.5px',
          paddingRight: badge ? '140px' : '0',
        }}>
          {title || 'Название товара'}
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: '22px',
          fontWeight: 400,
          color: s.subtitleColor,
          lineHeight: 1.4,
          paddingRight: badge ? '140px' : '0',
        }}>
          {subtitle || 'Подзаголовок'}
        </div>

        {/* Features */}
        {features.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            marginTop: '8px',
          }}>
            {features.map((feature, i) => (
              <div
                key={i}
                style={{
                  background: s.featureBg,
                  color: s.featureColor,
                  border: `1px solid ${s.featureBorder}`,
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '16px',
                  fontWeight: 600,
                  lineHeight: 1.3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: typeof s.accentColor === 'string' && !s.accentColor.includes('gradient')
                    ? s.accentColor
                    : '#333',
                  flexShrink: 0,
                }} />
                {feature}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
