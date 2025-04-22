'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ProjectCard } from '@/components/workspace/ProjectCard';
import { CreateProjectModal } from '@/components/workspace/CreateProjectModal';
import { Project } from '@/types/project';
import { fetchUserProjects, fetchSharedProjects } from '@/services/projectService';
import { UserMenu } from '@/components/common/UserMenu';

export default function WorkspacePage() {
    const { currentUser } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [sharedProjects, setSharedProjects] = useState<Project[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sharedLoading, setSharedLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sharedError, setSharedError] = useState<string | null>(null);

    // load user projects
    const loadProjects = useCallback(async () => {
        if (!currentUser) return;

        setLoading(true);
        setError(null);

        try {
            const userProjects = await fetchUserProjects(currentUser.uid, currentUser.email || '');
            setProjects(userProjects);
        } catch (err) {
            setError('Failed to load projects. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    const loadSharedProjects = useCallback(async () => {
        if (!currentUser) return;

        setSharedLoading(true);
        setSharedError(null);

        try {
            const shared = await fetchSharedProjects(currentUser.uid, currentUser.email || '');
            setSharedProjects(shared);
        } catch (err) {
            setSharedError('Failed to load shared projects. Please try again.');
        } finally {
            setSharedLoading(false);
        }
    }, [currentUser]);

    // load projects when user is loaded
    useEffect(() => {
        if (currentUser) {
            loadProjects();
            loadSharedProjects();
        }
    }, [currentUser, loadProjects, loadSharedProjects]);

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
                <h1 className="text-3xl font-bold mb-6">Please sign in to access your workspace</h1>
                <Link
                    href="/login"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Sign In
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <header className="w-full py-6 px-8 flex justify-between items-center bg-black">
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    Cloud Video Editor
                </div>
                <div className="flex gap-4 items-center">
                    <UserMenu />
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium text-center hover:opacity-90 transition-opacity"
                    >
                        Create New Project
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto py-12 px-4">
                {/* My Projects Section */}
                <section className="mb-16">
                    <h1 className="text-3xl font-bold mb-8">My Projects</h1>

                    {error && (
                        <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-6">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="bg-gray-800 rounded-lg p-8 text-center">
                            <h2 className="text-xl font-semibold mb-4">No projects found</h2>
                            <p className="text-gray-400 mb-6">Create your first video project to get started</p>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Create New Project
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {projects.map(project => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    onDelete={loadProjects}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* Shared Projects Section */}
                <section>
                    <h1 className="text-3xl font-bold mb-8">Shared With Me</h1>

                    {sharedError && (
                        <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-6">
                            {sharedError}
                        </div>
                    )}

                    {sharedLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                    ) : sharedProjects.length === 0 ? (
                        <div className="bg-gray-800 rounded-lg p-8 text-center">
                            <h2 className="text-xl font-semibold mb-4">No shared projects</h2>
                            <p className="text-gray-400">Projects shared with you will appear here</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {sharedProjects.map(project => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    onDelete={loadSharedProjects}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </main>

            {/* Create Project Modal */}
            {isCreateModalOpen && (
                <CreateProjectModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onProjectCreated={loadProjects}
                />
            )}
        </div>
    );
}
