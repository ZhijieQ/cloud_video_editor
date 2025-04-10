'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProjectCard } from '@/components/workspace/ProjectCard';
import { CreateProjectModal } from '@/components/workspace/CreateProjectModal';
import { Project } from '@/types/project';
import { fetchUserProjects } from '@/services/projectService';

export default function WorkspacePage() {
    const { currentUser, logout, getProfilePhotoURL } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const profilePhotoURL = getProfilePhotoURL();

    useEffect(() => {
        if (currentUser) {
            loadProjects();
        }
    }, [currentUser]);

    // process click outside to close user menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (showUserMenu && !target.closest('.user-menu-container')) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showUserMenu]);

    const loadProjects = async () => {
        if (!currentUser) return;
        const userProjects = await fetchUserProjects(currentUser.uid);
        setProjects(userProjects);
    };

    return (
        <main className="flex min-h-screen flex-col text-white">
            <header className="w-full py-6 px-8 flex justify-between items-center bg-black">
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    Cloud Video Editor
                </div>
                <div className="flex gap-4 items-center">
                    {currentUser ? (
                        <>
                            <div className="relative user-menu-container">
                                <div
                                    className="flex items-center gap-2 cursor-pointer"
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                >
                                    {profilePhotoURL ? (
                                        <>
                                            <img
                                                src={profilePhotoURL}
                                                alt="User Avatar"
                                                className="w-8 h-8 rounded-full border border-gray-600 hover:border-blue-400 transition-colors"
                                                onError={(e) => {
                                                    // when image load failed, show fallback option
                                                    e.currentTarget.style.display = 'none';
                                                    // Show fallback avatar
                                                    const fallbackAvatar = document.getElementById(`fallback-avatar-${currentUser.uid}`);
                                                    if (fallbackAvatar) {
                                                        fallbackAvatar.style.display = 'flex';
                                                    }
                                                }}
                                            />
                                            <div
                                                id={`fallback-avatar-${currentUser.uid}`}
                                                className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium hover:bg-blue-600 transition-colors"
                                                style={{ display: 'none' }}
                                            >
                                                {(currentUser.displayName || currentUser.email || '?')[0].toUpperCase()}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium hover:bg-blue-600 transition-colors">
                                            {(currentUser.displayName || currentUser.email || '?')[0].toUpperCase()}
                                        </div>
                                    )}
                                    <span className="text-sm text-gray-300">
                    {currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'User')}
                  </span>
                                </div>

                                {/* User dropdown menu */}
                                {showUserMenu && (
                                    <div className="absolute right-0 top-10 w-48 py-2 mt-2 bg-white rounded-md shadow-xl z-20">
                                        <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                                            <div className="font-medium">{currentUser.displayName || 'User'}</div>
                                            <div className="text-xs text-gray-500 truncate">{currentUser.email}</div>
                                        </div>

                                        <Link href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                            Profile Settings
                                        </Link>

                                        <button
                                            onClick={() => {
                                                logout();
                                                setShowUserMenu(false);
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100"
                                        >
                                            Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                            <Link
                                href="/workspace"
                                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium text-center hover:opacity-90 transition-opacity"
                            >
                                My WorkSpace
                            </Link>
                            <button
                                onClick={logout}
                                className="px-4 py-2 text-sm font-medium bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className="px-4 py-2 text-sm font-medium text-white hover:text-blue-400 transition-colors"
                            >
                                Login
                            </Link>
                            <Link
                                href="/signup"
                                className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:opacity-90 transition-opacity"
                            >
                                Signup
                            </Link>
                        </>
                    )}
                </div>
            </header>
            <div className="min-h-screen bg-black text-white p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-3xl font-bold">My Projects</h1>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
                        >
                            Create New Project
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onDelete={loadProjects}
                            />
                        ))}
                    </div>
                </div>

                <CreateProjectModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onProjectCreated={loadProjects}
                />
            </div>
        </main>
    );
}
