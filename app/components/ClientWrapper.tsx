'use client';

import dynamic from 'next/dynamic';

const FileProcessor = dynamic(() => import('./FileProcessor'), {
  ssr: false,
});

export default function ClientWrapper() {
  return <FileProcessor />;
}