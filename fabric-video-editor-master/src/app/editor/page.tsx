'use client';

import dynamic from 'next/dynamic'
import ProtectedRoute from '@/components/ProtectedRoute';

const DynmicEditor = dynamic(() => import('../../components/Editor').then(a => a.EditorWithStore), {
  ssr: false,
});

export default function EditorPage() {
    const  projectId  = 'global-project';

    return (
    <ProtectedRoute>
      <DynmicEditor projectId={projectId as string}/>
    </ProtectedRoute>
  );
}
