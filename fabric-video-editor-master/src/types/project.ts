export interface Project {
    id: string;
    name: string;
    description: string;
    ownerId: string;
    ownerName: string;
    createdAt: number;
    updatedAt: number;
    collaborators: {
        [uid: string]: {
            role: 'editor' | 'viewer';
            email: string;
            name: string;
        }
    };
    thumbnailUrl?: string;
}
