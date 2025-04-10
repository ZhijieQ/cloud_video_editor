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

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this project?')) return;
        await deleteProject(project.id);
        onDelete();
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold">{project.name}</h3>
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
                    Last updated: {new Date(project.updatedAt).toLocaleDateString()}
                </div>
            </div>
        </div>
    );
};
