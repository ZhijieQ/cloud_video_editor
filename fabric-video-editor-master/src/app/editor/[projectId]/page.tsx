"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { projectFirestore } from '@/utils/firebaseConfig';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Project } from '@/types/project';

const DynamicEditor = dynamic(() => import('@/components/Editor').then(a => a.EditorWithStore), {
  ssr: false,
});

export default function EditorPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'editor' | 'viewer' | null>(null);

  // get project info
  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    if (!projectId) {
      setError('Project ID is missing');
      setLoading(false);
      return;
    }

    const fetchProject = async () => {
      setLoading(true);
      setError(null);

      try {
        const projectRef = doc(projectFirestore, 'projects', projectId);
        const snapshot = await getDoc(projectRef);
        if (snapshot.exists()) {
          const projectData = snapshot.data() as Omit<Project, 'id'>;
          // create a new object that includes all original data and the id
          const projectWithId: Project = {
            ...projectData,
            id: snapshot.id
          };
          setProject(projectWithId);

          // get user role
          if (projectData.ownerId === currentUser.uid) {
            setUserRole('owner');
          } else if (
            projectData.collaborators &&
            projectData.collaborators[currentUser.email?.toLowerCase() || ''] &&
            projectData.collaborators[currentUser.email?.toLowerCase() || ''].role === 'editor'
          ) {
            setUserRole('editor');
          } else if (
            projectData.collaborators &&
            projectData.collaborators[currentUser.email?.toLowerCase() || ''] &&
            projectData.collaborators[currentUser.email?.toLowerCase() || ''].role === 'viewer'
          ) {
            setUserRole('viewer');
          } else {
            setError('You do not have permission to access this project');
            setTimeout(() => {
              router.push('/workspace');
            }, 3000);
          }
        } else {
          setError('Project not found');
        }
      } catch (err) {
        console.error('Error fetching project:', err);
        setError(`Failed to load project: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [currentUser, projectId, router]);

  if (!currentUser) {
    return <div className="flex justify-center items-center h-screen">Redirecting to login...</div>;
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p>Loading project...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-900 text-white">
        <div className="bg-red-500/20 border border-red-500 text-red-300 px-6 py-4 rounded-lg mb-4">
          {error}
        </div>
        <Link href="/workspace" className="text-blue-400 hover:underline">
          Return to Workspace
        </Link>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-900 text-white">
        <div className="text-xl mb-4">Project not found</div>
        <Link href="/workspace" className="text-blue-400 hover:underline">
          Return to Workspace
        </Link>
      </div>
    );
  }

  return (
    <DynamicEditor
      projectId={projectId}
      projectName={project.name}
      userRole={userRole}
      ownerId={project.ownerId}
    />
  );
}
