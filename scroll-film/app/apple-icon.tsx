import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Apple touch icon — same studio mark as icon.svg */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0c0a09',
          borderRadius: 40,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 124,
            height: 124,
            borderRadius: 999,
            border: '3px solid rgba(43,40,46,0.22)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 124,
            height: 124,
            borderRadius: 999,
            border: '5px solid transparent',
            borderTopColor: '#c9a063',
            borderRightColor: '#c9a063',
            transform: 'rotate(-25deg)',
          }}
        />
        <div
          style={{
            fontSize: 84,
            fontWeight: 600,
            color: '#f2ebe1',
            letterSpacing: '-0.04em',
            fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
            lineHeight: 1,
          }}
        >
          O
        </div>
      </div>
    ),
    { ...size },
  );
}
