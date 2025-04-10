import { projectFirestore } from '@/utils/firebaseConfig';
import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { Project } from '@/types/project';

export const createProject = async (project: Omit<Project, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(projectFirestore, 'projects'), project);
    return docRef.id;
};

export const fetchUserProjects = async (userId: string): Promise<Project[]> => {
    try {
        // get user projects (owns)
        const ownerQuery = query(
            collection(projectFirestore, 'projects'),
            where('ownerId', '==', userId)
        );

        // get user projects (invited)
        const collaboratorQuery = query(
            collection(projectFirestore, 'projects'),
            where(`collaborators.${userId}`, '!=', null)
        );

        const [ownerSnapshot, collaboratorSnapshot] = await Promise.all([
            getDocs(ownerQuery),
            getDocs(collaboratorQuery)
        ]);

        // get results and remove duplicates
        const projectsMap = new Map<string, Project>();

        ownerSnapshot.forEach(doc => {
            const data = doc.data() as Omit<Project, 'id'>;
            projectsMap.set(doc.id, { id: doc.id, ...data } as Project);
        });

        collaboratorSnapshot.forEach(doc => {
            if (!projectsMap.has(doc.id)) {
                const data = doc.data() as Omit<Project, 'id'>;
                projectsMap.set(doc.id, { id: doc.id, ...data } as Project);
            }
        });

        // order by update time
        const projects = Array.from(projectsMap.values());
        return projects.sort((a, b) => b.updatedAt - a.updatedAt);
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
    await updateDoc(projectRef, {
        [`collaborators.${userId}`]: {
            role,
            email: userEmail,
            name: userName,
            addedAt: Date.now()
        }
    });
};
