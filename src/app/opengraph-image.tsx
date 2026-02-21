import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(135deg, rgba(0,113,227,1) 0%, rgba(0,198,255,1) 100%)',
          color: 'white',
          fontSize: 72,
          fontWeight: 800,
          letterSpacing: -2
        }}
      >
        ExportFlow
      </div>
    ),
    size
  );
}

