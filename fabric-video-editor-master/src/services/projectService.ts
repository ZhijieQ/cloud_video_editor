import { projectFirestore } from '@/utils/firebaseConfig';
import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { Project } from '@/types/project';

export const createProject = async (project: Omit<Project, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(projectFirestore, 'projects'), project);
    return docRef.id;
};

export const fetchUserProjects = async (userId: string, userEmail: string): Promise<Project[]> => {
    try {
        const projectsCollection = collection(projectFirestore, 'projects');

        // Get only projects owned by the user
        const ownerQuery = query(
            projectsCollection,
            where('ownerId', '==', userId)
        );
        const ownerSnapshot = await getDocs(ownerQuery);

        // Create a map to store owned projects
        const ownedProjectsMap = new Map<string, Project>();

        // Add owned projects
        ownerSnapshot.forEach(doc => {
            const data = doc.data() as Omit<Project, 'id'>;
            ownedProjectsMap.set(doc.id, { id: doc.id, ...data } as Project);
        });

        // Sort by update time
        const ownedProjects = Array.from(ownedProjectsMap.values());
        const sortedProjects = ownedProjects.sort((a, b) => b.updatedAt - a.updatedAt);
        return sortedProjects;
    } catch (error) {
        console.error('Error fetching user projects:', error);
        throw error;
    }
};

export const fetchSharedProjects = async (userId: string, userEmail: string): Promise<Project[]> => {
    try {
        const projectsCollection = collection(projectFirestore, 'projects');
        const normalizedEmail = userEmail.toLowerCase();

        // Get all projects to check which ones are shared with the user
        const allProjectsQuery = query(projectsCollection);
        const allProjectsSnapshot = await getDocs(allProjectsQuery);

        // Create a map to store only shared projects
        const sharedProjectsMap = new Map<string, Project>();

        // Add only shared projects (exclude owned projects)
        allProjectsSnapshot.forEach(doc => {
            const data = doc.data() as Omit<Project, 'id'>;

            // Skip projects owned by the user
            if (data.ownerId === userId) {
                return;
            }

            // Check if the project is shared with the current user
            if (data.collaborators && data.collaborators[normalizedEmail]) {
                sharedProjectsMap.set(doc.id, { id: doc.id, ...data } as Project);
            }
        });

        // Sort by update time
        const sharedProjects = Array.from(sharedProjectsMap.values());
        const sortedProjects = sharedProjects.sort((a, b) => b.updatedAt - a.updatedAt);
        return sortedProjects;
    } catch (error) {
        console.error('Error fetching shared projects:', error);
        throw error;
    }
};

export const deleteProject = async (projectId: string): Promise<void> => {
    const projectRef = doc(projectFirestore, 'projects', projectId);
    await deleteDoc(projectRef);
};

export const inviteCollaborator = async (
    projectId: string,
    userId: string,
    userEmail: string,
    userName: string,
    role: 'editor' | 'viewer'
): Promise<void> => {
    const projectRef = doc(projectFirestore, 'projects', projectId);
    const normalizedEmail = userEmail.toLowerCase();

    await updateDoc(projectRef, {
        [`collaborators.${normalizedEmail}`]: {
            role,
            email: normalizedEmail,
            name: userName,
            addedAt: new Date().toISOString()
        }
    });
};
