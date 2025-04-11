import { Project } from '@/types/project';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { deleteProject } from '@/services/projectService';

interface ProjectCardProps {
    project: Project;
    onDelete: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onDelete }) => {
    const { currentUser } = useAuth();
    const isOwner = currentUser?.uid === project.ownerId;

    // check if the current user is a collaborator
    const userRole = currentUser?.email && project.collaborators?.[currentUser.email.toLowerCase()]?.role;
    const isCollaborator = !!userRole;

    // get user role display text
    const getRoleText = () => {
        if (isOwner) return 'Owner';
        if (userRole === 'editor') return 'Editor';
        if (userRole === 'viewer') return 'Viewer';
        return '';
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this project?')) return;
        await deleteProject(project.id);
        onDelete();
    };

    // if the current user is neither the owner nor a collaborator, do not display the project card
    if (!isOwner && !isCollaborator) {
        return null;
    }

    return (
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">{project.name}</h3>
                    <span className="text-sm font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        {getRoleText()}
                    </span>
                </div>
                {isOwner && (
                    <button
                        onClick={handleDelete}
                        className="text-red-500 hover:text-red-600"
                    >
                        Delete
                    </button>
                )}
            </div>

            <p className="text-gray-400 mb-4">{project.description}</p>

            <div className="flex justify-between items-center">
                <Link
                    href={`/editor/${project.id}`}
                    className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                >
                    Open Editor
                </Link>

                <div className="text-sm text-gray-400">
                    Created: {
                        (() => {
                            const date = new Date(project.updatedAt);
                            const hours = date.getHours().toString().padStart(2, '0');
                            const minutes = date.getMinutes().toString().padStart(2, '0');
                            const month = (date.getMonth() + 1).toString().padStart(2, '0');
                            const day = date.getDate().toString().padStart(2, '0');
                            const year = date.getFullYear();

                            return `${month}/${day}/${year} ${hours}:${minutes}`;
                        })() as string
                    }
                </div>
            </div>
        </div>
    );
};
