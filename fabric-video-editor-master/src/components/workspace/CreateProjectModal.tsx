"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';
import { projectFirestore } from '@/utils/firebaseConfig';
import { Project } from '@/types/project';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (projectId: string) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated
}) => {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      setError('You must be logged in to create a project');
      return;
    }

    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const timestamp = Date.now();
      // 创建符合 Project 类型的对象，但不包含 id（由 Firestore 生成）
      const newProject: Omit<Project, 'id'> = {
        name: projectName.trim(),
        description: projectDescription.trim(),
        createdAt: timestamp,
        updatedAt: timestamp,
        ownerId: currentUser.uid,
        ownerName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
        collaborators: {},
        thumbnailUrl: ''
      };

      // 使用 Firestore 创建项目
      console.log('Creating new project:', newProject);

      let projectId;
      try {
        // 使用 addDoc 创建项目
        const docRef = await addDoc(collection(projectFirestore, 'projects'), newProject);
        projectId = docRef.id;
        console.log('Project created with ID:', projectId);
      } catch (error) {
        console.error('Error in project creation:', error);
        throw error;
      }

      // 重置表单
      setProjectName('');
      setProjectDescription('');

      // 关闭模态框
      onClose();

      // 回调通知父组件
      if (onProjectCreated && projectId) {
        onProjectCreated(projectId);
      }

      // 可选：直接导航到新项目的编辑页面
      if (projectId) {
        router.push(`/editor/${projectId}`);
      }
    } catch (err) {
      console.error('Error creating project:', err);
      setError('Failed to create project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-white mb-4">Create New Project</h2>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateProject}>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter project name"
              required
              disabled={isLoading}
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Description (optional)
            </label>
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter project description"
              rows={3}
              disabled={isLoading}
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
