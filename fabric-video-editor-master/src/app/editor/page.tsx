'use client';

import dynamic from 'next/dynamic'
import ProtectedRoute from '@/components/ProtectedRoute';

const DynmicEditor = dynamic(() => import('../../components/Editor').then(a => a.EditorWithStore), {
  ssr: false,
})

function EditorPage() {
  return (
    <ProtectedRoute>
      <DynmicEditor />
    </ProtectedRoute>
  );
}

EditorPage.displayName = "EditorPage";

export default EditorPage;
