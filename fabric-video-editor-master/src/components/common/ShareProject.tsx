import React, { useState } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { projectFirestore } from '@/utils/firebaseConfig';
import { Project } from '@/types/project';

interface ShareProjectProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  currentUserRole: 'owner' | 'editor' | 'viewer' | null;
}

interface UserData {
  uid: string;
  email: string;
  displayName?: string;
}

export const ShareProject: React.FC<ShareProjectProps> = ({
  isOpen,
  onClose,
  projectId,
  currentUserRole,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleClose = () => {
    setEmail('');
    setError(null);
    setSuccessMessage(null);
    onClose();
  };

  const handleShare = async () => {
    if (!email) {
      setError('Please enter an email address');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (currentUserRole !== 'owner') {
      setError('Only the project owner can share the project');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // 1. get project document
      const projectRef = doc(projectFirestore, 'projects', projectId);
      const projectSnap = await getDoc(projectRef);

      if (!projectSnap.exists()) {
        throw new Error('Project does not exist');
      }

      const projectData = projectSnap.data() as Project;
      const normalizedEmail = email.toLowerCase();

      // make sure collaborators field exists
      const currentCollaborators = projectData.collaborators || {};

      // check if the user is already a project collaborator
      if (Object.values(currentCollaborators).some(
        collab => collab?.email && collab.email.toLowerCase() === normalizedEmail
      )) {
        throw new Error('The user is already a project collaborator');
      }

      // 2. update collaborators field
      const updatedCollaborators = {
        ...currentCollaborators,
        [normalizedEmail]: {
          role: role,
          email: normalizedEmail,
          name: normalizedEmail.split('@')[0],
          addedAt: new Date().toISOString()
        }
      };

      // 3. update project document
      await updateDoc(projectRef, {
        collaborators: updatedCollaborators
      });

      setSuccessMessage('Project shared successfully');
      setEmail('');
    } catch (err) {
      console.error('Error sharing project:', err);
      setError(err instanceof Error ? err.message : 'Failed to share project');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4 text-white">Share Project</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Please enter the email address of the collaborator"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Permission
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>

        {error && (
          <div className="mb-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 text-green-400 text-sm">
            {successMessage}
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={loading || currentUserRole !== 'owner'}
            className={`px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              (loading || currentUserRole !== 'owner') && 'opacity-50 cursor-not-allowed'
            }`}
          >
            {loading ? 'Sharing...' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  );
};
