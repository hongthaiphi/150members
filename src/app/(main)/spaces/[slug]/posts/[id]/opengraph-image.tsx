import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
import { htmlToPlainText } from '@/lib/actions/posts'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const revalidate = 3600

type Params = { slug: string; id: string }

export default async function PostOGImage({ params }: { params: Params }) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('posts')
    .select('title, content, spaces!inner(name, is_private), profiles!author_id(display_name, username)')
    .eq('id', params.id)
    .single()

  const post = data as {
    title: string
    content: string
    spaces: { name: string; is_private: boolean }
    profiles: { display_name: string | null; username: string } | null
  } | null

  const title = post?.title ?? 'Community'
  const spaceName = post?.spaces?.name ?? ''
  const authorName = post?.profiles?.display_name ?? post?.profiles?.username ?? ''
  const description = post ? htmlToPlainText(post.content).slice(0, 130) : ''

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(145deg, #f5f5ff 0%, #eeeeff 50%, #e8e8ff 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '56px 64px',
          fontFamily: '"Segoe UI", system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Decorative top border */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '6px',
          background: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
        }} />

        {/* Space badge */}
        {spaceName && (
          <div style={{
            display: 'flex',
            marginBottom: '28px',
          }}>
            <div style={{
              background: '#ede9fe',
              color: '#4f46e5',
              borderRadius: '999px',
              padding: '6px 18px',
              fontSize: '20px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}>
              {spaceName}
            </div>
          </div>
        )}

        {/* Title */}
        <div style={{
          fontSize: title.length > 70 ? '44px' : title.length > 40 ? '52px' : '60px',
          fontWeight: 700,
          color: '#1e1b4b',
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
          flex: 1,
          display: 'flex',
          alignItems: 'flex-start',
        }}>
          {title.length > 100 ? title.slice(0, 97) + '…' : title}
        </div>

        {/* Description */}
        {description && (
          <div style={{
            fontSize: '22px',
            color: '#6366f1',
            marginBottom: '32px',
            lineHeight: 1.5,
            opacity: 0.8,
          }}>
            {description.length > 130 ? description.slice(0, 127) + '…' : description}
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(99, 102, 241, 0.2)',
          paddingTop: '24px',
        }}>
          {authorName ? (
            <div style={{ fontSize: '20px', color: '#4338ca', fontWeight: 500 }}>
              ✍️ {authorName}
            </div>
          ) : <div />}

          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: 'white',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 800,
            }}>C</div>
            <div style={{ fontSize: '22px', color: '#1e1b4b', fontWeight: 700 }}>
              Community
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
