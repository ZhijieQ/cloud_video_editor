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
        const normalizedEmail = userEmail.toLowerCase();
        // 1. get projects owned by the user
        const ownerQuery = query(
            projectsCollection,
            where('ownerId', '==', userId)
        );
        const ownerSnapshot = await getDocs(ownerQuery);
        // 2. get projects shared with the user
        // use in operator to check if the collaborators field contains the user's email
        const allProjectsQuery = query(projectsCollection);
        const allProjectsSnapshot = await getDocs(allProjectsQuery);
        
        // 3. merge results and remove duplicates
        const projectsMap = new Map<string, Project>();

        // add owned projects
        ownerSnapshot.forEach(doc => {
            const data = doc.data() as Omit<Project, 'id'>;
            projectsMap.set(doc.id, { id: doc.id, ...data } as Project);
        });

        // add shared projects
        allProjectsSnapshot.forEach(doc => {
            if (!projectsMap.has(doc.id)) {
                const data = doc.data() as Omit<Project, 'id'>;
                // check if the project is shared with the current user
                if (data.collaborators && data.collaborators[normalizedEmail]) {
                    projectsMap.set(doc.id, { id: doc.id, ...data } as Project);
                }
            }
        });

        // 4. sort by update time
        const projects = Array.from(projectsMap.values());
        const sortedProjects = projects.sort((a, b) => b.updatedAt - a.updatedAt);
        return sortedProjects;
    } catch (error) {
        console.error('Error fetching user projects:', error);
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
