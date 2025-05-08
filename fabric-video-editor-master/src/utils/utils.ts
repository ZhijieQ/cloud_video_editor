import { MenuOption, EditorElement, Animation, TimeFrame, VideoEditorElement, AudioEditorElement, Placement, ImageEditorElement, Effect, TextEditorElement } from '../types';
import { diff, addedDiff, deletedDiff, updatedDiff, detailedDiff } from 'deep-object-diff';
import { getFirestore, collection, getDocs, setDoc, addDoc, deleteDoc, doc, onSnapshot, updateDoc, query, where, DocumentChange, QuerySnapshot } from 'firebase/firestore';

/**
 * Creates a deep copy of an EditorElement while excluding certain fields like `fabricObject` and `imageObject`.
 * @param element The EditorElement to copy.
 * @returns A deep copy of the EditorElement.
 */
function deepCopy(element: EditorElement): EditorElement {
  switch (element.type) {
    case "video":
      return {
        ...element,
        fabricObject: undefined, // Exclude fabricObject
        properties: { 
          ...element.properties, 
          imageObject: undefined // Exclude imageObject
        },
        placement: { ...element.placement },
        timeFrame: { ...element.timeFrame },
      } as VideoEditorElement;
    case "image":
      return {
        ...element,
        fabricObject: undefined, // Exclude fabricObject
        properties: { 
          ...element.properties, 
          imageObject: undefined, // Exclude imageObject
          effect: { ...element.properties.effect }, // Clone the proxy effect
        },
        placement: { ...element.placement },
        timeFrame: { ...element.timeFrame },
      } as ImageEditorElement;
    case "audio":
      return {
        ...element,
        fabricObject: undefined, // Exclude fabricObject
        properties: { ...element.properties },
        placement: { ...element.placement },
        timeFrame: { ...element.timeFrame },
      } as AudioEditorElement;
    case "text":
      return {
        ...element,
        fabricObject: undefined, // Exclude fabricObject
        properties: {
          ...element.properties,
          splittedTexts: element.properties.splittedTexts.map((text) => ({ ...text })),
        },
        placement: { ...element.placement },
        timeFrame: { ...element.timeFrame },
      } as TextEditorElement;
    default:
      throw new Error(`Unsupported EditorElement type: ${(element as EditorElement).type}`);
  }
}

/**
 * Recursively removes all `undefined` fields from an object.
 * @param obj The object to clean.
 * @returns A new object with all `undefined` fields removed.
 */
function removeUndefinedFields(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedFields); // Recursively clean arrays
  } else if (obj && typeof obj === "object") {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = removeUndefinedFields(value); // Recursively clean nested objects
      }
      return acc;
    }, {} as any);
  }
  return obj; // Return primitive values as-is
}

/**
 * Merges a specific field of an EditorElement from two sources (`from` and `to`) into the target element.
 * @param element The target EditorElement.
 * @param from The source EditorElement to merge from.
 * @param to The source EditorElement to merge to.
 * @param fieldName The name of the field to merge.
 * @param diffFrom The differences between the original and `from`.
 * @param diffTo The differences between the original and `to`.
 * @returns True if the merge was successful, false otherwise.
 */
const mergeField = function (
  element: EditorElement,
  from: EditorElement,
  to: EditorElement,
  fieldName: string,
  diffFrom: Record<string, any>,
  diffTo: Record<string, any>
): boolean {
  if (fieldName in diffFrom && fieldName in diffTo) {
    const diffFieldFrom: Record<string, any> = diff((element as any)[fieldName], (from as any)[fieldName]);
    const diffFieldTo: Record<string, any> = diff((element as any)[fieldName], (to as any)[fieldName]);
    const combinedDiff: Record<string, any> = diff(diffFieldFrom, diffFieldTo);
    if (Object.keys(combinedDiff).length === 0) {
      for (const key in diffFieldFrom) {
        if (diffFieldFrom[key] !== undefined) {
          (element as any)[fieldName][key] = diffFieldFrom[key];
        }
      }
      for (const key in diffFieldTo) {
        if (diffFieldTo[key] !== undefined) {
          (element as any)[fieldName][key] = diffFieldTo[key];
        }
      }
    } else {
      return false;
    }
  } else if (fieldName in diffFrom) {
    (element as any)[fieldName] = (from as any)[fieldName];
  } else if (fieldName in diffTo) {
    (element as any)[fieldName] = (to as any)[fieldName];
  }
  return true;
};

/**
 * Merges updates to an EditorElement from two sources (`from` and `to`) into a new element.
 * @param original The original EditorElement.
 * @param from The first updated EditorElement.
 * @param to The second updated EditorElement.
 * @returns The merged EditorElement or null if conflicts exist.
 */
const mergeElementUpdate = function (original: EditorElement, from: EditorElement, to: EditorElement) {
  const diffFrom: Record<string, any> = diff(original, from);
  const diffTo: Record<string, any> = diff(original, to);
  if ('fabricObject' in diffFrom) {
    delete diffFrom.fabricObject;
  }
  if ('fabricObject' in diffTo) {
    delete diffTo.fabricObject;
  }

  const element = removeUndefinedFields(deepCopy(original));
  const normalChanges = ['order', 'placement', 'timeFrame', 'properties'];
  for (const change of normalChanges) {
    if (
      !mergeField(
        element,
        from,
        to,
        change,
        diffFrom,
        diffTo
      )
    ) {
      return null;
    }
  }

  return element;
};

/**
 * Handles the deletion of an EditorElement by adding the `to` element to Firestore.
 * @param original The original EditorElement.
 * @param from The first updated EditorElement.
 * @param to The second updated EditorElement.
 * @param projectId The project ID.
 * @returns The `to` element.
 */
const mergeElementDelete = function (original: EditorElement, from: EditorElement, to: EditorElement, projectId: string | null) {
  addElementToFirestore(to, projectId);
  return to;
};

/**
 * Adds a file URL to Firestore under a specific project and path.
 * @param url The file URL to add.
 * @param projectId The project ID.
 * @param path The Firestore path to add the URL to.
 */
const addFileUrlsToFirestore = async function (url: string, projectId: string, path: string) {
  const db = getFirestore();
  const collec = collection(db, `projects/${projectId}/${path}`);
  
  try {
    const docRef = await addDoc(collec, { url });
    console.log(`URL added successfully with ID: ${docRef.id}`);
  } catch (error) {
    console.error('Error adding URL to Firestore:', error);
  }
};

/**
 * Updates the background field of a project in Firestore.
 * @param background The background value to set.
 * @param projectId The project ID.
 */
const addBackgroundToFirestore = async function (background: string, projectId: string | null) {
  if (!projectId) {
    console.error('Project ID is null. Cannot update background in Firestore.');
    return;
  }

  const db = getFirestore();
  const projectDocRef = doc(db, `projects/${projectId}`);
  try {
    await updateDoc(projectDocRef, { background });
    console.log('Background updated successfully.');
  } catch (error) {
    console.error('Error updating background in Firestore:', error);
  }
};

/**
 * Updates the times field of a project in Firestore.
 * @param times The times value to set.
 * @param projectId The project ID.
 */
const addTimesToFirestore = async function (times: number, projectId: string | null) {
  if (!projectId) {
    console.error('Project ID is null. Cannot update times in Firestore.');
    return;
  }

  const db = getFirestore();
  const projectDocRef = doc(db, `projects/${projectId}`);
  try {
    await updateDoc(projectDocRef, { times });
    console.log('Times updated successfully.');
  } catch (error) {
    console.error('Error updating times in Firestore:', error);
  }
};

/**
 * Adds or updates an EditorElement in Firestore under a specific project.
 * @param editorElement The EditorElement to add or update.
 * @param projectId The project ID.
 */
const addElementToFirestore = async function (editorElement: EditorElement, projectId: string | null) {
  if (!projectId) {
    console.error('Project ID is null. Cannot add element to Firestore.');
    return;
  }

  const db = getFirestore();
  const collec = collection(db, `projects/${projectId}/videoEditor`);
  try {
    if (editorElement.uid == null) {
      const docRef = await addDoc(collec, editorElement);
      editorElement.uid = docRef.id;
    } else {
      const docRef = doc(db, `projects/${projectId}/videoEditor`, editorElement.uid);
      await setDoc(docRef, editorElement);
    }
  } catch (error) {
    console.error('Error adding element to Firestore:', error);
    alert('Error synchronizing data.');
    return;
  }
};

/**
 * Adds or updates an Animation in Firestore under a specific project.
 * @param animation The Animation to add or update.
 * @param projectId The project ID.
 */
const addAnimationToFirestore = async function (animation: Animation, projectId: string | null) {
  if (!projectId) {
    console.error('Project ID is null. Cannot add animation to Firestore.');
    return;
  }

  const db = getFirestore();
  const collec = collection(db, `projects/${projectId}/animations`);
  try {
    if (animation.uid == null) {
      const docRef = await addDoc(collec, animation);
      animation.uid = docRef.id;
    } else {
      const docRef = doc(db, `projects/${projectId}/animations`, animation.uid);
      await setDoc(docRef, animation, { merge: true });
    }
  } catch (error) {
    console.error('Error adding animation to Firestore:', error);
    alert('Error synchronizing animation data.');
    return;
  }
};

/**
 * Uploads an updated EditorElement to Firestore.
 * @param editorElement The EditorElement to upload.
 * @param projectId The project ID.
 */
const uploadElementToFirebase = function (editorElement: EditorElement, projectId: string | null) {
  if (!projectId) {
    console.error('Project ID is null. Cannot upload element to Firebase.');
    return;
  }

  if (editorElement.uid == null) {
    console.log('Element UID is null');
    return;
  }

  try {
    const db = getFirestore();
    const docRef = doc(db, `projects/${projectId}/videoEditor`, editorElement.uid);
    const newEle = removeUndefinedFields(deepCopy(editorElement));
    updateDoc(docRef, newEle)
      .then(() => console.log(`Document with UID ${editorElement.uid} updated successfully`))
      .catch((error) => console.error('Error updating document in Firebase:', error));
  } catch (error) {
    console.error('Error updating document in Firebase:', error);
  }
};

/**
 * Uploads an updated Animation to Firestore.
 * @param animation The Animation to upload.
 * @param projectId The project ID.
 */
const uploadAnimationToFirebase = function (animation: Animation, projectId: string | null) {
  if (!projectId) {
    console.error('Project ID is null. Cannot upload animation to Firebase.');
    alert('Error: Project ID is missing.');
    return;
  }
  if (animation.uid == null) {
    console.log('Element UID is null');
    return;
  }
  try {
    const db = getFirestore();
    const docRef = doc(db, `projects/${projectId}/animations`, animation.uid);
    updateDoc(docRef, animation as any, { merge: true })
      .then(() => console.log(`Document with UID ${animation.uid} updated successfully`))
      .catch((error) => console.error('Error updating document in Firebase:', error));
  } catch (error) {
    console.error('Error updating document in Firebase:', error);
  }
};

export {
  deepCopy,
  removeUndefinedFields,
  mergeElementUpdate,
  mergeElementDelete,
  addElementToFirestore,
  addAnimationToFirestore,
  uploadElementToFirebase,
  uploadAnimationToFirebase,
  addBackgroundToFirestore,
  addTimesToFirestore,
  addFileUrlsToFirestore
};