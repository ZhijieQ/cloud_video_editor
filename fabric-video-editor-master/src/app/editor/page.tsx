'use client';

import dynamic from 'next/dynamic'
import ProtectedRoute from '@/components/ProtectedRoute';
import { useParams } from 'next/navigation';

const DynmicEditor = dynamic(() => import('../../components/Editor').then(a => a.EditorWithStore), {
  ssr: false,
});

export default function EditorPage() {
    const { projectId } = useParams();

    return (
    <ProtectedRoute>
      <DynmicEditor projectId={projectId as string}/>
    </ProtectedRoute>
  );
}
